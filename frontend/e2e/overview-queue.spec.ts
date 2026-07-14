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
import { formatMoney } from "../src/lib/format";

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
    const primaryMetrics: Record<string, number> = {
      "High or critical": criticalHigh,
      "Open or in review": active,
      "Transactions held": summary.transactions_held,
    };
    for (const [label, value] of Object.entries(primaryMetrics)) {
      await expect(page.locator(`[data-metric-label="${label}"] strong`)).toHaveText(
        value.toString(),
      );
    }
    const supportingMetrics: Record<string, number> = {
      "Visible incidents": summary.visible_incidents,
      "Unusual but permitted": summary.legitimate_unusual_activity_permitted,
      "Confirmed fraud": summary.confirmed_fraud_cases,
    };
    for (const [label, value] of Object.entries(supportingMetrics)) {
      const item = page.locator(".operational-ledger > div").filter({ hasText: label });
      await expect(item.locator("strong")).toHaveText(value.toString());
    }

    expect(trends.points).toHaveLength(14);
    const incidentVolumeChart = page.getByRole("img", {
      name: "Incident volume by UTC day",
    });
    await expect(incidentVolumeChart).toBeVisible();
    await expect(incidentVolumeChart.locator(".sr-only")).toContainText(
      `: ${trends.points[0]?.incident_volume.toString() ?? ""}`,
    );
    await expect(
      page.getByRole("img", { name: /Incident severity distribution/ }),
    ).toHaveAttribute(
      "aria-label",
      new RegExp(`Critical ${summary.incidents_by_severity.critical.toString()}`),
    );
    const transactionTotals = trends.points.reduce(
      (total, point) => ({
        permitted: total.permitted + point.transaction_actions.permitted,
        held: total.held + point.transaction_actions.held,
        released: total.released + point.transaction_actions.released,
        declined: total.declined + point.transaction_actions.declined,
        pending: total.pending + point.transaction_actions.pending,
        cancelled: total.cancelled + point.transaction_actions.cancelled,
      }),
      { permitted: 0, held: 0, released: 0, declined: 0, pending: 0, cancelled: 0 },
    );
    const totalTransactionActions = Object.values(transactionTotals).reduce(
      (sum, value) => sum + value,
      0,
    );
    const transactionActionChart = page.getByRole("img", {
      name: /Transaction action distribution/,
    });
    await expect(transactionActionChart).toHaveAttribute(
      "aria-label",
      new RegExp(`Cancelled ${transactionTotals.cancelled.toString()}\\.`),
    );
    for (const category of [
      "Allowed",
      "Held",
      "Released",
      "Declined",
      "Pending",
      "Cancelled",
    ]) {
      await expect(
        transactionActionChart.getByText(category, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByText(
        `${totalTransactionActions.toString()} transaction outcomes are represented across the evaluation window.`,
      ),
    ).toBeVisible();
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
    const firstPageRows = page.locator("tbody tr[data-incident-id]");
    await expect(firstPageRows).toHaveCount(firstPage.items.length);
    const renderedFirstPage = await firstPageRows.evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-incident-id")),
    );
    expect(renderedFirstPage).toEqual(firstPage.items.map((item) => item.incident_id));
    const authoritativeFirst = firstPage.items[0];
    expect(authoritativeFirst).toBeDefined();
    const firstRow = page.locator(
      `tbody tr[data-incident-id="${authoritativeFirst?.incident_id ?? ""}"]`,
    );
    await expect(firstRow).toContainText(
      formatMoney(
        authoritativeFirst?.amount_minor ?? 0,
        authoritativeFirst?.currency ?? "INR",
      ),
    );
    await expect(firstRow.locator(".risk-composition-cell")).toHaveAttribute(
      "aria-label",
      `Cyber ${authoritativeFirst?.cyber_score.toString() ?? ""}, transaction ${authoritativeFirst?.transaction_score.toString() ?? ""}, correlation bonus ${authoritativeFirst?.correlation_bonus.toString() ?? ""}, fused ${authoritativeFirst?.fused_score.toString() ?? ""}`,
    );
    await expect(
      firstRow.locator(`[data-status="${authoritativeFirst?.transaction_status ?? ""}"]`),
    ).toBeVisible();
    for (const heading of ["Amount", "Risk composition", "Transaction state"]) {
      await expect(page.getByRole("columnheader", { name: heading })).toBeVisible();
    }
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
    await page.locator("#transaction-status-filter").selectOption("held");
    await expect(page).toHaveURL(/transaction_status=held/);
    const heldFromApi = await getIncidents(
      page.request,
      token,
      "?page=1&page_size=5&sort_by=created_at&sort_direction=desc&severity=critical&status=open&transaction_status=held",
    );
    expect(heldFromApi.items.length).toBeGreaterThan(0);
    const heldRows = page.locator("tbody tr[data-incident-id]");
    await expect(heldRows).toHaveCount(heldFromApi.items.length);
    const heldCount = await heldRows.count();
    expect(
      await heldRows.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-incident-id")),
      ),
    ).toEqual(heldFromApi.items.map((item) => item.incident_id));
    for (let index = 0; index < heldCount; index += 1) {
      await expect(heldRows.nth(index).locator('[data-status="held"]')).toBeVisible();
    }
    await page.getByText("Advanced filters", { exact: true }).click();
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
    await page.locator("#transaction-status-filter").selectOption("");
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
    await page.getByText("Advanced filters", { exact: true }).click();
    await page.locator("#date-from-filter").fill("2026-07-14");
    await page.locator("#date-to-filter").fill("2026-07-14");
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
