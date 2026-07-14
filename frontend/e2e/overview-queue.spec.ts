import { expect, test } from "@playwright/test";

import {
  apiLogin,
  getDashboardSummary,
  getDashboardTrends,
  getIncidents,
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";

test.describe("overview and incident queue", () => {
  test.beforeEach(async ({ request }) => {
    await prepareShowcaseDataset(request);
  });

  test("overview reconciles rendered metrics, trends, and recent links to APIs", async ({
    page,
  }) => {
    const token = await apiLogin(page.request, "analyst");
    const [summary, trends, recent] = await Promise.all([
      getDashboardSummary(page.request, token),
      getDashboardTrends(page.request, token),
      getIncidents(
        page.request,
        token,
        "?page=1&page_size=5&sort_by=fused_score&sort_direction=desc",
      ),
    ]);
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst");

    const criticalHigh =
      summary.incidents_by_severity.critical + summary.incidents_by_severity.high;
    const active = summary.open_incidents + summary.in_review_incidents;
    const expectedMetrics: Record<string, number> = {
      "Visible incidents": summary.visible_incidents,
      "High or critical": criticalHigh,
      "Open or in review": active,
      "Transactions held": summary.transactions_held,
      "Unusual but permitted": summary.legitimate_unusual_activity_permitted,
      "Confirmed fraud": summary.confirmed_fraud_cases,
    };
    for (const [label, value] of Object.entries(expectedMetrics)) {
      await expect(page.locator(`[data-metric-label="${label}"] strong`)).toHaveText(
        value.toString(),
      );
    }

    expect(trends.points).toHaveLength(14);
    await expect(
      page.getByRole("img", { name: /Fourteen-day incident volume/ }),
    ).toHaveAttribute(
      "aria-label",
      new RegExp(trends.points[0]?.incident_volume.toString() ?? ""),
    );
    await expect(
      page.getByRole("img", { name: /Incident severity distribution/ }),
    ).toHaveAttribute(
      "aria-label",
      new RegExp(`Critical ${summary.incidents_by_severity.critical.toString()}`),
    );
    const firstRecent = recent.items[0];
    expect(firstRecent).toBeDefined();
    await expect(
      page.getByRole("link", { name: new RegExp(firstRecent?.incident_reference ?? "") }),
    ).toHaveAttribute("href", `/incidents/${firstRecent?.incident_id ?? ""}`);
    await expect(page.getByText(summary.synthetic_data_notice)).toBeVisible();
    audit.assertClean();
    audit.stop();
  });

  test("overview loading, empty, and recoverable API error states are explicit", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Controlled overview states run once");
    const token = await apiLogin(request, "analyst");
    const [summary, trends] = await Promise.all([
      getDashboardSummary(request, token),
      getDashboardTrends(request, token),
    ]);
    await loginThroughUi(page, "analyst", "/incidents");

    await page.route("**/api/dashboard/summary", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...summary,
          visible_incidents: 0,
          incidents_by_severity: {
            low: 0,
            guarded: 0,
            elevated: 0,
            high: 0,
            critical: 0,
          },
          open_incidents: 0,
          in_review_incidents: 0,
          transactions_held: 0,
          legitimate_unusual_activity_permitted: 0,
          confirmed_fraud_cases: 0,
        }),
      });
    });
    await page.route("**/api/dashboard/trends", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(trends),
      });
    });
    await page.route("**/api/incidents?**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          pagination: { page: 1, page_size: 5, total_items: 0, total_pages: 0 },
        }),
      });
    });
    await navigateWithinAuthenticatedApp(page, "/overview");
    await expect(page.getByRole("status", { name: "Loading content" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No incidents in the current dataset" }),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "wait" });
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.route("**/api/dashboard/summary", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"detail":"Internal server error"}',
      }),
    );
    await loginThroughUi(page, "analyst", "/overview", {
      expectPageHeading: false,
    });
    await expect(page.getByRole("alert")).toContainText(
      "The overview could not reconcile its source-backed aggregates",
    );
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  });

  test("queue pagination, filters, sorting, search, URLs, and stable order use the server", async ({
    page,
  }) => {
    const token = await apiLogin(page.request, "analyst");
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst", "/incidents?page_size=5");

    const firstPage = await getIncidents(
      page.request,
      token,
      "?page=1&page_size=5&sort_by=created_at&sort_direction=desc",
    );
    const renderedFirstPage = await page
      .locator("tbody tr[data-incident-id]")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-incident-id")));
    expect(renderedFirstPage).toEqual(firstPage.items.map((item) => item.incident_id));
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 4")).toBeVisible();

    await page.locator("#severity-filter").selectOption("critical");
    await expect(page).toHaveURL(/severity=critical/);
    const criticalRows = page.locator("tbody tr[data-incident-id]");
    await expect(
      criticalRows.first().locator('[data-risk-severity="critical"]'),
    ).toBeVisible();

    await page.locator("#status-filter").selectOption("open");
    await expect(page).toHaveURL(/status=open/);
    await page.locator("#scenario-filter").selectOption("account_takeover");
    await expect(page).toHaveURL(/scenario=account_takeover/);
    await expect(page.locator("tbody tr[data-incident-id]")).toHaveCount(1);

    const accountTakeover = await getIncidents(
      page.request,
      token,
      "?page=1&page_size=20&scenario=account_takeover",
    );
    const incidentId = accountTakeover.items[0]?.incident_id;
    const reference = accountTakeover.items[0]?.incident_reference;
    expect(incidentId).toBeDefined();
    expect(reference).toBeDefined();
    await page.locator("#scenario-filter").selectOption("");
    await page.locator("#severity-filter").selectOption("");
    await page.locator("#status-filter").selectOption("");
    await page.getByLabel("Search UUID or customer name").fill(incidentId ?? "");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(incidentId ?? "")}`),
    );
    await expect(page.getByText(reference ?? "", { exact: true })).toBeVisible();

    await page.locator("#incident-sort").selectOption("fused_score:desc");
    await expect(page).toHaveURL(/sort_by=fused_score/);
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page).toHaveURL(/\/incidents$/);
    audit.assertClean();
    audit.stop();
  });

  test("keyboard row navigation preserves queue filters on return", async ({ page }) => {
    await loginThroughUi(page, "analyst", "/incidents?severity=critical&page_size=5");
    const row = page.locator("tbody tr[data-incident-id]").first();
    await row.focus();
    await expect(row).toBeFocused();
    await row.press("Enter");
    await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]+\?return=/);
    await page.getByRole("link", { name: "Back to incident queue" }).click();
    await expect(page).toHaveURL(/severity=critical/);
    await expect(page).toHaveURL(/page_size=5/);
  });

  test("date filters, empty results, reset, and recoverable API failure render correctly", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Controlled empty and failure states run once");
    await loginThroughUi(page, "analyst", "/incidents");
    await page.getByLabel("From", { exact: true }).fill("2026-07-14");
    await page.getByLabel("To", { exact: true }).fill("2026-07-14");
    await expect(page).toHaveURL(/date_from=2026-07-14/);
    await expect(page).toHaveURL(/date_to=2026-07-14/);

    await page.getByLabel("Search UUID or customer name").fill("no-such-case");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(
      page.getByRole("heading", { name: "No incidents match these filters" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(
      page.getByRole("heading", { name: "Prioritized investigation queue" }),
    ).toBeVisible();

    await page.route("**/api/incidents**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"detail":"Internal server error"}',
      }),
    );
    await page.getByLabel("Search UUID or customer name").fill("force-api-failure");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "The incident queue could not be loaded",
    );
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
