import { expect, test } from "@playwright/test";

import {
  apiLogin,
  loginThroughUi,
  prepareShowcaseDataset,
  resetDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";
import type { ScenarioExecution, ScenarioKey, ScenarioReset } from "../src/types/api";

const expected = {
  normal_activity: {
    cyber: 10,
    transaction: 10,
    bonus: 0,
    fused: 9,
    severity: "Low",
    status: "Permitted",
    action: "Allow",
  },
  legitimate_new_device: {
    cyber: 40,
    transaction: 10,
    bonus: 0,
    fused: 23,
    severity: "Guarded",
    status: "Permitted",
    action: "Allow And Monitor",
  },
  account_takeover: {
    cyber: 78,
    transaction: 79,
    bonus: 18,
    fused: 89,
    severity: "Critical",
    status: "Held",
    action: "Hold And Open Critical Incident",
  },
} as const;

test.describe("deterministic scenario simulator", () => {
  test.beforeEach(async ({ request }) => {
    await resetDataset(request);
  });

  test.afterEach(async ({ request }) => {
    await prepareShowcaseDataset(request);
  });

  test("administrator runs all locked scenarios through the UI with exact values", async ({
    page,
  }) => {
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "admin", "/simulator");

    for (const key of Object.keys(expected) as ScenarioKey[]) {
      const values = expected[key];
      const card = page.locator(`[data-scenario-key="${key}"]`);
      await expect(card.locator('[data-score-label="Cyber"] strong')).toHaveText(
        values.cyber.toString(),
      );
      await expect(card.locator('[data-score-label="Transaction"] strong')).toHaveText(
        values.transaction.toString(),
      );
      await expect(card.locator('[data-score-label="Eligible bonus"] strong')).toHaveText(
        values.bonus.toString(),
      );
      await expect(
        card.locator('[data-score-label="Authoritative fused decision"] strong'),
      ).toHaveText(values.fused.toString());
      await expect(card.getByText(values.severity, { exact: true })).toBeVisible();
      await expect(card.getByText(values.status, { exact: true })).toBeVisible();
      await expect(card.getByText(values.action, { exact: true })).toBeVisible();

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/scenarios/${key}/run`) &&
          response.request().method() === "POST",
      );
      await card.getByRole("button", { name: "Run scenario" }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const result = (await response.json()) as ScenarioExecution;
      expect(result.fused_score).toBe(values.fused);
      await expect(
        card.getByRole("link", { name: "Open investigation" }),
      ).toHaveAttribute("href", `/incidents/${result.incident_id}`);
      await expect(card.getByText("New deterministic incident persisted")).toBeVisible();
    }
    audit.assertClean();
    audit.stop();
  });

  test("replay is idempotent and returns the same linked incident", async ({ page }) => {
    await loginThroughUi(page, "admin", "/simulator");
    const card = page.locator('[data-scenario-key="account_takeover"]');
    const firstResponse = page.waitForResponse("**/api/scenarios/account_takeover/run");
    await card.getByRole("button", { name: "Run scenario" }).click();
    const first = (await (await firstResponse).json()) as ScenarioExecution;
    await expect(card.getByRole("button", { name: "Replay idempotently" })).toBeVisible();

    const replayResponse = page.waitForResponse("**/api/scenarios/account_takeover/run");
    await card.getByRole("button", { name: "Replay idempotently" }).click();
    const replay = (await (await replayResponse).json()) as ScenarioExecution;
    expect(replay.idempotent).toBe(true);
    expect(replay.incident_id).toBe(first.incident_id);
    await expect(card.getByText("Existing deterministic result reused")).toBeVisible();
    await expect(card.getByRole("link", { name: "Open investigation" })).toHaveAttribute(
      "href",
      `/incidents/${first.incident_id}`,
    );
  });

  test("confirmed atomic reset restores the exact deterministic baseline fingerprint", async ({
    page,
    request,
  }) => {
    const baseline = await resetDataset(request);
    await loginThroughUi(page, "admin", "/simulator");
    await page
      .locator('[data-scenario-key="normal_activity"]')
      .getByRole("button", { name: "Run scenario" })
      .click();

    const trigger = page.getByRole("button", { name: "Restore exact baseline" });
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole("alertdialog", {
      name: "Restore the exact baseline dataset?",
    });
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    const resetResponse = page.waitForResponse("**/api/scenarios/reset");
    await dialog.getByRole("button", { name: "Restore baseline" }).click();
    const reset = (await (await resetResponse).json()) as ScenarioReset;
    expect(reset.exact_baseline_restored).toBe(true);
    expect(reset.fingerprint).toBe(baseline.fingerprint);
    expect(reset.counts.incidents).toBe(15);
    await expect(page.getByText("Exact baseline restored")).toBeVisible();
    await expect(
      page.locator('[data-scenario-key="normal_activity"]').getByText("Not Run"),
    ).toBeVisible();
  });

  test("analysts can inspect expected outcomes but cannot run or reset", async ({
    page,
  }) => {
    const analystToken = await apiLogin(page.request, "analyst");
    await loginThroughUi(page, "analyst", "/simulator");
    await expect(page.getByText("Read-only analyst view.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Run scenario/ })).toHaveCount(3);
    for (const button of await page.getByRole("button", { name: /Run scenario/ }).all()) {
      await expect(button).toBeDisabled();
    }
    await expect(
      page.getByRole("button", { name: "Restore exact baseline" }),
    ).toHaveCount(0);
    const forbidden = await page.request.post(
      `${e2eEnvironment.apiUrl}/api/scenarios/account_takeover/run`,
      { headers: { Authorization: `Bearer ${analystToken}` } },
    );
    expect(forbidden.status()).toBe(403);
  });

  test("scenario failure state is explicit and recoverable", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Controlled failure state runs once");
    await loginThroughUi(page, "admin", "/simulator");
    await page.route("**/api/scenarios/account_takeover/run", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Synthetic controlled failure" }),
      }),
    );
    await page
      .locator('[data-scenario-key="account_takeover"]')
      .getByRole("button", { name: "Run scenario" })
      .click();
    await expect(page.getByText("Scenario did not complete")).toBeVisible();
    await expect(page.getByText("Synthetic controlled failure")).toBeVisible();
  });
});
