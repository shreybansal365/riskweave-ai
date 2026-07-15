import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { loginThroughUi } from "./support/api";

const baselineDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-7b1-2",
);
const originalReferencePath = resolve(baselineDirectory, "original-reference-source.png");
const applicationUrl = process.env.E2E_BASE_URL ?? "http://localhost:4173";

function brandAssetUrl(fileName: string) {
  return `${applicationUrl}/brand/${fileName}`;
}

const previousMark = `
  <svg viewBox="0 0 320 112" aria-label="Previous compressed production mark">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="8">
      <path stroke="#DF9417" d="M12 88H48C74 88 95 72 115 50"/>
      <path stroke="#1F9E9D" d="M115 50C139 28 166 19 191 24C218 29 236 48 257 56"/>
      <path stroke="#1F9E9D" d="M12 25H46C78 25 101 39 125 64C148 88 175 94 204 87"/>
      <path stroke="#0B1A2D" d="M204 87C220 84 231 77 241 69"/>
      <path stroke="#DF9417" d="M241 69C251 62 259 56 270 52"/>
      <path stroke="#0B1A2D" d="M257 56C262 55 266 53 270 52M270 52H293"/>
    </g>
    <circle cx="304" cy="52" r="11" fill="#0B1A2D"/>
  </svg>`;

function pngDataUrl(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

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
    await page.goto(`/login?geometry-proof=${Date.now().toString()}`, {
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

test("@brand-visual-7b1-2 captures original-reference geometry evidence", async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000);
  test.skip(
    process.env.UPDATE_BRAND_7B1_2_BASELINES !== "1",
    "Explicit Milestone 7B.1.2 capture command only",
  );
  test.skip(browserName !== "chromium", "Geometry evidence uses deterministic Chromium");
  await mkdir(baselineDirectory, { recursive: true });

  const originalDataUrl = pngDataUrl(await readFile(originalReferencePath));

  await page.setViewportSize({ width: 1440, height: 520 });
  await page.setContent(`
    <!doctype html><html lang="en"><head><style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f5; color: #17212f; font: 600 14px Inter, system-ui, sans-serif; }
      header { height: 70px; padding: 22px 30px; border-bottom: 1px solid #ccd5df; background: white; }
      main { height: 450px; display: grid; grid-template-columns: 1fr 1fr; }
      article { display: grid; place-items: center; align-content: center; gap: 22px; padding: 28px; }
      article + article { border-left: 1px solid #ccd5df; }
      .label { letter-spacing: .09em; text-transform: uppercase; color: #516071; }
      .raster-crop { position: relative; width: 575px; height: 180px; overflow: hidden; background: white; }
      .raster-crop img { position: absolute; width: 729px; max-width: none; left: -55px; top: -27px; }
      .corrected { display: block; height: 206px; width: auto; }
    </style></head><body>
      <header>Concept A geometry · equal painted height</header>
      <main id="comparison">
        <article><span class="label">Original raster reference</span><div class="raster-crop"><img src="${originalDataUrl}" alt="Original Concept A mark"></div></article>
        <article><span class="label">Corrected production vector</span><img class="corrected" src="${brandAssetUrl("riskweave-concept-a-mark.svg")}" alt="Corrected Concept A mark"></article>
      </main>
    </body></html>
  `);
  await expect(page.getByAltText("Original Concept A mark")).toBeVisible();
  await expect(page.getByAltText("Corrected Concept A mark")).toBeVisible();
  await expect
    .poll(() =>
      page.getByAltText("Corrected Concept A mark").evaluate((image) => {
        return image instanceof HTMLImageElement ? image.naturalWidth : 0;
      }),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: resolve(baselineDirectory, "original-vs-corrected-equal-height.png"),
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 1440, height: 520 });
  await page.setContent(`
    <!doctype html><html lang="en"><head><style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f5; color: #17212f; font: 600 14px Inter, system-ui, sans-serif; }
      header { height: 70px; padding: 22px 30px; border-bottom: 1px solid #ccd5df; background: white; }
      main { height: 450px; display: grid; grid-template-columns: 1fr 1fr; }
      article { display: grid; place-items: center; align-content: center; gap: 22px; padding: 28px; overflow: hidden; }
      article + article { border-left: 1px solid #ccd5df; }
      .label { letter-spacing: .09em; text-transform: uppercase; color: #516071; }
      .previous { display: block; width: 677px; height: 237px; }
      .corrected { display: block; height: 189px; width: auto; }
    </style></head><body>
      <header>Production geometry · equal painted height</header>
      <main>
        <article><span class="label">Previous compressed mark</span><div class="previous">${previousMark}</div></article>
        <article><span class="label">Corrected reference-derived mark</span><img class="corrected" src="${brandAssetUrl("riskweave-concept-a-mark.svg")}" alt="Corrected full-size mark"></article>
      </main>
    </body></html>
  `);
  await expect(page.getByAltText("Corrected full-size mark")).toBeVisible();
  await page.screenshot({
    path: resolve(baselineDirectory, "previous-vs-corrected-equal-height.png"),
    fullPage: false,
    animations: "disabled",
  });

  await page.setViewportSize({ width: 1000, height: 470 });
  await page.setContent(`
    <!doctype html><html lang="en"><head><style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #f7f9fb; color: #17212f; font: 600 14px Inter, system-ui, sans-serif; }
      header { padding: 24px 34px 10px; }
      .legend { padding: 0 34px 22px; color: #667085; font-weight: 500; }
      .stage { position: relative; width: 585px; height: 180px; margin: 0 auto; overflow: hidden; outline: 1px solid #ccd5df; background: white; }
      .original { position: absolute; width: 729px; max-width: none; left: -55px; top: -27px; opacity: .45; }
      .corrected { position: absolute; width: 600px; height: auto; left: -7px; top: -10px; opacity: .8; }
      .guide { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(180,35,24,.55); }
      .guide.first { left: 40%; } .guide.lower { left: 57%; } .guide.endpoint { left: 96%; }
      .axis { position: absolute; left: 0; right: 0; top: 52%; height: 1px; background: rgba(15,118,110,.45); }
      .labels { width: 585px; margin: 14px auto 0; display: flex; justify-content: space-between; color: #667085; font-size: 12px; }
    </style></head><body>
      <header>Reference alignment overlay</header>
      <p class="legend">Original raster at 45% opacity · corrected intentional centrelines at 80% opacity</p>
      <div class="stage">
        <img class="original" src="${originalDataUrl}" alt="Original geometry overlay">
        <img class="corrected" src="${brandAssetUrl("riskweave-concept-a-mark.svg")}" alt="Corrected geometry overlay">
        <span class="guide first"></span><span class="guide lower"></span><span class="guide endpoint"></span><span class="axis"></span>
      </div>
      <div class="labels"><span>first weave</span><span>lower weave</span><span>decision endpoint</span></div>
    </body></html>
  `);
  await expect(page.getByAltText("Corrected geometry overlay")).toBeVisible();
  await page.screenshot({
    path: resolve(baselineDirectory, "geometry-overlay.png"),
    fullPage: false,
    animations: "disabled",
  });

  for (const [surface, fileName] of [
    ["light", "corrected-light-lockup.png"],
    ["dark", "corrected-dark-lockup.png"],
  ] as const) {
    await page.setViewportSize({ width: 980, height: 360 });
    const background = surface === "light" ? "#f7f9fb" : "#08111f";
    await page.setContent(`
      <!doctype html><html lang="en"><head><style>
        * { box-sizing: border-box; } body { margin: 0; }
        .preview { width: 980px; height: 360px; padding: 70px; display: grid; place-items: center; background: ${background}; }
        img { display: block; width: 660px; max-width: 100%; }
      </style></head><body><section class="preview"><img src="${brandAssetUrl(`riskweave-lockup-${surface}.svg`)}" alt="Corrected ${surface} RiskWeave AI lockup"></section></body></html>
    `);
    await expect(
      page.getByAltText(`Corrected ${surface} RiskWeave AI lockup`),
    ).toBeVisible();
    await page.screenshot({
      path: resolve(baselineDirectory, fileName),
      fullPage: false,
      animations: "disabled",
    });
  }

  await page.setViewportSize({ width: 960, height: 480 });
  await page.setContent(`
    <!doctype html><html lang="en"><head><style>
      * { box-sizing: border-box; } body { margin: 0; background: #f4f6f8; color: #17212f; font: 600 14px Inter, system-ui, sans-serif; }
      .grid { width: 960px; height: 480px; display: grid; grid-template-columns: 1fr 1fr; }
      .surface { display: grid; align-content: center; justify-items: center; gap: 24px; }
      .dark { background: #08111f; color: #f7f9fb; }
      .sizes { display: flex; align-items: center; gap: 42px; }
      .sample { display: grid; justify-items: center; gap: 10px; }
      img { display: block; } .s16 { width: 16px; height: 16px; } .s32 { width: 32px; height: 32px; } .s64 { width: 64px; height: 64px; }
    </style></head><body><main class="grid">
      <section class="surface"><strong>Light browser chrome</strong><div class="sizes">
        <span class="sample"><img class="s16" src="${brandAssetUrl("riskweave-favicon-16.png")}" alt="16 pixel favicon light"><span>16</span></span>
        <span class="sample"><img class="s32" src="${brandAssetUrl("riskweave-favicon-32.png")}" alt="32 pixel favicon light"><span>32</span></span>
        <span class="sample"><img class="s64" src="${brandAssetUrl("riskweave-favicon-64.png")}" alt="64 pixel favicon light"><span>64</span></span>
      </div></section>
      <section class="surface dark"><strong>Dark browser chrome</strong><div class="sizes">
        <span class="sample"><img class="s16" src="${brandAssetUrl("riskweave-favicon-16.png")}" alt="16 pixel favicon dark"><span>16</span></span>
        <span class="sample"><img class="s32" src="${brandAssetUrl("riskweave-favicon-32.png")}" alt="32 pixel favicon dark"><span>32</span></span>
        <span class="sample"><img class="s64" src="${brandAssetUrl("riskweave-favicon-64.png")}" alt="64 pixel favicon dark"><span>64</span></span>
      </div></section>
    </main></body></html>
  `);
  await expect(page.getByAltText("16 pixel favicon light")).toBeVisible();
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
    <!doctype html><html lang="en"><head><style>
      * { box-sizing: border-box; } body { margin: 0; background: #08111f; color: #f7f9fb; font: 650 13px Inter, system-ui, sans-serif; }
      header { height: 42px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; padding: 0 18px; border-bottom: 1px solid #263445; letter-spacing: .04em; text-transform: uppercase; }
      header span:last-child { border-left: 1px solid #263445; padding-left: 18px; }
      main { display: grid; grid-template-columns: 1fr 1fr; width: 1440px; height: 858px; overflow: hidden; }
      img { width: 1440px; height: 900px; transform: scale(.5); transform-origin: top left; }
      figure { margin: 0; width: 720px; height: 450px; overflow: hidden; background: #f4f6f8; }
    </style></head><body><header><span>Direct entry</span><span>Reload</span></header><main>
      <figure><img src="${pngDataUrl(direct)}" alt="Direct-entry login"></figure>
      <figure><img src="${pngDataUrl(reload)}" alt="Reloaded login"></figure>
    </main></body></html>
  `);
  await page.screenshot({
    path: resolve(baselineDirectory, "login-direct-vs-reload.png"),
    fullPage: false,
    animations: "disabled",
  });

  const desktop = await page.context().newPage();
  try {
    await desktop.setViewportSize({ width: 1440, height: 900 });
    await loginThroughUi(desktop, "admin", "/overview");
    await expect(
      desktop.locator(".rail-brand [data-brand-geometry='concept-a-reference-v2']"),
    ).toBeVisible();
    await settle(desktop);
    await desktop.screenshot({
      path: resolve(baselineDirectory, "authenticated-sidebar-1440x900.png"),
      fullPage: false,
      animations: "disabled",
    });
  } finally {
    await desktop.close();
  }

  const compact = await page.context().newPage();
  try {
    await compact.setViewportSize({ width: 1024, height: 768 });
    await loginThroughUi(compact, "admin", "/overview");
    await expect(
      compact.getByRole("link", { name: "RiskWeave AI overview" }),
    ).toBeVisible();
    await settle(compact);
    await compact.screenshot({
      path: resolve(baselineDirectory, "authenticated-compact-shell-1024x768.png"),
      fullPage: false,
      animations: "disabled",
    });
  } finally {
    await compact.close();
  }
});
