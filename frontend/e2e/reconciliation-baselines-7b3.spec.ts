import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";

const captureEnabled = process.env.UPDATE_7B3_BASELINES === "1";
const frontendDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(
  frontendDirectory,
  "../../docs/visual-baselines/milestone-7b3",
);

test.describe("Milestone 7B.3 bounded reconciliation evidence", () => {
  test.skip(!captureEnabled, "Set UPDATE_7B3_BASELINES=1 to capture review evidence");

  test("captures backend-authored provenance and device semantics", async ({
    page,
    request,
  }) => {
    mkdirSync(outputDirectory, { recursive: true });
    const showcase = await prepareShowcaseDataset(request);
    const attackId = showcase.scenarios.account_takeover.incident_id;
    await loginThroughUi(page, "analyst", `/incidents/${attackId}`);

    const decisionContext = page.locator("[data-decision-context]");
    await expect(decisionContext.locator("[data-device-posture]")).toContainText(
      "organizational trust established",
    );
    await expect(decisionContext.locator("[data-customer-familiarity]")).toContainText(
      "New to behavioural history",
    );
    await decisionContext.screenshot({
      path: resolve(outputDirectory, "scenario-c-device-posture-vs-familiarity.png"),
    });

    const attackWeave = page.locator("[data-decision-weave]");
    await expect(attackWeave.locator("[data-interaction-contribution-id]")).toHaveCount(
      3,
    );
    await attackWeave.screenshot({
      path: resolve(outputDirectory, "account-takeover-backend-provenance.png"),
    });

    const legitimateId = showcase.scenarios.legitimate_new_device.incident_id;
    await navigateWithinAuthenticatedApp(page, `/incidents/${legitimateId}`);
    const legitimateWeave = page.locator("[data-decision-weave]");
    await expect(legitimateWeave).toContainText(
      "No eligible cross-domain interaction was recorded",
    );
    await expect(legitimateWeave).toContainText("+0.00");
    await legitimateWeave.screenshot({
      path: resolve(outputDirectory, "legitimate-new-device-zero-bonus.png"),
    });
  });
});
