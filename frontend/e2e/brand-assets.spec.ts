import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const frontendRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(frontendRoot, "public");
const brandRoot = resolve(publicRoot, "brand");

const correctedReferenceGeometry = {
  paths: [
    "M16 214H104C166 214 217 185 264 107",
    "M282 88C338 39 383 18 422 23C482 29 525 83 610 105",
    "M16 20H115C180 20 235 54 284 104",
    "M284 104C301 123 317 146 335 163",
    "M335 163C354 183 374 197 397 203",
    "M397 203C429 216 461 216 491 207",
    "M491 207C541 190 575 146 626 124",
    "M610 105C620 109 628 115 637 120M626 124C630 122 634 121 637 120M637 120H641",
  ],
  endpoint: ["666", "120", "25"],
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function conceptGeometry(svg: string) {
  const mark = /<g\s+data-brand-mark="concept-a"[\s\S]*?<\/g>/u.exec(svg)?.[0];
  if (mark === undefined) throw new Error("Concept A geometry is missing");
  return {
    paths: [...mark.matchAll(/<path[^>]+d="([^"]+)"/gu)].map((match) => match[1]),
    endpoint: /<circle[^>]+cx="([^"]+)"[^>]+cy="([^"]+)"[^>]+r="([^"]+)"/u
      .exec(mark)
      ?.slice(1),
  };
}

function reactConceptGeometry(source: string) {
  return {
    paths: [...source.matchAll(/\bd="([^"]+)"/gu)].map((match) => match[1]),
    endpoint: /<circle[^>]+cx="([^"]+)"[^>]+cy="([^"]+)"[^>]+r="([^"]+)"/u
      .exec(source)
      ?.slice(1),
  };
}

function relativeLuminance(hex: string) {
  const matches = hex.slice(1).match(/.{2}/gu);
  if (matches?.length !== 3) throw new Error(`Invalid colour: ${hex}`);
  const converted = matches.map((channel) => Number.parseInt(channel, 16) / 255);
  const channels: [number, number, number] = [
    converted[0] ?? 0,
    converted[1] ?? 0,
    converted[2] ?? 0,
  ];
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe("RiskWeave production brand assets", () => {
  test("full-size lockups preserve geometry and deterministic outlined typography", () => {
    const light = read(resolve(brandRoot, "riskweave-lockup-light.svg"));
    const dark = read(resolve(brandRoot, "riskweave-lockup-dark.svg"));
    const standalone = read(resolve(brandRoot, "riskweave-concept-a-mark.svg"));
    const component = read(resolve(frontendRoot, "src/components/Brand.tsx"));

    expect(conceptGeometry(dark)).toEqual(conceptGeometry(light));
    expect(conceptGeometry(standalone)).toEqual(conceptGeometry(light));
    expect(reactConceptGeometry(component)).toEqual(conceptGeometry(light));
    expect(conceptGeometry(light)).toEqual(correctedReferenceGeometry);
    expect(standalone).toContain('viewBox="0 0 700 240"');
    expect(light).toContain('data-brand-geometry="concept-a-reference-v2"');
    expect(dark).toContain('data-brand-geometry="concept-a-reference-v2"');
    expect(standalone).toContain('data-brand-geometry="concept-a-reference-v2"');
    expect(component).toContain('data-brand-geometry="concept-a-reference-v2"');
    expect(component).not.toContain("M12 88H48C74 88 95 72 115 50");
    expect(light).toContain("#0B1A2D");
    expect(dark).toContain("#98A4B3");
    expect(light).toContain("#1F9E9D");
    expect(light).toContain("#DF9417");
    expect(dark).toContain("#1F9E9D");
    expect(dark).toContain("#DF9417");

    for (const svg of [light, dark]) {
      expect(svg).toContain('<title id="title">RiskWeave AI</title>');
      expect(svg).toContain('data-wordmark-outline="avenir-next"');
      expect(svg).not.toContain("<text");
    }

    expect(light).toContain('transform="translate(0 31) scale(.21)"');
    expect(dark).toContain('transform="translate(0 31) scale(.21)"');
    expect(light).toContain('stroke-width="16"');
    expect(dark).toContain('stroke-width="16"');
  });

  test("dark treatment passes contrast without a halo or target endpoint", () => {
    const dark = read(resolve(brandRoot, "riskweave-lockup-dark.svg"));
    const styles = read(resolve(frontendRoot, "src/styles/global.css"));
    const tokens = read(resolve(frontendRoot, "src/styles/tokens.css"));

    expect(contrastRatio("#98A4B3", "#08111F")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#98A4B3", "#08111F")).toBeCloseTo(7.47, 2);
    expect(dark.match(/<circle/gu)).toHaveLength(1);
    expect(dark).toContain('fill="#98A4B3" stroke="none"');
    expect(dark).not.toMatch(/halo|stroke-opacity/iu);
    expect(tokens).toContain("--brand-decision-inverse: #98a4b3;");
    expect(styles).toContain("--brand-decision-surface: var(--brand-decision-inverse);");
    expect(styles).not.toContain("brand-mark__decision-halo");
  });

  test("document and manifest declarations resolve to production assets", async ({
    page,
  }) => {
    await page.goto("/login");
    const declarations = await page.locator('link[rel*="icon"]').evaluateAll((links) =>
      links.map((link) => {
        const icon = link as HTMLLinkElement;
        return {
          rel: icon.rel,
          type: icon.type,
          sizes: icon.sizes.value,
          href: icon.getAttribute("href"),
        };
      }),
    );
    expect(declarations).toEqual([
      {
        rel: "icon",
        type: "image/svg+xml",
        sizes: "",
        href: "/brand/riskweave-favicon.svg?v=20260715",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/brand/riskweave-favicon-32.png?v=20260715",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/brand/riskweave-favicon-16.png?v=20260715",
      },
      {
        rel: "shortcut icon",
        type: "image/x-icon",
        sizes: "",
        href: "/favicon.ico?v=20260715",
      },
      {
        rel: "apple-touch-icon",
        type: "",
        sizes: "180x180",
        href: "/brand/riskweave-apple-touch-icon.png?v=20260715",
      },
    ]);

    for (const declaration of declarations) {
      if (declaration.href === null) throw new Error("Icon href is missing");
      const response = await page.request.get(declaration.href);
      expect(response.status(), declaration.href).toBe(200);
      expect(response.headers()["content-type"], declaration.href).toContain("image");
    }

    const manifestResponse = await page.request.get("/site.webmanifest");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain(
      "application/manifest+json",
    );
    const manifest = (await manifestResponse.json()) as {
      name: string;
      icons: { src: string; sizes: string; type: string }[];
    };
    expect(manifest.name).toBe("RiskWeave AI");
    expect(manifest.icons).toEqual([
      expect.objectContaining({
        src: "/brand/riskweave-app-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      }),
      expect.objectContaining({
        src: "/brand/riskweave-app-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      }),
      expect.objectContaining({
        src: "/brand/riskweave-app-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      }),
    ]);
    for (const icon of manifest.icons) {
      expect((await page.request.get(icon.src)).status(), icon.src).toBe(200);
    }

    await expect(page).toHaveTitle(/RiskWeave AI$/u);
    await expect(page.locator('link[href*="vite"], link[href*="react.svg"]')).toHaveCount(
      0,
    );
  });
});
