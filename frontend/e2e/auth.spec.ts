import { expect, test } from "@playwright/test";

import { apiLogin, loginThroughUi, navigateWithinAuthenticatedApp } from "./support/api";
import {
  assertNoCredentialPersistence,
  beginBrowserAudit,
} from "./support/browser-audit";
import { e2eEnvironment } from "./support/environment";

test.describe("authenticated product journeys", () => {
  test("analyst login, route protection, role navigation, logout, and refresh semantics", async ({
    page,
  }) => {
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "analyst", "/incidents?severity=critical");
    await expect(page.getByRole("link", { name: "System Health" })).toHaveCount(0);
    await expect(page.getByText("Analyst", { exact: true })).toBeVisible();
    await assertNoCredentialPersistence(page);

    await navigateWithinAuthenticatedApp(page, "/system-health");
    await expect(page).toHaveURL(/\/overview$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Operational overview" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to the workspace" }),
    ).toBeVisible();

    await loginThroughUi(page, "analyst");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await assertNoCredentialPersistence(page);
    audit.assertClean();
    audit.stop();
  });

  test("administrator receives operational navigation and controls", async ({ page }) => {
    const audit = beginBrowserAudit(page);
    await loginThroughUi(page, "admin");
    await expect(page.getByRole("link", { name: "System Health" })).toBeVisible();
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Simulator" }).click();
    await expect(
      page.getByRole("button", { name: "Restore exact baseline" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /Run scenario|Replay idempotently/ }).first(),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    audit.assertClean();
    audit.stop();
  });

  test("skip navigation, route focus, and session-expiry notice remain accessible", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Focused accessibility semantics run once");
    await loginThroughUi(page, "analyst");

    const overviewHeading = page.getByRole("heading", {
      level: 1,
      name: "Operational overview",
    });
    await expect(overviewHeading).toBeFocused();

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await skipLink.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.getByRole("link", { name: "Incidents", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Incident queue" }),
    ).toBeFocused();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.route("**/api/auth/login", async (route) => {
      const response = await route.fetch();
      const payload = (await response.json()) as Record<string, unknown>;
      await route.fulfill({ response, json: { ...payload, expires_in: 2 } });
    });
    await loginThroughUi(page, "analyst", "/incidents", {
      expectPageHeading: false,
    });
    await expect(page).toHaveURL(/\/login$/, { timeout: 5_000 });
    const expiryNotice = page.getByRole("alert");
    await expect(expiryNotice).toContainText(
      "Your session expired. Sign in again to return to your work.",
    );
    await expect(expiryNotice.getByRole("button", { name: "Dismiss" })).toBeVisible();
    await assertNoCredentialPersistence(page);
  });

  test("incorrect credentials receive a bounded authentication error", async ({
    page,
  }, testInfo) => {
    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(`incorrect-${testInfo.project.name}@riskweave.demo`);
    await page.getByLabel("Password").fill("synthetic-invalid-password");
    await page.getByRole("button", { name: "Continue securely" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "The email or password is incorrect.",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rate-limited login is surfaced without exposing backend details", async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== "chromium",
      "One real limiter exercise is sufficient for the matrix",
    );
    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(
        `rate-limit-${e2eEnvironment.runId}-${testInfo.retry.toString()}@riskweave.demo`,
      );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.getByLabel("Password").fill("synthetic-invalid-password");
      await page.getByRole("button", { name: "Continue securely" }).click();
      await expect(page.getByRole("alert")).toContainText("incorrect");
    }
    await page.getByLabel("Password").fill("synthetic-invalid-password");
    await page.getByRole("button", { name: "Continue securely" }).click();
    await expect(page.getByRole("alert")).toContainText("Too many attempts");
  });

  test("backend-unavailable login state remains recoverable and safe", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Controlled failure states run once in Chromium",
    );
    await page.route("**/api/auth/login", (route) => route.abort("connectionfailed"));
    await page.goto("/login");
    const credential = e2eEnvironment.credentials("analyst");
    await page.getByLabel("Email address").fill(credential.email);
    await page.getByLabel("Password").fill(credential.password);
    await page.getByRole("button", { name: "Continue securely" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "The authentication service is unavailable.",
    );
    await assertNoCredentialPersistence(page);
  });

  test("invalid or expired session responses clear memory auth and redirect safely", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Controlled 401 semantics run once in Chromium",
    );
    await loginThroughUi(page, "analyst");
    await page.route("**/api/incidents**", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Invalid or expired access token" }),
      }),
    );
    await page.goto("/incidents");
    await expect(page).toHaveURL(/\/login$/);
    await assertNoCredentialPersistence(page);

    const invalid = await page.request.get(`${e2eEnvironment.apiUrl}/api/auth/me`, {
      headers: { Authorization: "Bearer definitely-not-a-valid-token" },
    });
    expect(invalid.status()).toBe(401);
  });

  test("server-side analyst authorization denies admin-only scenario mutation", async ({
    page,
  }) => {
    const analystToken = await apiLogin(page.request, "analyst");
    const denied = await page.request.post(
      `${e2eEnvironment.apiUrl}/api/scenarios/normal_activity/run`,
      { headers: { Authorization: `Bearer ${analystToken}` } },
    );
    expect(denied.status()).toBe(403);
    await loginThroughUi(page, "analyst", "/simulator");
    await expect(page.getByText("Read-only analyst view.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Run scenario|Replay idempotently/ }).first(),
    ).toBeDisabled();
  });
});
