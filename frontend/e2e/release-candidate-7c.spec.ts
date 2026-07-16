import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  apiLogin,
  getDashboardSummary,
  getDashboardTrends,
  loginThroughUi,
  navigateWithinAuthenticatedApp,
  prepareShowcaseDataset,
} from "./support/api";

const evidenceDirectory = resolve(
  import.meta.dirname,
  "../../docs/visual-baselines/milestone-7c",
);

async function settleRoute(page: Page, route: string, readySelector: string) {
  await navigateWithinAuthenticatedApp(page, route);
  await expect(page.locator(readySelector)).toBeVisible();
  await expect(page.locator(".loading-skeleton:visible")).toHaveCount(0);
  await expect(page.locator('[role="alert"]:visible')).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => {
        resolveFrame();
      }),
    );
  });
}

async function captureRoute(
  page: Page,
  filename: string,
  route: string,
  readySelector: string,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await settleRoute(page, route, readySelector);
  await page.screenshot({
    path: resolve(evidenceDirectory, filename),
    fullPage: false,
    animations: "disabled",
  });
}

test.describe("Milestone 7C release-candidate contract", () => {
  test("uses one local application font and preserves bounded Overview and Decision Weave semantics", async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Release-candidate contract runs in Chromium");
    const fontRequests: string[] = [];
    page.on("request", (requestEvent) => {
      if (requestEvent.resourceType() === "font") fontRequests.push(requestEvent.url());
    });
    const showcase = await prepareShowcaseDataset(request);
    const token = await apiLogin(request, "analyst");
    const [summary, trends] = await Promise.all([
      getDashboardSummary(request, token),
      getDashboardTrends(request, token),
    ]);

    await loginThroughUi(page, "admin", "/overview");
    await page.evaluate(async () => document.fonts.ready);
    expect(summary.visible_incidents).toBe(18);
    expect(trends.window_incident_count).toBe(15);
    expect(trends.window_incident_count).toBe(
      trends.points.reduce((total, point) => total + point.incident_volume, 0),
    );
    await expect(page.locator("[data-current-visible-count]")).toHaveAttribute(
      "data-current-visible-count",
      "18",
    );
    await expect(page.locator("[data-current-visible-count]")).toContainText(
      "14-day chart window: 15 incidents",
    );
    await expect(page.locator("[data-trend-window-count]")).toHaveAttribute(
      "data-trend-window-count",
      "15",
    );
    expect(
      await page.evaluate(() => ({
        loaded: document.fonts.check('16px "Inter Variable"'),
        family: getComputedStyle(document.documentElement).fontFamily,
      })),
    ).toEqual({
      loaded: true,
      family: expect.stringContaining("Inter Variable"),
    });
    expect(fontRequests.length).toBeGreaterThan(0);
    expect(
      fontRequests.every(
        (fontUrl) => new URL(fontUrl).origin === windowOrigin(page.url()),
      ),
    ).toBe(true);

    await page.setViewportSize({ width: 1024, height: 768 });
    await settleRoute(
      page,
      `/incidents/${showcase.scenarios.account_takeover.incident_id}`,
      "[data-decision-weave]",
    );
    const codeTreatment = await page
      .locator(".decision-weave__knot code")
      .evaluateAll((codes) =>
        codes.map((code) => ({
          text: code.textContent,
          overflow: getComputedStyle(code).overflow,
          textOverflow: getComputedStyle(code).textOverflow,
          whiteSpace: getComputedStyle(code).whiteSpace,
          label: code.getAttribute("aria-label"),
        })),
      );
    expect(codeTreatment.length).toBeGreaterThan(0);
    expect(codeTreatment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          text: expect.stringContaining("correlation."),
          label: expect.stringContaining("Interaction rule code correlation."),
        }),
      ]),
    );

    await settleRoute(page, "/system-health", "[data-system-ready]");
    const coverage = page.locator(".panel").filter({
      has: page.getByRole("heading", { name: "Persisted source coverage" }),
    });
    await expect(
      coverage.locator('[data-coverage-status="fixture_available"]'),
    ).toHaveCount(summary.source_systems.length);
    await expect(coverage.getByText("Connected", { exact: true })).toHaveCount(0);
  });

  test("@visual captures the bounded Milestone 7C evidence shortlist", async ({
    page,
    request,
    browserName,
  }) => {
    test.setTimeout(120_000);
    test.skip(process.env.UPDATE_7C_BASELINES !== "1", "Explicit capture command only");
    test.skip(browserName !== "chromium", "Release evidence uses Chromium");
    await mkdir(evidenceDirectory, { recursive: true });
    const showcase = await prepareShowcaseDataset(request);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await loginThroughUi(page, "admin", "/overview");
    await page.addStyleTag({
      content:
        "html { scroll-behavior: auto !important; } * { animation: none !important; transition: none !important; }",
    });

    const accountRoute = `/incidents/${showcase.scenarios.account_takeover.incident_id}`;
    const legitimateRoute = `/incidents/${showcase.scenarios.legitimate_new_device.incident_id}`;
    await captureRoute(
      page,
      "overview-1440x900.png",
      "/overview",
      "[data-overview-ready]",
      { width: 1440, height: 900 },
    );
    await captureRoute(
      page,
      "overview-1024x768.png",
      "/overview",
      "[data-overview-ready]",
      { width: 1024, height: 768 },
    );
    await captureRoute(
      page,
      "account-takeover-decision-weave-1440x900.png",
      accountRoute,
      "[data-decision-weave]",
      { width: 1440, height: 900 },
    );
    await captureRoute(
      page,
      "account-takeover-1024x768.png",
      accountRoute,
      "[data-decision-weave]",
      { width: 1024, height: 768 },
    );
    await captureRoute(
      page,
      "legitimate-new-device-1440x900.png",
      legitimateRoute,
      "[data-decision-weave]",
      { width: 1440, height: 900 },
    );
    await captureRoute(
      page,
      "system-health-1440x900.png",
      "/system-health",
      "[data-system-ready]",
      { width: 1440, height: 900 },
    );
    await captureRoute(
      page,
      "incidents-1440x900.png",
      "/incidents",
      "tbody tr[data-incident-id]:first-child",
      { width: 1440, height: 900 },
    );
    await captureRoute(
      page,
      "evaluation-1440x900.png",
      "/evaluation",
      "[data-benchmark-version]",
      { width: 1440, height: 900 },
    );

    const contactItems = [
      ["Overview · 1440", "overview-1440x900.png"],
      ["Overview · 1024", "overview-1024x768.png"],
      ["Account takeover · 1440", "account-takeover-decision-weave-1440x900.png"],
      ["Account takeover · 1024", "account-takeover-1024x768.png"],
      ["Legitimate new device", "legitimate-new-device-1440x900.png"],
      ["System health", "system-health-1440x900.png"],
      ["Incident queue", "incidents-1440x900.png"],
      ["Evaluation", "evaluation-1440x900.png"],
    ] as const;
    const cards = await Promise.all(
      contactItems.map(async ([label, filename]) => ({
        label,
        source: `data:image/png;base64,${(
          await readFile(resolve(evidenceDirectory, filename))
        ).toString("base64")}`,
      })),
    );
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.setContent(`<!doctype html><html><head><style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#08111f;color:#f7f9fb;font-family:Inter,system-ui,sans-serif}
      header{display:flex;align-items:end;justify-content:space-between;margin-bottom:20px}h1{margin:0;font-size:28px}p{margin:0;color:#98a4b3}
      main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.card{margin:0;padding:10px;background:#142238;border:1px solid #263445}
      img{display:block;width:100%;height:390px;object-fit:contain;background:#f4f6f8}figcaption{padding:9px 2px 1px;color:#dce3ea;font-size:14px}
    </style></head><body><header><div><h1>RiskWeave AI · release-candidate shortlist</h1><p>Deterministic local evidence · Milestone 7C</p></div><p>8 principal views</p></header><main>${cards
      .map(
        ({ label, source }) =>
          `<figure class="card"><img src="${source}" alt=""><figcaption>${label}</figcaption></figure>`,
      )
      .join("")}</main></body></html>`);
    await page.screenshot({
      path: resolve(evidenceDirectory, "presentation-shortlist-contact-sheet.png"),
      fullPage: false,
      animations: "disabled",
    });
  });
});

function windowOrigin(url: string): string {
  return new URL(url).origin;
}
