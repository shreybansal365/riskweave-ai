import { expect, type Page, type Response } from "@playwright/test";

import { e2eEnvironment } from "./environment";

export interface BrowserAudit {
  assertClean(): void;
  stop(): void;
}

const ALLOWED_ORIGINS = new Set([
  new URL(e2eEnvironment.appUrl).origin,
  new URL(e2eEnvironment.apiUrl).origin,
]);

const TEST_SECRETS = [
  e2eEnvironment.credentials("admin").password,
  e2eEnvironment.credentials("analyst").password,
];

export function beginBrowserAudit(
  page: Page,
  options: { allowedStatuses?: readonly number[] } = {},
): BrowserAudit {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const failedResponses: string[] = [];
  const externalRequests: string[] = [];
  const secretLeaks: string[] = [];
  const allowed = new Set(options.allowedStatuses ?? []);

  const onConsole = (message: { type(): string; text(): string }) => {
    if (TEST_SECRETS.some((secret) => message.text().includes(secret))) {
      secretLeaks.push("test credential appeared in a browser console message");
    }
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onRequestFailed = (request: {
    method(): string;
    url(): string;
    failure(): { errorText: string } | null;
  }) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (
      reason.includes("ERR_ABORTED") ||
      reason.includes("NS_BINDING_ABORTED") ||
      reason === "cancelled" ||
      reason.includes("request cancelled")
    ) {
      return;
    }
    requestFailures.push(`${request.method()} ${request.url()} (${reason})`);
  };
  const onResponse = (response: Response) => {
    const status = response.status();
    if (status >= 400 && !allowed.has(status)) {
      failedResponses.push(
        `${status.toString()} ${response.request().method()} ${response.url()}`,
      );
    }
  };
  const onRequest = (request: { url(): string }) => {
    const requestUrl = request.url();
    if (
      TEST_SECRETS.some(
        (secret) =>
          requestUrl.includes(secret) || requestUrl.includes(encodeURIComponent(secret)),
      )
    ) {
      secretLeaks.push("test credential appeared in a request URL");
    }
    const url = new URL(requestUrl);
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (!ALLOWED_ORIGINS.has(url.origin)) externalRequests.push(request.url());
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  page.on("request", onRequest);

  return {
    assertClean() {
      expect(consoleErrors, "unexpected browser console errors").toEqual([]);
      expect(pageErrors, "uncaught browser errors").toEqual([]);
      expect(requestFailures, "unexpected failed browser requests").toEqual([]);
      expect(failedResponses, "unexpected HTTP error responses").toEqual([]);
      expect(externalRequests, "unexpected third-party browser requests").toEqual([]);
      expect(
        secretLeaks,
        "test credentials must not leak into browser logs or URLs",
      ).toEqual([]);
    },
    stop() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
      page.off("request", onRequest);
    },
  };
}

export async function assertNoCredentialPersistence(page: Page) {
  const state = await page.evaluate((testSecrets) => {
    const renderedHtml = document.documentElement.outerHTML;
    const resourceUrls = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name);
    return {
      localStorage: Object.fromEntries(Object.entries(window.localStorage)),
      sessionStorage: Object.fromEntries(Object.entries(window.sessionStorage)),
      renderedCredential: testSecrets.some((secret) => renderedHtml.includes(secret)),
      credentialInResourceUrl: resourceUrls.some((url) =>
        testSecrets.some(
          (secret) => url.includes(secret) || url.includes(encodeURIComponent(secret)),
        ),
      ),
    };
  }, TEST_SECRETS);
  expect(state.localStorage).toEqual({});
  expect(state.sessionStorage).toEqual({});
  expect(state.renderedCredential).toBe(false);
  expect(state.credentialInResourceUrl).toBe(false);
}
