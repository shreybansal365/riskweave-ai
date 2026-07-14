import { apiRequest, createIdempotencyKey } from "../lib/api-client";
import type {
  AnalystActionType,
  AuthenticatedUser,
  BenchmarkSummary,
  CustomerContext,
  DashboardSummary,
  DashboardTrends,
  HealthResponse,
  IncidentDetail,
  IncidentListResponse,
  IncidentMutationResponse,
  IncidentStatus,
  LoginResponse,
  QuantumAssets,
  QuantumSummary,
  ReadinessResponse,
  ScenarioCatalog,
  ScenarioExecution,
  ScenarioKey,
  ScenarioReset,
  SystemContext,
  SystemIntegrity,
} from "../types/api";

export interface IncidentQuery {
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "updated_at" | "severity" | "fused_score" | "status";
  sortDirection?: "asc" | "desc";
  severity?: string | undefined;
  status?: string | undefined;
  transactionStatus?: string | undefined;
  scenario?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  search?: string | undefined;
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

export const systemApi = {
  health: (signal?: AbortSignal) => apiRequest<HealthResponse>("/health", { signal }),
  readiness: (signal?: AbortSignal) =>
    apiRequest<ReadinessResponse>("/ready", { signal, acceptedStatuses: [200, 503] }),
  context: (token: string, signal?: AbortSignal) =>
    apiRequest<SystemContext>("/api/system/context", { token, signal }),
  integrity: (token: string, signal?: AbortSignal) =>
    apiRequest<SystemIntegrity>("/api/system/integrity", { token, signal }),
};

export const authApi = {
  login: (email: string, password: string, signal?: AbortSignal) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      signal,
    }),
  me: (token: string, signal?: AbortSignal) =>
    apiRequest<AuthenticatedUser>("/api/auth/me", { token, signal }),
};

export const dashboardApi = {
  summary: (token: string, signal?: AbortSignal) =>
    apiRequest<DashboardSummary>("/api/dashboard/summary", { token, signal }),
  trends: (token: string, signal?: AbortSignal) =>
    apiRequest<DashboardTrends>("/api/dashboard/trends", { token, signal }),
};

export const incidentsApi = {
  list: (token: string, query: IncidentQuery, signal?: AbortSignal) =>
    apiRequest<IncidentListResponse>(
      `/api/incidents${queryString({
        page: query.page,
        page_size: query.pageSize,
        sort_by: query.sortBy,
        sort_direction: query.sortDirection,
        severity: query.severity,
        status: query.status,
        transaction_status: query.transactionStatus,
        scenario: query.scenario,
        date_from: query.dateFrom,
        date_to: query.dateTo,
        search: query.search,
      })}`,
      { token, signal },
    ),
  detail: (token: string, incidentId: string, signal?: AbortSignal) =>
    apiRequest<IncidentDetail>(`/api/incidents/${incidentId}`, { token, signal }),
  patch: (
    token: string,
    incidentId: string,
    status: IncidentStatus,
    note: string | null,
    expectedUpdatedAt: string,
  ) =>
    apiRequest<IncidentMutationResponse>(`/api/incidents/${incidentId}`, {
      method: "PATCH",
      token,
      idempotencyKey: createIdempotencyKey(`incident-${incidentId}`),
      body: { status, note, expected_updated_at: expectedUpdatedAt },
    }),
  action: (
    token: string,
    incidentId: string,
    actionType: AnalystActionType,
    note: string | null,
    expectedUpdatedAt: string,
  ) =>
    apiRequest<IncidentMutationResponse>(`/api/incidents/${incidentId}/actions`, {
      method: "POST",
      token,
      idempotencyKey: createIdempotencyKey(`action-${incidentId}`),
      body: { action_type: actionType, note, expected_updated_at: expectedUpdatedAt },
    }),
  customer: (token: string, customerId: string, signal?: AbortSignal) =>
    apiRequest<CustomerContext>(`/api/customers/${customerId}`, { token, signal }),
};

export const scenariosApi = {
  catalog: (token: string, signal?: AbortSignal) =>
    apiRequest<ScenarioCatalog>("/api/scenarios", { token, signal }),
  run: (token: string, key: ScenarioKey) =>
    apiRequest<ScenarioExecution>(`/api/scenarios/${key}/run`, {
      method: "POST",
      token,
    }),
  reset: (token: string) =>
    apiRequest<ScenarioReset>("/api/scenarios/reset", { method: "POST", token }),
};

export const quantumApi = {
  assets: (token: string, signal?: AbortSignal) =>
    apiRequest<QuantumAssets>("/api/quantum/assets", { token, signal }),
  summary: (token: string, signal?: AbortSignal) =>
    apiRequest<QuantumSummary>("/api/quantum/summary", { token, signal }),
};

export const benchmarkApi = {
  summary: (token: string, signal?: AbortSignal) =>
    apiRequest<BenchmarkSummary>("/api/benchmark/summary", { token, signal }),
};
