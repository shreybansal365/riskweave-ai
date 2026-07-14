import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { loginThroughUi, prepareShowcaseDataset } from "./support/api";

const baselineDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-7b",
);

async function capture(
  page: Page,
  name: string,
  ready: Locator,
  viewport: { width: number; height: number },
  authenticated = true,
) {
  await page.addStyleTag({
    content:
      "html { scroll-behavior: auto !important; } * { animation: none !important; transition: none !important; } .side-rail, .workspace-topbar { position: relative !important; inset: auto !important; transform: none !important; } .workspace-topbar { backdrop-filter: none !important; }",
  });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(ready).toBeVisible();
  await expect(page.locator(".loading-skeleton:visible")).toHaveCount(0);
  await expect(page.locator(".error-state:visible")).toHaveCount(0);
  if (authenticated) {
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "RiskWeave overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    const shellGeometry = await page.evaluate(() => {
      const main = document.querySelector("main");
      const navigation = document.querySelector('[aria-label="Primary navigation"]');
      if (!(main instanceof HTMLElement) || !(navigation instanceof HTMLElement))
        return null;
      const mainBox = main.getBoundingClientRect();
      const navigationBox = navigation.getBoundingClientRect();
      return {
        mainWidth: mainBox.width,
        mainHeight: mainBox.height,
        navigationWidth: navigationBox.width,
        navigationHeight: navigationBox.height,
      };
    });
    expect(shellGeometry).not.toBeNull();
    expect(shellGeometry?.mainWidth ?? 0).toBeGreaterThan(500);
    expect(shellGeometry?.mainHeight ?? 0).toBeGreaterThan(400);
    expect(shellGeometry?.navigationWidth ?? 0).toBeGreaterThan(40);
    expect(shellGeometry?.navigationHeight ?? 0).toBeGreaterThan(200);
  }
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
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document
      .querySelectorAll<HTMLElement>(".side-rail, .table-scroll")
      .forEach((element) => {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.waitForTimeout(150);
  if (authenticated) {
    // Warm the shell's former sticky compositor layers independently before the
    // viewport capture. Headless Chromium on macOS can otherwise intermittently
    // reuse the dark investigation surface while rasterizing unrelated shell
    // regions, producing incomplete black patches in an otherwise valid page.
    await page.locator(".side-rail").screenshot({ animations: "disabled" });
    await page.locator(".workspace-topbar").screenshot({ animations: "disabled" });
  }
  await page.screenshot({ fullPage: false, animations: "disabled" });
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLElement>(".side-rail, .table-scroll")
      .forEach((element) => {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      });
  });
  await page.waitForTimeout(100);
  await page.screenshot({
    path: resolve(
      baselineDirectory,
      `${name}-${viewport.width.toString()}x${viewport.height.toString()}.png`,
    ),
    fullPage: false,
    animations: "disabled",
  });
}

test("@visual capture deterministic Milestone 7B review baselines", async ({
  page,
  request,
  browserName,
}) => {
  test.setTimeout(180_000);
  test.skip(process.env.UPDATE_VISUAL_BASELINES !== "1", "Explicit capture command only");
  test.skip(browserName !== "chromium", "Visual baselines use Chromium");
  await mkdir(baselineDirectory, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const showcase = await prepareShowcaseDataset(request);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await capture(
      page,
      "login",
      page.getByRole("button", { name: "Continue securely" }),
      viewport,
      false,
    );
    for (const [name, route, ready] of [
      ["overview", "/overview", "[data-overview-ready]"],
      ["incident-queue", "/incidents", "tbody tr[data-incident-id]"],
      [
        "account-takeover-investigation",
        `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
        `.case-header[data-incident-id="${showcase.scenarios.account_takeover.incident_id}"]`,
      ],
      [
        "legitimate-new-device-investigation",
        `/incidents/${showcase.scenarios.legitimate_new_device.incident_id}`,
        `.case-header[data-incident-id="${showcase.scenarios.legitimate_new_device.incident_id}"]`,
      ],
      ["simulator", "/simulator", '[data-scenario-key="account_takeover"]'],
      ["quantum-readiness", "/quantum-readiness", "[data-quantum-ready]"],
      ["system-health", "/system-health", "[data-system-ready]"],
      ["evaluation", "/evaluation", "[data-benchmark-version]"],
    ] as const) {
      // Give every review route a fresh page/compositor surface. This matches a
      // direct-link entry and prevents Chromium on macOS from reusing dark
      // investigation layers while rasterizing a later screenshot.
      const routePage = await page.context().newPage();
      await routePage.setViewportSize(viewport);
      await routePage.emulateMedia({ reducedMotion: "reduce" });
      try {
        await loginThroughUi(routePage, "admin", route);
        await expect(routePage).toHaveURL(route);
        await capture(routePage, name, routePage.locator(ready).first(), viewport);
      } finally {
        await routePage.close();
      }
    }
  }
});
