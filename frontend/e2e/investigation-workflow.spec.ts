import { expect, test } from "@playwright/test";

import {
  apiLogin,
  getIncident,
  loginThroughUi,
  prepareShowcaseDataset,
} from "./support/api";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";

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
    const weave = page.locator("[data-decision-weave]");
    await expect(weave).toBeVisible();
    await expect(weave.locator('[data-weave-step="cyber-evidence"]')).toContainText("78");
    await expect(weave.locator('[data-weave-step="transaction-evidence"]')).toContainText(
      "79",
    );
    await expect(weave.locator('[data-weave-step="cyber-term"]')).toContainText(
      `${detail.fusion_projection.cyber.weight} × ${detail.fusion_projection.cyber.score.toString()} = ${detail.fusion_projection.cyber.weighted_term}`,
    );
    await expect(weave.locator('[data-weave-step="transaction-term"]')).toContainText(
      `${detail.fusion_projection.transaction.weight} × ${detail.fusion_projection.transaction.score.toString()} = ${detail.fusion_projection.transaction.weighted_term}`,
    );
    await expect(weave.locator('[data-weave-step="interactions"]')).toContainText(
      `+${detail.fusion_projection.correlation_bonus.toFixed(2)}`,
    );
    const decision = weave.locator('[data-weave-step="decision"]');
    await expect(decision).toContainText("88.65");
    await expect(decision).toContainText("89");
    await expect(decision).toContainText("ROUND_HALF_UP");
    const semanticOrder = await weave
      .locator("[data-weave-step]")
      .evaluateAll((steps) => steps.map((step) => step.getAttribute("data-weave-step")));
    expect(semanticOrder).toEqual([
      "cyber-evidence",
      "cyber-term",
      "interactions",
      "transaction-term",
      "transaction-evidence",
      "decision",
    ]);
    const weaveCopy = await weave.innerText();
    expect(weaveCopy).not.toMatch(/78\s*\+\s*79\s*\+\s*18\s*=\s*89/);
    expect(weaveCopy).not.toContain("78 + 79 + 18");
    await expect(
      page.locator('.case-header [data-risk-severity="critical"]').first(),
    ).toBeVisible();
    await expect(page.locator('.case-decision [data-status="held"]')).toBeVisible();
    await expect(page.locator(".case-decision")).toContainText(
      "Hold transaction and open critical incident",
    );

    for (const contribution of [
      ...detail.cyber_contributions,
      ...detail.transaction_contributions,
      ...detail.interaction_contributions,
    ]) {
      const item = page.locator(
        `.contribution-ledger-panel [data-contribution-code="${contribution.code}"]`,
      );
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
    await expect(page.getByText(detail.decision_explanation).first()).toBeVisible();
    await expect(page.getByText(detail.action_explanation).first()).toBeVisible();
    await expect(
      page.getByText(detail.customer.customer_reference).first(),
    ).toBeVisible();
    await expect(page.getByText(detail.account.account_reference).first()).toBeVisible();
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

    const weave = page.locator("[data-decision-weave]");
    await expect(weave.locator('[data-weave-step="cyber-evidence"]')).toContainText("40");
    await expect(weave.locator('[data-weave-step="transaction-evidence"]')).toContainText(
      "10",
    );
    await expect(weave.locator('[data-weave-step="cyber-term"]')).toContainText(
      `${detail.fusion_projection.cyber.weight} × ${detail.fusion_projection.cyber.score.toString()} = ${detail.fusion_projection.cyber.weighted_term}`,
    );
    await expect(weave.locator('[data-weave-step="transaction-term"]')).toContainText(
      `${detail.fusion_projection.transaction.weight} × ${detail.fusion_projection.transaction.score.toString()} = ${detail.fusion_projection.transaction.weighted_term}`,
    );
    await expect(weave.locator('[data-weave-step="interactions"]')).toContainText(
      "No eligible cross-domain interaction was recorded",
    );
    await expect(weave.locator('[data-weave-step="interactions"]')).toContainText(
      "+0.00",
    );
    const decision = weave.locator('[data-weave-step="decision"]');
    await expect(decision).toContainText("22.50");
    await expect(decision).toContainText("23");
    await expect(
      page.locator('.case-header [data-risk-severity="guarded"]').first(),
    ).toBeVisible();
    await expect(page.locator(".case-decision")).toContainText("Allow and monitor");
    await expect(page.locator('.case-decision [data-status="permitted"]')).toBeVisible();
    const avoided = page.locator('[data-scenario-treatment="allow_and_monitor"]');
    await expect(avoided).toContainText("Why intervention was avoided");
    await expect(avoided).toContainText("Current treatment: Allow and monitor");
    await expect(avoided).toContainText("Interaction bonus 0");
    await expect(avoided).toContainText("Transaction Permitted · no hold");
    await expect(avoided).toContainText("No step-up authentication");
    await expect(
      page.locator(".disposition-panel").getByRole("button", { name: "Mark legitimate" }),
    ).toBeVisible();
    await expect(
      page.locator(".disposition-panel").getByRole("button", { name: "Confirm fraud" }),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: "Allow and monitor" })).toHaveCount(0);
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
    const workflowFeedback = page.locator("[data-workflow-feedback]");
    await expect(workflowFeedback).toContainText("Case updated");
    await expect(workflowFeedback).toBeFocused();
    await expect(page.locator('.case-header [data-status="in_review"]')).toBeVisible();

    const note = "Synthetic E2E review: customer context reconciled with the baseline.";
    await page.getByLabel("Case note").fill(note);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.locator("[data-workflow-feedback]")).toBeFocused();

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
      page.getByText("No disposition change is currently valid."),
    ).toBeVisible();
    await expect(
      page.getByText("No simulated transaction response is currently valid."),
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

  test("case disposition, analyst notes, and synthetic payment controls stay separated", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.account_takeover.incident_id;
    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);

    const disposition = page.locator(".disposition-panel");
    const transactionResponse = page.locator(".transaction-response-panel");
    const notePanel = page.locator(".analyst-note-panel");
    await expect(
      disposition.getByRole("heading", { name: "Investigation disposition" }),
    ).toBeVisible();
    await expect(
      disposition.getByRole("button", { name: "Mark in review" }),
    ).toBeVisible();
    await expect(
      disposition.getByRole("button", { name: "Simulate release" }),
    ).toHaveCount(0);
    await expect(
      transactionResponse.getByRole("heading", {
        name: "Synthetic transaction response",
      }),
    ).toBeVisible();
    await expect(
      transactionResponse.getByRole("button", { name: "Simulate release" }),
    ).toBeVisible();
    await expect(
      transactionResponse.getByRole("button", { name: "Confirm fraud" }),
    ).toHaveCount(0);
    await expect(notePanel.getByRole("heading", { name: "Analyst note" })).toBeVisible();
    await expect(notePanel.getByLabel("Case note")).toBeVisible();
    await expect(notePanel.getByRole("button", { name: "Add note" })).toBeDisabled();
  });

  test("unsaved analyst notes are protected before route departure", async ({
    page,
    request,
  }) => {
    const showcase = await prepareShowcaseDataset(request);
    const incidentId = showcase.scenarios.account_takeover.incident_id;
    await loginThroughUi(page, "analyst", `/incidents/${incidentId}`);
    await page.getByLabel("Case note").fill("Uncommitted synthetic investigation note");
    await page.getByRole("link", { name: "Back to incident queue" }).click();

    const dialog = page.getByRole("alertdialog", {
      name: "Discard unsaved analyst note?",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(new RegExp(`/incidents/${incidentId}$`));
    await expect(page.getByLabel("Case note")).toHaveValue(
      "Uncommitted synthetic investigation note",
    );

    await page.getByRole("link", { name: "Back to incident queue" }).click();
    await page
      .getByRole("alertdialog", { name: "Discard unsaved analyst note?" })
      .getByRole("button", { name: "Discard note and leave" })
      .click();
    await expect(page).toHaveURL(/\/incidents$/);
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
    const workflowFeedback = page.locator("[data-workflow-feedback]");
    await expect(workflowFeedback).toContainText("Case updated");
    await expect(workflowFeedback).toBeFocused();
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
      const workflowFeedback = pageB.locator("[data-workflow-feedback]");
      await expect(workflowFeedback).toContainText("Case changed before this action");
      await expect(workflowFeedback).toBeFocused();
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
