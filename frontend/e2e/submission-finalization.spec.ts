import { expect, test } from "@playwright/test";

import type { IncidentDetail, LoginResponse } from "../src/types/api";
import { expectNoSeriousAccessibilityViolations } from "./support/accessibility";
import { beginBrowserAudit } from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";

const accountTakeoverId = "ad446606-4e96-5372-a0e6-b3dd14e354fb";

test("public judge entry is read-only, return-path aware, and operationally connected", async ({
  page,
}) => {
  const audit = beginBrowserAudit(page);
  let demoToken = "";
  await page.route("**/api/auth/demo-access", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const response = await route.fetch();
    const payload = (await response.json()) as LoginResponse;
    demoToken = payload.access_token;
    await route.fulfill({ response });
  });

  await page.goto(`/incidents/${accountTakeoverId}`);
  const entry = page.getByRole("button", { name: "Explore read-only demo" });
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(
    page.getByRole("button", { name: "Waking read-only demo…" }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/incidents/${accountTakeoverId}$`));
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await expect(page.getByText("Read-only demo", { exact: true })).toBeVisible();
  await expect(page.getByText("Read-only demo access.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark in review" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add note" })).toHaveCount(0);

  const detailResponse = await page.request.get(
    `${e2eEnvironment.apiUrl}/api/incidents/${accountTakeoverId}`,
    { headers: { Authorization: `Bearer ${demoToken}` } },
  );
  expect(detailResponse.status()).toBe(200);
  const detail = (await detailResponse.json()) as IncidentDetail;
  expect(detail.fused_score).toBe(89);

  const deniedMutation = await page.request.patch(
    `${e2eEnvironment.apiUrl}/api/incidents/${accountTakeoverId}`,
    {
      headers: {
        Authorization: `Bearer ${demoToken}`,
        "Idempotency-Key": "public-demo-browser-denial",
      },
      data: {
        status: "in_review",
        expected_updated_at: detail.updated_at,
      },
    },
  );
  expect(deniedMutation.status()).toBe(403);
  expect((await deniedMutation.json()) as unknown).toEqual({
    detail: "Read-only demo access cannot modify data",
  });
  expect(
    (
      await page.request.get(`${e2eEnvironment.apiUrl}/api/system/integrity`, {
        headers: { Authorization: `Bearer ${demoToken}` },
      })
    ).status(),
  ).toBe(403);

  await page.evaluate(() => {
    window.history.pushState({}, "", "/system-health");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { name: "Operational overview" })).toBeVisible();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.goto(`/incidents/${accountTakeoverId}`);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Explore read-only demo" }).click();
  await expect(page).toHaveURL(new RegExp(`/incidents/${accountTakeoverId}$`));
  audit.assertClean();
  audit.stop();
});
