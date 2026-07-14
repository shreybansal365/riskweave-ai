import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";

const baselineDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-6",
);

async function capture(page: Page, name: string, ready: Locator) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(ready).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    await new Promise<void>((firstFrame) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          firstFrame();
        });
      });
    });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: resolve(baselineDirectory, `${name}-1440x900.png`),
    fullPage: false,
    animations: "disabled",
  });
}

test("@visual capture deterministic Milestone 6 review baselines", async ({
  page,
  request,
  browserName,
}) => {
  test.skip(process.env.UPDATE_VISUAL_BASELINES !== "1", "Explicit capture command only");
  test.skip(browserName !== "chromium", "Visual baselines use Chromium");
  await mkdir(baselineDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const showcase = await prepareShowcaseDataset(request);

  await page.goto("/login");
  await capture(page, "login", page.getByRole("button", { name: "Continue securely" }));
  await loginThroughUi(page, "admin");
  for (const [name, route, ready] of [
    ["overview", "/overview", page.locator('[data-metric-label="Visible incidents"]')],
    ["incident-queue", "/incidents", page.locator("tbody tr[data-incident-id]").first()],
    [
      "account-takeover-investigation",
      `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
      page.locator(
        `.case-header[data-incident-id="${showcase.scenarios.account_takeover.incident_id}"]`,
      ),
    ],
    [
      "legitimate-new-device-investigation",
      `/incidents/${showcase.scenarios.legitimate_new_device.incident_id}`,
      page.locator(
        `.case-header[data-incident-id="${showcase.scenarios.legitimate_new_device.incident_id}"]`,
      ),
    ],
    ["simulator", "/simulator", page.locator('[data-scenario-key="account_takeover"]')],
    [
      "quantum-readiness",
      "/quantum-readiness",
      page.locator('[data-metric-label="Tracked assets"]'),
    ],
    ["system-health", "/system-health", page.locator(".health-card").first()],
    ["evaluation", "/evaluation", page.locator("[data-benchmark-version]")],
  ] as const) {
    await navigateWithinAuthenticatedApp(page, route);
    await expect(page).toHaveURL(route);
    await capture(page, name, ready);
  }
});
