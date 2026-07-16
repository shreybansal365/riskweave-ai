import { QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { AuthProvider } from "./app/AuthProvider";
import type { AuthSession } from "./app/auth-context";
import { createQueryClient } from "./app/query-client";
import { ToastProvider } from "./components/ToastProvider";
import { adminUser, analystUser, incidentDetail, installApiMock } from "./test/fixtures";

function session(
  role: "analyst" | "admin" = "analyst",
  expiresAt = Date.now() + 900_000,
): AuthSession {
  return {
    token: "test-token",
    user: role === "admin" ? adminUser : analystUser,
    expiresAt,
  };
}

function renderApp(path: string, initialSession: AuthSession | null = null) {
  window.history.replaceState({}, "", path);
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialSession={initialSession}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined)
    throw new Error(`Missing test value: ${label}`);
  return value;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RiskWeave authenticated product", () => {
  it("protects routes and handles invalid credentials without storing a token", async () => {
    installApiMock({ loginFails: true });
    renderApp("/overview");
    expect(
      await screen.findByRole("heading", { name: "Sign in to the workspace" }),
    ).toBeVisible();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email address"), "analyst@riskweave.demo");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "email or password is incorrect",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(localStorage).toHaveLength(0);
  });

  it("explains authentication rate limiting and backend unavailability safely", async () => {
    installApiMock({ loginStatus: 429 });
    const rateLimited = renderApp("/login");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email address"), "analyst@riskweave.demo");
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Try again in 30 seconds.",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("");
    rateLimited.unmount();

    installApiMock({ loginNetworkFailure: true });
    renderApp("/login");
    await user.type(screen.getByLabelText("Email address"), "analyst@riskweave.demo");
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The authentication service is unavailable.",
    );
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("logs in through login and me, supports keyboard entry, and exposes role-aware navigation", async () => {
    const fetchMock = installApiMock({ role: "analyst" });
    renderApp("/login");
    const user = userEvent.setup();
    expect(
      await screen.findByRole("heading", {
        name: "One incident. Every relevant signal.",
      }),
    ).toHaveFocus();
    expect(screen.getByRole("link", { name: "RiskWeave AI overview" })).toBeVisible();
    expect(
      screen.queryByText("Cyber intelligence. Financial confidence."),
    ).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByLabelText("Email address")).toHaveFocus();
    await user.type(screen.getByLabelText("Email address"), "analyst@riskweave.demo");
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(
      await screen.findByRole(
        "heading",
        { name: "Operational overview" },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "RiskWeave AI overview" })).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("link", { name: /System Health/i }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) => requestUrl(input).includes("/api/auth/me")),
    ).toBe(true);
    expect(localStorage).toHaveLength(0);
  });

  it("restores an authenticated deep link including its query filters", async () => {
    installApiMock({ role: "analyst" });
    renderApp("/incidents?severity=critical");
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Email address"),
      "analyst@riskweave.demo",
    );
    await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "Continue securely" }));
    expect(await screen.findByRole("heading", { name: "Incident queue" })).toBeVisible();
    expect(screen.getByLabelText("Severity")).toHaveValue("critical");
    expect(window.location.search).toBe("?severity=critical");
  });

  it("renders every overview value from API-backed fixtures", async () => {
    installApiMock();
    renderApp("/overview", session());
    expect(
      await screen.findByRole("heading", { name: "Operational overview" }),
    ).toBeVisible();
    expect(screen.getByText("18")).toBeVisible();
    expect(screen.getByText("15 in chart window")).toBeVisible();
    expect(screen.getByText("14-day chart window: 15 incidents")).toBeVisible();
    expect(
      screen.getByText(
        /15 baseline incidents are represented by the exact returned daily series/,
      ),
    ).toBeVisible();
    expect(screen.getAllByText("Fixture available")).toHaveLength(2);
    expect(screen.getByText("Transactions held")).toBeVisible();
    expect(screen.getByText("Unusual but permitted")).toBeVisible();
    expect(await screen.findByText(incidentDetail.incident_reference)).toBeVisible();
  });

  it("renders a loading state and a bounded overview API failure", async () => {
    installApiMock({ dashboardFails: true });
    renderApp("/overview", session());
    expect(screen.getByRole("status", { name: "Loading content" })).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The overview could not reconcile its source-backed aggregates.",
    );
  });

  it("renders an explicit overview empty state from valid API-owned zero counts", async () => {
    installApiMock({ dashboardEmpty: true, incidentsEmpty: true });
    renderApp("/overview", session());
    expect(
      await screen.findByRole("heading", {
        name: "No incidents in the current dataset",
      }),
    ).toBeVisible();
  });

  it("clears the in-memory session on logout", async () => {
    installApiMock();
    renderApp("/overview", session());
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Operational overview" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in to the workspace" }),
    ).toBeVisible();
    expect(localStorage).toHaveLength(0);
  });

  it("sends incident filters to the server, preserves them in the URL, and opens a direct investigation", async () => {
    const fetchMock = installApiMock();
    renderApp("/incidents?severity=critical&status=open", session());
    expect(await screen.findByRole("heading", { name: "Incident queue" })).toBeVisible();
    expect(screen.getByLabelText("Severity")).toHaveValue("critical");
    expect(screen.getByLabelText("Status")).toHaveValue("open");
    const incidentRequest = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes("/api/incidents?"),
    );
    expect(requestUrl(requireValue(incidentRequest, "incident request")[0])).toContain(
      "severity=critical",
    );
    const user = userEvent.setup();
    const incidentLabel = await screen.findByText(incidentDetail.incident_reference);
    const row = requireValue(incidentLabel.closest("tr"), "incident table row");
    await user.click(row);
    expect(
      await screen.findByRole("heading", { name: incidentDetail.incident_reference }),
    ).toBeVisible();
    expect(window.location.search).toContain("return=");
  });

  it("requests subsequent incident pages from the server", async () => {
    const fetchMock = installApiMock({ incidentPages: 2 });
    renderApp("/incidents", session());
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Incident queue" });
    await user.click(await screen.findByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(window.location.search).toContain("page=2");
    });
    expect(
      fetchMock.mock.calls.some(([input]) => requestUrl(input).includes("page=2")),
    ).toBe(true);
  });

  it("renders the incident empty state and supports keyboard row activation", async () => {
    const empty = installApiMock({ incidentsEmpty: true });
    const emptyView = renderApp("/incidents", session());
    expect(
      await screen.findByRole("heading", { name: "No incidents match these filters" }),
    ).toBeVisible();
    expect(empty).toHaveBeenCalled();
    emptyView.unmount();

    installApiMock();
    renderApp("/incidents", session());
    const user = userEvent.setup();
    const row = await screen.findByRole("row", {
      name: `Open ${incidentDetail.incident_reference}`,
    });
    row.focus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("heading", { name: incidentDetail.incident_reference }),
    ).toBeVisible();
  });

  it("keeps investigation scores authoritative and renders grounded chronology and contributions", async () => {
    installApiMock();
    renderApp(`/incidents/${incidentDetail.incident_id}`, session());
    expect(
      await screen.findByRole("heading", { name: incidentDetail.incident_reference }),
    ).toBeVisible();
    expect(screen.getAllByText("88.65", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed MFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("New beneficiary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed MFA and high amount").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Chronological evidence" })).toBeVisible();
    expect(
      screen.getByText("Quantum readiness is separate from fraud-risk scoring."),
    ).toBeVisible();
  });

  it("handles a stale analyst transition as a visible conflict", async () => {
    installApiMock({ actionConflict: true });
    renderApp(`/incidents/${incidentDetail.incident_id}`, session());
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mark in review" }));
    expect(
      (
        await screen.findAllByText(
          "Case changed before this action",
          {},
          { timeout: 5000 },
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it("completes a valid analyst transition and reports an idempotent replay", async () => {
    const fetchMock = installApiMock({ actionIdempotent: true });
    renderApp(`/incidents/${incidentDetail.incident_id}`, session());
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mark in review" }));
    await waitFor(() => {
      expect(screen.getAllByText("Action already recorded").length).toBeGreaterThan(0);
    });
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          requestUrl(input).endsWith(`/api/incidents/${incidentDetail.incident_id}`) &&
          init?.method === "PATCH",
      ),
    ).toBe(true);
  });

  it("renders a bounded incident-not-found state", async () => {
    installApiMock({ incidentNotFound: true });
    renderApp(`/incidents/${incidentDetail.incident_id}`, session());
    expect(
      await screen.findByRole("heading", { name: "Incident not found" }),
    ).toBeVisible();
  });

  it("keeps analysts read-only in the simulator and shows Scenario B as guarded, monitored, and permitted", async () => {
    installApiMock();
    renderApp("/simulator", session("analyst"));
    expect(await screen.findByText("Read-only analyst view.")).toBeVisible();
    const card = screen
      .getByRole("heading", { name: "Legitimate new device" })
      .closest("article");
    expect(card).not.toBeNull();
    const scenarioCard = requireValue(card, "legitimate scenario card");
    expect(within(scenarioCard).getByText("23")).toBeVisible();
    expect(within(scenarioCard).getByText("Guarded")).toBeVisible();
    expect(within(scenarioCard).getByText("Allow And Monitor")).toBeVisible();
    expect(within(scenarioCard).getByText("Permitted")).toBeVisible();
    expect(
      within(scenarioCard).getByRole("button", { name: "Run scenario" }),
    ).toBeDisabled();
  });

  it("lets an administrator execute a deterministic scenario and link to the resulting incident", async () => {
    installApiMock({ role: "admin" });
    renderApp("/simulator", session("admin"));
    const user = userEvent.setup();
    const cards = await screen.findAllByRole("button", { name: "Run scenario" });
    await user.click(requireValue(cards.at(1), "second scenario button"));
    expect(await screen.findByText("New deterministic incident persisted")).toBeVisible();
    expect(
      screen
        .getAllByRole("link", { name: "Open investigation →" })
        .some(
          (link) =>
            link.getAttribute("href") === `/incidents/${incidentDetail.incident_id}`,
        ),
    ).toBe(true);
  });

  it("reports an idempotent scenario replay and confirms an exact reset", async () => {
    const fetchMock = installApiMock({ role: "admin", scenarioReplay: true });
    renderApp("/simulator", session("admin"));
    const user = userEvent.setup();
    const cards = await screen.findAllByRole("button", { name: "Run scenario" });
    await user.click(requireValue(cards.at(1), "second scenario button"));
    expect(await screen.findByText("Scenario replayed idempotently")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Restore exact baseline" }));
    await user.click(screen.getByRole("button", { name: "Restore baseline" }));
    expect(await screen.findByText("Exact baseline restored")).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        requestUrl(input).endsWith("/api/scenarios/reset"),
      ),
    ).toBe(true);
  });

  it("traps keyboard focus inside confirmations and restores the invoking control", async () => {
    installApiMock({ role: "admin" });
    renderApp("/simulator", session("admin"));
    const user = userEvent.setup();
    const resetButton = await screen.findByRole("button", {
      name: "Restore exact baseline",
    });
    await user.click(resetButton);
    const dialog = screen.getByRole("alertdialog", {
      name: "Restore the exact baseline dataset?",
    });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", { name: "Restore baseline" });
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(resetButton).toHaveFocus();
  });

  it("uses qualified quantum-readiness language and keeps prohibited claims absent", async () => {
    installApiMock();
    renderApp("/quantum-readiness", session());
    expect(
      await screen.findByRole("heading", { name: "Quantum readiness" }),
    ).toBeVisible();
    expect(
      screen.getAllByText(/separate from fraud-risk scoring/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Harvest-now-decrypt-later exposure/i)).toBeVisible();
    expect(screen.queryByText(/quantum attacker identified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quantum-proof bank/i)).not.toBeInTheDocument();
  });

  it("presents all benchmark operating points and the exact bounded conclusion", async () => {
    installApiMock();
    renderApp("/evaluation", session());
    expect(await screen.findByRole("heading", { name: "Evaluation" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "40+ escalation or step-up threshold" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "60+ operational hold/intervention threshold",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "80+ critical-only threshold" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Broader false-positive reduction has not yet been established by benchmark-v1/,
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText(/underperforms isolated methods at 60\+/i).length,
    ).toBeGreaterThan(0);
  });

  it("exposes system health only to an administrator and reports real readiness", async () => {
    installApiMock({ role: "admin" });
    renderApp("/system-health", session("admin"));
    expect(await screen.findByRole("heading", { name: "System health" })).toBeVisible();
    expect(screen.getByText("0003_intelligence_support")).toBeVisible();
    expect(screen.getByText("RiskWeave interface loaded")).toBeVisible();
  });

  it("has no serious or critical accessibility violations on the login surface", async () => {
    installApiMock();
    const view = renderApp("/login");
    await screen.findByRole("heading", { name: "Sign in to the workspace" });
    const result = await axe.run(view.container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });

  it("has no serious or critical accessibility violations in the investigation workspace", async () => {
    installApiMock();
    const view = renderApp(`/incidents/${incidentDetail.incident_id}`, session());
    await screen.findByRole("heading", { name: incidentDetail.incident_reference });
    const result = await axe.run(view.container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });

  it("clears an expired in-memory session and returns to login", async () => {
    vi.useFakeTimers();
    installApiMock();
    renderApp("/overview", session("analyst", Date.now() + 50));
    await vi.advanceTimersByTimeAsync(100);
    vi.useRealTimers();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Sign in to the workspace" }),
      ).toBeVisible();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/session expired/i);
    expect(window.location.pathname).toBe("/login");
  });

  it("announces route changes through the document title and heading focus", async () => {
    installApiMock();
    renderApp("/overview", session());
    const heading = await screen.findByRole("heading", { name: "Operational overview" });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(heading).toHaveAttribute("data-route-focus-target", "true");
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.title).toBe("Operational overview · RiskWeave AI");
  });
});
