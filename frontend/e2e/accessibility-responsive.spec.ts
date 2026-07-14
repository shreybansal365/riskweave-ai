import { expect, test, type Page } from "@playwright/test";

import { expectNoSeriousAccessibilityViolations } from "./support/accessibility";
import {
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";

async function expectNoBodyOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("accessibility and desktop viewport verification", () => {
  test("core product surfaces have no serious or critical axe violations", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Automated axe audit runs once in Chromium");
    const showcase = await prepareShowcaseDataset(request);
    await page.goto("/login");
    await expectNoSeriousAccessibilityViolations(page);
    await loginThroughUi(page, "admin");
    const routes = [
      "/overview",
      "/incidents",
      `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
      `/incidents/${showcase.scenarios.legitimate_new_device.incident_id}`,
      "/simulator",
      "/quantum-readiness",
      "/system-health",
      "/evaluation",
    ];
    for (const route of routes) {
      await navigateWithinAuthenticatedApp(page, route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoSeriousAccessibilityViolations(page);
    }
  });

  test("keyboard interaction and dialog focus trap restore focus correctly", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Focused keyboard audit runs once in Chromium");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareShowcaseDataset(request);
    await loginThroughUi(page, "admin", "/incidents");
    const row = page.locator("tbody tr[data-incident-id]").first();
    await row.focus();
    await row.press(" ");
    await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]+/);

    await navigateWithinAuthenticatedApp(page, "/simulator");
    const trigger = page.getByRole("button", { name: "Restore exact baseline" });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("alertdialog");
    const cancel = dialog.getByRole("button", { name: "Cancel" });
    const confirm = dialog.getByRole("button", { name: "Restore baseline" });
    await expect(cancel).toBeFocused();
    await cancel.press("Shift+Tab");
    await expect(confirm).toBeFocused();
    await confirm.press("Tab");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    const motion = await page.evaluate(() => {
      const card = document.querySelector(".scenario-card");
      if (card === null) throw new Error("scenario card is not rendered");
      const style = getComputedStyle(card);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(["0s", "0.00001s", "1e-05s"]).toContain(motion.animationDuration);
    expect(["0s", "0.00001s", "1e-05s"]).toContain(motion.transitionDuration);
  });

  test("major screens remain usable at the approved desktop and tablet viewports", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Responsive matrix is deterministic in Chromium",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    const showcase = await prepareShowcaseDataset(request);
    await loginThroughUi(page, "admin");
    const routes = [
      "/overview",
      "/incidents",
      `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
      "/simulator",
      "/quantum-readiness",
      "/system-health",
      "/evaluation",
    ];
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await navigateWithinAuthenticatedApp(page, route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(
          page.getByRole("navigation", { name: "Primary navigation" }),
        ).toBeVisible();
        await expectNoBodyOverflow(page);
      }
      await navigateWithinAuthenticatedApp(page, "/simulator");
      await page.getByRole("button", { name: "Restore exact baseline" }).click();
      const box = await page.getByRole("alertdialog").boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Escape");
    }
  });

  test("1024px preserves Decision Weave semantics, triage overflow, and action access", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Breakpoint semantics run once in Chromium");
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const showcase = await prepareShowcaseDataset(request);
    await loginThroughUi(
      page,
      "admin",
      `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
    );

    const weave = page.locator("[data-decision-weave]");
    await expect(weave).toBeVisible();
    expect(
      await weave
        .locator("[data-weave-step]")
        .evaluateAll((steps) =>
          steps.map((step) => step.getAttribute("data-weave-step")),
        ),
    ).toEqual([
      "cyber-evidence",
      "cyber-term",
      "interactions",
      "transaction-term",
      "transaction-evidence",
      "decision",
    ]);
    for (const step of await weave.locator("[data-weave-step]").all()) {
      await expect(step).toBeVisible();
    }
    const contextBox = await page.locator("[data-decision-context]").boundingBox();
    const weaveBox = await weave.boundingBox();
    expect(contextBox).not.toBeNull();
    expect(weaveBox).not.toBeNull();
    expect(contextBox?.y ?? 0).toBeLessThan(weaveBox?.y ?? 0);
    await expect(page.locator(".investigation-action-rail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark in review" })).toBeVisible();
    await expectNoBodyOverflow(page);

    await navigateWithinAuthenticatedApp(page, "/incidents");
    const tableRegion = page.getByRole("region", { name: "Incident queue results" });
    await expect(tableRegion).toBeVisible();
    await expect(
      page.getByText("Scroll horizontally to review every field", { exact: true }),
    ).toBeVisible();
    const overflow = await tableRegion.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
    expect(["auto", "scroll"]).toContain(overflow.overflowX);
    await expectNoBodyOverflow(page);
  });
});
