import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginThroughUi } from "./support/api";

const baselineDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-7b1",
);

async function settle(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolveFrame();
        });
      });
    });
  });
  await page.waitForTimeout(100);
}

async function expectCleanRouteFocus(page: Page) {
  const heading = page.getByRole("heading", {
    level: 1,
    name: "One incident. Every relevant signal.",
  });
  await expect(heading).toBeFocused();
  const style = await heading.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      outlineWidth: computed.outlineWidth,
      outlineStyle: computed.outlineStyle,
      boxShadow: computed.boxShadow,
    };
  });
  expect(style).toEqual({ outlineWidth: "0px", outlineStyle: "none", boxShadow: "none" });
}

async function expectLoginComposition(page: Page) {
  await expect(page.getByRole("link", { name: "RiskWeave AI overview" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue securely" })).toBeVisible();
}

test("@brand-visual capture Milestone 7B.1 logo and route-focus evidence", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  test.skip(process.env.UPDATE_BRAND_BASELINES !== "1", "Explicit capture command only");
  test.skip(browserName !== "chromium", "Brand baselines use Chromium");
  await mkdir(baselineDirectory, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login", { waitUntil: "networkidle" });
  await expectCleanRouteFocus(page);
  await expectLoginComposition(page);
  await settle(page);
  await page.screenshot({
    path: resolve(baselineDirectory, "login-direct-1440x900.png"),
    fullPage: false,
    animations: "disabled",
  });

  await page.reload({ waitUntil: "networkidle" });
  await expectCleanRouteFocus(page);
  await expectLoginComposition(page);
  await settle(page);
  await expectLoginComposition(page);
  await page.screenshot({
    path: resolve(baselineDirectory, "login-reload-1440x900.png"),
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/login", { waitUntil: "networkidle" });
  await expectCleanRouteFocus(page);
  await expectLoginComposition(page);
  await settle(page);
  await page.screenshot({
    path: resolve(baselineDirectory, "login-direct-1024x768.png"),
    fullPage: false,
    animations: "disabled",
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    const shellPage = await page.context().newPage();
    await shellPage.setViewportSize(viewport);
    try {
      await loginThroughUi(shellPage, "admin", "/overview");
      await expect(
        shellPage.getByRole("link", { name: "RiskWeave AI overview" }),
      ).toBeVisible();
      await expect(shellPage.locator(".rail-brand [data-brand-wordmark]")).toHaveText(
        "RiskWeave AI",
      );
      await settle(shellPage);
      await shellPage.screenshot({
        path: resolve(
          baselineDirectory,
          `authenticated-shell-${viewport.width.toString()}x${viewport.height.toString()}.png`,
        ),
        fullPage: false,
        animations: "disabled",
      });
    } finally {
      await shellPage.close();
    }
  }

  const compactPage = await page.context().newPage();
  await compactPage.setViewportSize({ width: 900, height: 768 });
  try {
    await loginThroughUi(compactPage, "admin", "/overview");
    await expect(
      compactPage.locator(".mobile-brand [data-brand-mark='concept-a']"),
    ).toBeVisible();
    await expect(compactPage.locator(".mobile-brand [data-brand-wordmark]")).toHaveCount(
      0,
    );
  } finally {
    await compactPage.close();
  }

  await page.setViewportSize({ width: 980, height: 360 });
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, "Avenir Next", "Segoe UI", sans-serif; }
          .preview { width: 920px; min-height: 250px; padding: 64px; display: grid; place-items: center; }
          .preview img { display: block; width: 600px; max-width: 100%; }
          #light { background: #f7f9fb; }
          #dark { background: #08111f; }
          #small { grid-template-columns: repeat(3, auto); justify-content: center; gap: 72px; background: #f7f9fb; }
          #small img:nth-child(1) { width: 64px; }
          #small img:nth-child(2) { width: 128px; }
          #small img:nth-child(3) { width: 240px; }
        </style>
      </head>
      <body>
        <section class="preview" id="light"><img src="/brand/riskweave-lockup-light.svg" alt="RiskWeave AI light-background lockup"></section>
        <section class="preview" id="dark"><img src="/brand/riskweave-lockup-dark.svg" alt="RiskWeave AI dark-background lockup"></section>
        <section class="preview" id="small">
          <img src="/brand/riskweave-favicon.svg" alt="RiskWeave AI favicon">
          <img src="/brand/riskweave-app-icon.svg" alt="RiskWeave AI app icon">
          <img src="/brand/riskweave-concept-a-mark.svg" alt="RiskWeave AI Concept A mark">
        </section>
      </body>
    </html>
  `);
  await expect(page.getByAltText("RiskWeave AI light-background lockup")).toBeVisible();
  await expect(page.getByAltText("RiskWeave AI dark-background lockup")).toBeVisible();
  await expect(page.getByAltText("RiskWeave AI favicon")).toBeVisible();
  await page.locator("#light").screenshot({
    path: resolve(baselineDirectory, "logo-lockup-light.png"),
    animations: "disabled",
  });
  await page.locator("#dark").screenshot({
    path: resolve(baselineDirectory, "logo-lockup-dark.png"),
    animations: "disabled",
  });
  await page.locator("#small").screenshot({
    path: resolve(baselineDirectory, "favicon-and-small-size-preview.png"),
    animations: "disabled",
  });
});
