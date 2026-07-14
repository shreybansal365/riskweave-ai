import {
  expect,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";

import type {
  BenchmarkSummary,
  DashboardSummary,
  DashboardTrends,
  IncidentDetail,
  IncidentListResponse,
  LoginResponse,
  QuantumAssets,
  QuantumSummary,
  ScenarioExecution,
  ScenarioKey,
  ScenarioReset,
  SystemContext,
  SystemIntegrity,
} from "../../src/types/api";
import { e2eEnvironment, type DemoRole } from "./environment";

export interface ShowcaseState {
  reset: ScenarioReset;
  scenarios: Record<ScenarioKey, ScenarioExecution>;
}

async function checkedJson<T>(response: APIResponse) {
  if (!response.ok()) {
    throw new Error(
      `API setup request ${response.url()} failed with ${response.status().toString()}`,
    );
  }
  return (await response.json()) as T;
}

export async function apiLogin(
  request: APIRequestContext,
  role: DemoRole,
): Promise<string> {
  const credential = e2eEnvironment.credentials(role);
  const response = await request.post(`${e2eEnvironment.apiUrl}/api/auth/login`, {
    data: credential,
  });
  const payload = await checkedJson<LoginResponse>(response);
  return payload.access_token;
}

export async function resetDataset(
  request: APIRequestContext,
  adminToken?: string,
): Promise<ScenarioReset> {
  const token = adminToken ?? (await apiLogin(request, "admin"));
  const response = await request.post(`${e2eEnvironment.apiUrl}/api/scenarios/reset`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return checkedJson<ScenarioReset>(response);
}

export async function prepareShowcaseDataset(
  request: APIRequestContext,
): Promise<ShowcaseState> {
  const token = await apiLogin(request, "admin");
  const reset = await resetDataset(request, token);
  const scenarios = {} as Record<ScenarioKey, ScenarioExecution>;
  for (const key of [
    "normal_activity",
    "legitimate_new_device",
    "account_takeover",
  ] as const) {
    const response = await request.post(
      `${e2eEnvironment.apiUrl}/api/scenarios/${key}/run`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    scenarios[key] = await checkedJson<ScenarioExecution>(response);
  }
  return { reset, scenarios };
}

export async function apiGet<T>(
  request: APIRequestContext,
  token: string,
  path: string,
): Promise<T> {
  const response = await request.get(`${e2eEnvironment.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return checkedJson<T>(response);
}

export const getDashboardSummary = (request: APIRequestContext, token: string) =>
  apiGet<DashboardSummary>(request, token, "/api/dashboard/summary");

export const getDashboardTrends = (request: APIRequestContext, token: string) =>
  apiGet<DashboardTrends>(request, token, "/api/dashboard/trends");

export const getIncidents = (
  request: APIRequestContext,
  token: string,
  query = "?page=1&page_size=20&sort_by=created_at&sort_direction=desc",
) => apiGet<IncidentListResponse>(request, token, `/api/incidents${query}`);

export const getIncident = (
  request: APIRequestContext,
  token: string,
  incidentId: string,
) => apiGet<IncidentDetail>(request, token, `/api/incidents/${incidentId}`);

export const getQuantumAssets = (request: APIRequestContext, token: string) =>
  apiGet<QuantumAssets>(request, token, "/api/quantum/assets");

export const getQuantumSummary = (request: APIRequestContext, token: string) =>
  apiGet<QuantumSummary>(request, token, "/api/quantum/summary");

export const getBenchmarkSummary = (request: APIRequestContext, token: string) =>
  apiGet<BenchmarkSummary>(request, token, "/api/benchmark/summary");

export const getSystemIntegrity = (request: APIRequestContext, token: string) =>
  apiGet<SystemIntegrity>(request, token, "/api/system/integrity");

export const getSystemContext = (request: APIRequestContext, token: string) =>
  apiGet<SystemContext>(request, token, "/api/system/context");

export async function loginThroughUi(
  page: Page,
  role: DemoRole,
  targetPath = "/overview",
  options: { expectPageHeading?: boolean } = {},
) {
  if (targetPath !== "/overview") await page.goto(targetPath);
  else await page.goto("/login");
  await page.getByLabel("Email address").fill(e2eEnvironment.credentials(role).email);
  await page.getByLabel("Password").fill(e2eEnvironment.credentials(role).password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(page).toHaveURL(new URL(targetPath, e2eEnvironment.appUrl).toString());
  if (options.expectPageHeading !== false)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function navigateWithinAuthenticatedApp(page: Page, path: string) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
