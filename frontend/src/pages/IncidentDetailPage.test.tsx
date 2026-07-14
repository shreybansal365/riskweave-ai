import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../app/AuthProvider";
import { createQueryClient } from "../app/query-client";
import { ToastProvider } from "../components/ToastProvider";
import { analystUser, incidentDetail, installApiMock } from "../test/fixtures";
import { IncidentDetailPage } from "./IncidentDetailPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderInvestigation() {
  const router = createMemoryRouter(
    [
      {
        path: "/incidents/:incidentId",
        element: <IncidentDetailPage />,
      },
      {
        path: "/incidents",
        element: <h1>Incident queue destination</h1>,
      },
    ],
    { initialEntries: [`/incidents/${incidentDetail.incident_id}`] },
  );
  const queryClient = createQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        initialSession={{
          token: "test-token",
          user: analystUser,
          expiresAt: Date.now() + 900_000,
        }}
      >
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...view, router };
}

describe("IncidentDetailPage analyst-note protection", () => {
  it("preserves a note across unrelated mutations and confirms route departure", async () => {
    installApiMock();
    const { router } = renderInvestigation();
    const user = userEvent.setup();
    const note = await screen.findByLabelText("Case note");
    await user.type(note, "Review the matched session before disposition.");

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Mark in review" }));
    const workflowFeedback = await waitFor(() => {
      const element = document.querySelector<HTMLElement>("[data-workflow-feedback]");
      if (element === null) throw new Error("Workflow feedback was not rendered");
      return element;
    });
    expect(workflowFeedback).toHaveTextContent("Case updated");
    await waitFor(() => {
      expect(workflowFeedback).toHaveFocus();
    });
    expect(note).toHaveValue("Review the matched session before disposition.");

    await user.click(screen.getByRole("link", { name: "← Back to incident queue" }));
    expect(
      screen.getByRole("alertdialog", { name: "Discard unsaved analyst note?" }),
    ).toBeVisible();
    expect(router.state.location.pathname).toContain("/incidents/");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(note).toHaveValue("Review the matched session before disposition.");

    await user.click(screen.getByRole("link", { name: "← Back to incident queue" }));
    await user.click(screen.getByRole("button", { name: "Discard note and leave" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/incidents");
    });
    expect(
      screen.getByRole("heading", { name: "Incident queue destination" }),
    ).toBeVisible();
  });
});
