import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { createQueryClient } from "./app/query-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderApp() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RiskWeave foundation shell", () => {
  it("shows real API and database connectivity", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.endsWith("/health")) {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            service: "RiskWeave API",
            version: "0.1.0",
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          status: "ready",
          service: "RiskWeave API",
          checks: { database: "reachable", migrations: "current" },
          revision: "0001_foundation",
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp();

    expect(
      screen.getByRole("heading", { name: "Services, visibly connected." }),
    ).toBeVisible();
    expect(await screen.findByText("RiskWeave API v0.1.0 is responding.")).toBeVisible();
    expect(screen.getByText("PostgreSQL reachable; migrations current.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders a truthful degraded state from a 503 readiness response", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const url = requestUrl(input);
      if (url.endsWith("/health")) {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            service: "RiskWeave API",
            version: "0.1.0",
          }),
        );
      }
      return Promise.resolve(
        jsonResponse(
          {
            status: "not_ready",
            service: "RiskWeave API",
            checks: { database: "unavailable", migrations: "unknown" },
            revision: null,
          },
          503,
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp();

    expect(await screen.findByText("Needs attention")).toBeVisible();
    expect(screen.getByText("PostgreSQL unavailable; migrations unknown.")).toBeVisible();
  });

  const liveServiceTest =
    import.meta.env.VITE_RUN_LIVE_SERVICE_TESTS === "1" ? it : it.skip;

  liveServiceTest("renders status from the running backend and PostgreSQL", async () => {
    renderApp();

    expect(await screen.findByText("RiskWeave API v0.1.0 is responding.")).toBeVisible();
    expect(
      await screen.findByText("PostgreSQL reachable; migrations current."),
    ).toBeVisible();
  });
});
