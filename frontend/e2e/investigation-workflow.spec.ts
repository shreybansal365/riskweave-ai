import { expect, test, type Page } from "@playwright/test";

import {
  apiLogin,
  getIncident,
  loginThroughUi,
  prepareShowcaseDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";

function score(page: Page, label: string) {
  return page.locator(`[data-score-label="${label}"] strong`);
}

test.describe("investigation workspace and analyst workflows", () => {
  test("account-takeover investigation renders every authoritative decision input", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.account_takeover.incident_id;
    const token = await apiLogin(request, "analyst");
    const detail = await getIncident(request, token, incidentId);
    const audit = beginBrowserAudit(page);

    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);
    await expect(
      page.locator(`.case-header[data-incident-id="${incidentId}"]`),
    ).toBeVisible();
    await expect(score(page, "Cyber stream")).toHaveText("78");
    await expect(score(page, "Transaction stream")).toHaveText("79");
    await expect(score(page, "Interaction bonus")).toHaveText("18");
    await expect(score(page, "Fused decision")).toHaveText("89");
    await expect(page.locator('[data-score-label="Fused decision"] small')).toContainText(
      "Raw 88.65",
    );
    await expect(
      page.locator('.case-header [data-risk-severity="critical"]'),
    ).toBeVisible();
    await expect(page.locator('.case-decision [data-status="held"]')).toBeVisible();
    await expect(
      page.getByText("Hold And Open Critical Incident", { exact: true }),
    ).toBeVisible();

    for (const contribution of [
      ...detail.cyber_contributions,
      ...detail.transaction_contributions,
      ...detail.interaction_contributions,
    ]) {
      const item = page.locator(`[data-contribution-code="${contribution.code}"]`);
      await expect(item).toContainText(contribution.label);
      await expect(item).toContainText(`+${contribution.points.toString()}`);
      await expect(item).toContainText(contribution.explanation);
    }
    await expect(page.locator("[data-timeline-code]")).toHaveCount(
      detail.timeline.length,
    );
    for (const item of detail.timeline) {
      await expect(
        page.locator(`[data-timeline-code="${item.code}"]`).first(),
      ).toContainText(item.label);
    }
    await expect(page.getByText(detail.decision_explanation)).toBeVisible();
    await expect(page.getByText(detail.action_explanation)).toBeVisible();
    await expect(page.getByText(detail.customer.customer_reference)).toBeVisible();
    await expect(page.getByText(detail.account.account_reference)).toBeVisible();
    await expect(
      page.getByText(detail.crypto_readiness.fraud_risk_separation_notice),
    ).toBeVisible();
    audit.assertClean();
    audit.stop();
  });

  test("legitimate new device remains guarded, monitored, permitted, and unheld", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.legitimate_new_device.incident_id;
    const token = await apiLogin(request, "analyst");
    const detail = await getIncident(request, token, incidentId);
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);

    await expect(score(page, "Cyber stream")).toHaveText("40");
    await expect(score(page, "Transaction stream")).toHaveText("10");
    await expect(score(page, "Interaction bonus")).toHaveText("0");
    await expect(score(page, "Fused decision")).toHaveText("23");
    await expect(page.locator('[data-score-label="Fused decision"] small')).toContainText(
      "Raw 22.50",
    );
    await expect(
      page.locator('.case-header [data-risk-severity="guarded"]'),
    ).toBeVisible();
    await expect(page.getByText("Allow And Monitor", { exact: true })).toBeVisible();
    await expect(page.locator('.case-decision [data-status="permitted"]')).toBeVisible();
    await expect(page.getByText(detail.action_explanation)).toBeVisible();
    expect(detail.action_explanation.toLowerCase()).toContain("no hold or step-up");
    audit.assertClean();
    audit.stop();
  });

  test("analyst can add a note and complete a valid review-to-legitimate-to-closed workflow", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.normal_activity.incident_id;
    const token = await apiLogin(request, "analyst");
    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);

    await page.getByRole("button", { name: "Mark in review" }).click();
    await expect(page.getByText("Case updated")).toBeVisible();
    await expect(page.locator('.case-header [data-status="in_review"]')).toBeVisible();

    const note = "Synthetic E2E review: customer context reconciled with the baseline.";
    await page.getByLabel("Analyst note").fill(note);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(note)).toBeVisible();

    await page.getByRole("button", { name: "Mark legitimate" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Mark legitimate" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Mark legitimate" }).click();
    await expect(page.locator('.case-header [data-status="legitimate"]')).toBeVisible();

    await page.getByRole("button", { name: "Close case" }).click();
    const closeDialog = page.getByRole("alertdialog", { name: "Close case" });
    await closeDialog.getByRole("button", { name: "Close case" }).click();
    await expect(page.locator('.case-header [data-status="closed"]')).toBeVisible();
    await expect(
      page.getByText("No state-changing action is currently valid."),
    ).toBeVisible();

    const persisted = await getIncident(request, token, incidentId);
    expect(persisted.status).toBe("closed");
    expect(persisted.analyst_actions.map((action) => action.action_type)).toEqual([
      "start_review",
      "add_note",
      "mark_legitimate",
      "close_incident",
    ]);
    expect(persisted.analyst_actions[1]?.note).toBe(note);
    expect(persisted.transaction.status).toBe("permitted");
  });

  test("consequential transaction response prevents duplicate submission", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.account_takeover.incident_id;
    const token = await apiLogin(request, "analyst");
    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);
    await page.getByRole("button", { name: "Simulate release" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Simulate release" });
    const confirm = dialog.getByRole("button", { name: "Simulate release" });
    await confirm.click();
    await expect(page.getByText("Case updated")).toBeVisible();
    await expect(page.locator('.case-decision [data-status="released"]')).toBeVisible();
    const persisted = await getIncident(request, token, incidentId);
    expect(
      persisted.analyst_actions.filter(
        (action) => action.action_type === "simulate_release",
      ),
    ).toHaveLength(1);
  });

  test("two analysts receive a clear 409 conflict with no silent overwrite", async ({
    browser,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.account_takeover.incident_id;
    const contextA = await browser.newContext({
      baseURL: e2eEnvironment.appUrl,
    });
    const contextB = await browser.newContext({
      baseURL: e2eEnvironment.appUrl,
    });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    try {
      await Promise.all([
        loginThroughUi(pageA, "analyst", `/incidents/${incidentId}`),
        loginThroughUi(pageB, "analyst", `/incidents/${incidentId}`),
      ]);
      await pageA.getByRole("button", { name: "Mark in review" }).click();
      await expect(pageA.locator('.case-header [data-status="in_review"]')).toBeVisible();

      const conflictResponse = pageB.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/incidents/${incidentId}`) &&
          response.request().method() === "PATCH",
      );
      await pageB.getByRole("button", { name: "Mark in review" }).click();
      expect((await conflictResponse).status()).toBe(409);
      await expect(pageB.getByText("Case changed before this action")).toBeVisible();
      await expect(pageB.locator('.case-header [data-status="in_review"]')).toBeVisible();

      const token = await apiLogin(request, "analyst");
      const persisted = await getIncident(request, token, incidentId);
      expect(persisted.status).toBe("in_review");
      expect(
        persisted.analyst_actions.filter(
          (action) => action.action_type === "start_review",
        ),
      ).toHaveLength(1);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
      await prepareShowcaseDataset(request);
    }
  });
});
