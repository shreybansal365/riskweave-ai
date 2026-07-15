import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginThroughUi } from "./support/api";

const baselineDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-7b1-1",
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
  await expect(heading).toHaveAttribute("data-route-focus-target", "true");
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

async function captureLogin(page: Page, name: string, reload = false) {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (reload) {
    await page.reload({ waitUntil: "networkidle" });
  } else {
    await page.goto(`/login?brand-proof=${Date.now().toString()}`, {
      waitUntil: "networkidle",
    });
  }
  await expectCleanRouteFocus(page);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await settle(page);
  await page.screenshot({
    path: resolve(baselineDirectory, name),
    fullPage: false,
    animations: "disabled",
  });
}

test("@brand-visual-7b1-1 capture inverse-brand, favicon, and focus evidence", async ({
  page,
  browserName,
}) => {
  test.setTimeout(150_000);
  test.skip(
    process.env.UPDATE_BRAND_7B1_1_BASELINES !== "1",
    "Explicit Milestone 7B.1.1 capture command only",
  );
  test.skip(browserName !== "chromium", "Brand evidence uses deterministic Chromium");
  await mkdir(baselineDirectory, { recursive: true });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 980, height: 360 });
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; }
          .preview { width: 980px; height: 360px; padding: 70px; display: grid; place-items: center; }
          .preview img { display: block; width: 660px; max-width: 100%; }
          #light { background: #f7f9fb; }
        </style>
      </head>
      <body><section class="preview" id="light"><img src="/brand/riskweave-lockup-light.svg" alt="Light RiskWeave AI lockup"></section></body>
    </html>
  `);
  await expect(page.getByAltText("Light RiskWeave AI lockup")).toBeVisible();
  await page.locator("#light").screenshot({
    path: resolve(baselineDirectory, "unchanged-light-lockup.png"),
    animations: "disabled",
  });

  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; }
          .preview { width: 980px; height: 360px; padding: 70px; display: grid; place-items: center; background: #08111f; }
          .preview img { display: block; width: 660px; max-width: 100%; }
        </style>
      </head>
      <body><section class="preview" id="dark"><img src="/brand/riskweave-lockup-dark.svg" alt="Dark RiskWeave AI lockup"></section></body>
    </html>
  `);
  await expect(page.getByAltText("Dark RiskWeave AI lockup")).toBeVisible();
  await page.locator("#dark").screenshot({
    path: resolve(baselineDirectory, "corrected-dark-lockup.png"),
    animations: "disabled",
  });

  await page.setViewportSize({ width: 960, height: 480 });
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f4f6f8; color: #17212f; font: 600 14px Inter, system-ui, sans-serif; }
          .grid { width: 960px; height: 480px; display: grid; grid-template-columns: 1fr 1fr; }
          .surface { display: grid; align-content: center; justify-items: center; gap: 24px; }
          .surface--dark { background: #08111f; color: #f7f9fb; }
          .sizes { display: flex; align-items: center; gap: 42px; }
          .sample { display: grid; justify-items: center; gap: 10px; }
          .sample img { display: block; }
          .size-16 { width: 16px; height: 16px; }
          .size-32 { width: 32px; height: 32px; }
          .size-64 { width: 64px; height: 64px; }
        </style>
      </head>
      <body>
        <main class="grid">
          <section class="surface"><strong>Light browser chrome</strong><div class="sizes">
            <span class="sample"><img class="size-16" src="/brand/riskweave-favicon-16.png" alt="16 pixel favicon on light"><span>16</span></span>
            <span class="sample"><img class="size-32" src="/brand/riskweave-favicon-32.png" alt="32 pixel favicon on light"><span>32</span></span>
            <span class="sample"><img class="size-64" src="/brand/riskweave-favicon-64.png" alt="64 pixel favicon on light"><span>64</span></span>
          </div></section>
          <section class="surface surface--dark"><strong>Dark browser chrome</strong><div class="sizes">
            <span class="sample"><img class="size-16" src="/brand/riskweave-favicon-16.png" alt="16 pixel favicon on dark"><span>16</span></span>
            <span class="sample"><img class="size-32" src="/brand/riskweave-favicon-32.png" alt="32 pixel favicon on dark"><span>32</span></span>
            <span class="sample"><img class="size-64" src="/brand/riskweave-favicon-64.png" alt="64 pixel favicon on dark"><span>64</span></span>
          </div></section>
        </main>
      </body>
    </html>
  `);
  await expect(page.getByAltText("16 pixel favicon on light")).toBeVisible();
  await page.screenshot({
    path: resolve(baselineDirectory, "favicon-assets-16-32-64-light-dark.png"),
    fullPage: false,
    animations: "disabled",
  });

  await captureLogin(page, "login-1440x900.png");
  await captureLogin(page, "login-direct-1440x900.png");
  await captureLogin(page, "login-reload-1440x900.png", true);

  const direct = await readFile(resolve(baselineDirectory, "login-direct-1440x900.png"));
  const reload = await readFile(resolve(baselineDirectory, "login-reload-1440x900.png"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #08111f; color: #f7f9fb; font: 650 13px Inter, system-ui, sans-serif; }
          header { height: 42px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 0 18px; border-bottom: 1px solid #263445; letter-spacing: .04em; text-transform: uppercase; }
          header span:last-child { border-left: 1px solid #263445; padding-left: 18px; }
          main { display: grid; grid-template-columns: 1fr 1fr; width: 1440px; height: 858px; overflow: hidden; }
          img { width: 1440px; height: 900px; transform: scale(.5); transform-origin: top left; }
          figure { margin: 0; width: 720px; height: 450px; overflow: hidden; background: #f4f6f8; }
        </style>
      </head>
      <body>
        <header><span>Direct entry</span><span>Reload</span></header>
        <main>
          <figure><img src="data:image/png;base64,${direct.toString("base64")}" alt="Direct-entry login"></figure>
          <figure><img src="data:image/png;base64,${reload.toString("base64")}" alt="Reloaded login"></figure>
        </main>
      </body>
    </html>
  `);
  await page.screenshot({
    path: resolve(baselineDirectory, "login-direct-vs-reload.png"),
    fullPage: false,
    animations: "disabled",
  });

  const shellPage = await page.context().newPage();
  try {
    await shellPage.setViewportSize({ width: 1440, height: 900 });
    await loginThroughUi(shellPage, "admin", "/overview");
    await expect(
      shellPage.locator(".rail-brand [data-brand-surface='dark']"),
    ).toBeVisible();
    await settle(shellPage);
    await shellPage.screenshot({
      path: resolve(baselineDirectory, "authenticated-sidebar-1440x900.png"),
      fullPage: false,
      animations: "disabled",
    });
  } finally {
    await shellPage.close();
  }

  const compactPage = await page.context().newPage();
  try {
    await compactPage.setViewportSize({ width: 1024, height: 768 });
    await loginThroughUi(compactPage, "admin", "/overview");
    await expect(
      compactPage.getByRole("link", { name: "RiskWeave AI overview" }),
    ).toBeVisible();
    await settle(compactPage);
    await compactPage.screenshot({
      path: resolve(baselineDirectory, "authenticated-compact-shell-1024x768.png"),
      fullPage: false,
      animations: "disabled",
    });
  } finally {
    await compactPage.close();
  }
});
