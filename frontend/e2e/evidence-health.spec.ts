import { expect, test } from "@playwright/test";

import {
  apiLogin,
  getBenchmarkSummary,
  getQuantumAssets,
  getQuantumSummary,
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";
import type { HealthResponse, ReadinessResponse } from "../src/types/api";

const boundedStatement =
  "RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.";

test.describe("quantum readiness, evaluation, and system health", () => {
  test.beforeEach(async ({ request }) => {
    await prepareShowcaseDataset(request);
  });

  test("quantum readiness reconciles both assets and preserves the fraud boundary", async ({
    page,
  }) => {
    const token = await apiLogin(page.request, "analyst");
    const [summary, assets] = await Promise.all([
      getQuantumSummary(page.request, token),
      getQuantumAssets(page.request, token),
    ]);
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst", "/quantum-readiness");

    await expect(page.locator('[data-metric-label="Tracked assets"] strong')).toHaveText(
      summary.total_assets.toString(),
    );
    await expect(page.locator('[data-metric-label="Linked channels"] strong')).toHaveText(
      summary.linked_transaction_channels.toString(),
    );
    await expect(page.locator('[data-metric-label="PQC ready"] strong')).toHaveText(
      summary.pqc_ready_assets.toString(),
    );
    await expect(page.locator('[data-metric-label="Urgent priority"] strong')).toHaveText(
      summary.readiness_priority_counts.urgent.toString(),
    );
    expect(assets.items).toHaveLength(2);
    for (const asset of assets.items) {
      const row = page.locator(`[data-crypto-asset-id="${asset.crypto_asset_id}"]`);
      await expect(row).toContainText(asset.name);
      await expect(row).toContainText(asset.readiness_priority_score.toString());
      for (const channel of asset.linked_channels) {
        await expect(row).toContainText(channel.display_name);
      }
      for (const reason of asset.migration_priority_reasons) {
        await expect(row).toContainText(reason);
      }
    }
    expect(assets.items.map((asset) => asset.readiness_priority_score).sort()).toEqual([
      22, 88,
    ]);
    await expect(page.getByText(summary.fraud_risk_separation_notice)).toBeVisible();
    const copy = (await page.locator("body").innerText()).toLowerCase();
    for (const prohibited of [
      "active quantum attack detected",
      "quantum attacker identified",
      "quantum-proof bank",
      "guaranteed quantum security",
    ]) {
      expect(copy).not.toContain(prohibited);
    }
    audit.assertClean();
    audit.stop();
  });

  test("benchmark-v1 reports exact API metrics, cohorts, limitations, and bounded claim", async ({
    page,
  }) => {
    const token = await apiLogin(page.request, "analyst");
    const benchmark = await getBenchmarkSummary(page.request, token);
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst", "/evaluation");

    await expect(page.locator("[data-benchmark-version]")).toHaveAttribute(
      "data-benchmark-version",
      benchmark.fixture_version,
    );
    await expect(page.getByText(benchmark.disclaimer)).toBeVisible();
    await expect(
      page.getByText(`${benchmark.total_cases.toString()} deterministic cases`),
    ).toBeVisible();
    for (const point of Object.values(benchmark.operating_points)) {
      const panel = page
        .getByRole("heading", { name: point.label })
        .locator("xpath=ancestor::section[1]");
      await expect(panel).toContainText(`Score ≥ ${point.threshold.toString()}`);
      for (const [comparator, metrics] of Object.entries({
        isolated_cyber_rule_score: point.isolated_cyber_rule_score,
        isolated_transaction_rule_score: point.isolated_transaction_rule_score,
        fused_hybrid_contextual_score: point.fused_hybrid_contextual_score,
      })) {
        const row = panel.locator(`[data-benchmark-comparator="${comparator}"]`);
        await expect(row).toContainText(metrics.true_positives.toString());
        await expect(row).toContainText(metrics.false_positives.toString());
        await expect(row).toContainText(metrics.true_negatives.toString());
        await expect(row).toContainText(metrics.false_negatives.toString());
      }
    }
    expect(Object.keys(benchmark.cohorts)).toHaveLength(6);
    for (const cohort of Object.keys(benchmark.cohorts)) {
      await expect(
        page.getByText(cohort.replaceAll("_", " "), { exact: false }),
      ).toBeVisible();
    }
    for (const limitation of benchmark.limitations) {
      await expect(page.getByText(limitation)).toBeVisible();
    }
    await expect(page.getByText(`“${boundedStatement}”`)).toBeVisible();
    const fused60 =
      benchmark.operating_points.intervention_60?.fused_hybrid_contextual_score;
    expect(fused60).toMatchObject({
      true_positives: 6,
      false_positives: 0,
      true_negatives: 30,
      false_negatives: 12,
    });
    audit.assertClean();
    audit.stop();
  });

  test("administrator health view reconciles liveness, readiness, and source data", async ({
    page,
  }) => {
    const [healthResponse, readyResponse] = await Promise.all([
      page.request.get(`${e2eEnvironment.apiUrl}/health`),
      page.request.get(`${e2eEnvironment.apiUrl}/ready`),
    ]);
    const health = (await healthResponse.json()) as HealthResponse;
    const ready = (await readyResponse.json()) as ReadinessResponse;
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "admin", "/system-health");
    await expect(page.getByText(health.service, { exact: true })).toBeVisible();
    await expect(page.getByText(`Version ${health.version}`)).toBeVisible();
    await expect(
      page.getByText(ready.revision ?? "Not reported", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("RiskWeave interface loaded")).toBeVisible();
    await expect(page.getByText("Last successful complete refresh")).toBeVisible();
    await page.getByRole("button", { name: "Retry all checks" }).click();
    await expect(page.getByText("Responding", { exact: true })).toBeVisible();
    audit.assertClean();
    audit.stop();
  });

  test("analyst system-health access is redirected and admin controls stay absent", async ({
    page,
  }) => {
    await loginThroughUi(page, "analyst");
    await expect(page.getByRole("link", { name: "System Health" })).toHaveCount(0);
    await navigateWithinAuthenticatedApp(page, "/system-health");
    await expect(page).toHaveURL(/\/overview$/);
  });

  test("degraded health state reports unavailable services without fake green status", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Controlled degraded state runs once");
    await loginThroughUi(page, "admin");
    await page.route(`${e2eEnvironment.apiUrl}/health`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"detail":"Unavailable"}',
      }),
    );
    await page.route(`${e2eEnvironment.apiUrl}/ready`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "not_ready",
          service: "RiskWeave API",
          checks: { database: "unreachable", migrations: "unknown" },
          revision: null,
        }),
      }),
    );
    await navigateWithinAuthenticatedApp(page, "/system-health");
    await expect(
      page.getByRole("heading", { name: "Backend is waking or unavailable" }),
    ).toBeVisible();
    await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Unreachable", { exact: true })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  });
});
