import { expect, test } from "@playwright/test";

import {
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";

test("principal production routes remain responsive without repeated API churn", async ({
  page,
  request,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Practical route timing is recorded once");
  const showcase = await prepareShowcaseDataset(request);
  const audit = beginBrowserAudit(page);
  const apiOrigin = new URL(e2eEnvironment.apiUrl).origin;
  const requestCounts = new Map<string, number>();
  page.on("request", (outgoing) => {
    if (!outgoing.url().startsWith(apiOrigin)) return;
    const path = new URL(outgoing.url()).pathname;
    requestCounts.set(path, (requestCounts.get(path) ?? 0) + 1);
  });

  await loginThroughUi(page, "admin");
  const routeTimings: Record<string, number> = {};
  for (const route of [
    "/overview",
    "/incidents",
    `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
    "/simulator",
    "/quantum-readiness",
    "/system-health",
    "/evaluation",
  ]) {
    const started = performance.now();
    await navigateWithinAuthenticatedApp(page, route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    routeTimings[route] = Math.round(performance.now() - started);
    expect(routeTimings[route]).toBeLessThan(10_000);
  }

  expect(requestCounts.get("/api/dashboard/summary") ?? 0).toBeLessThanOrEqual(2);
  expect(requestCounts.get("/api/dashboard/trends") ?? 0).toBeLessThanOrEqual(1);
  await testInfo.attach("practical-route-timings.json", {
    body: JSON.stringify(
      { routeTimings, requestCounts: Object.fromEntries(requestCounts) },
      null,
      2,
    ),
    contentType: "application/json",
  });
  audit.assertClean();
  audit.stop();
});
