import { vi } from "vitest";

import type {
  AuthenticatedUser,
  BenchmarkMethodMetrics,
  BenchmarkOperatingPoint,
  BenchmarkSummary,
  CustomerContext,
  DashboardSummary,
  DashboardTrends,
  IncidentDetail,
  IncidentListResponse,
  QuantumAssets,
  QuantumSummary,
  ScenarioCatalog,
} from "../types/api";

export const analystUser: AuthenticatedUser = {
  user_id: "11111111-1111-5111-8111-111111111111",
  email: "analyst@riskweave.demo",
  display_name: "Demo Analyst",
  role: "analyst",
  active: true,
  created_at: "2026-07-14T09:00:00Z",
  last_login_at: "2026-07-14T09:01:00Z",
};

export const adminUser: AuthenticatedUser = {
  ...analystUser,
  user_id: "22222222-2222-5222-8222-222222222222",
  email: "admin@riskweave.demo",
  display_name: "Demo Administrator",
  role: "admin",
};

export const incidentDetail: IncidentDetail = {
  incident_id: "33333333-3333-5333-8333-333333333333",
  incident_reference: "INC-••••-33333333",
  scenario_key: "account_takeover",
  cyber_score: 78,
  transaction_score: 79,
  correlation_bonus: 18,
  raw_fused_score: "88.65",
  fused_score: 89,
  severity: "critical",
  status: "open",
  recommended_action: "hold_and_open_critical_incident",
  summary: "Cross-domain account-takeover evidence justified a critical intervention.",
  signal_narrative: [],
  decision_explanation:
    "Cyber and transaction evidence converged with documented interactions.",
  action_explanation: "Hold the synthetic transaction and open a critical incident.",
  engine_version: "riskweave-rules-v1",
  model_version: "riskweave-iforest-v1",
  created_at: "2026-07-14T09:30:00Z",
  updated_at: "2026-07-14T09:30:00Z",
  customer: {
    customer_id: "44444444-4444-5444-8444-444444444444",
    customer_reference: "CUS-••••-44444444",
    display_name: "Aarav Mehta",
    home_city: "Pune",
    home_country: "IN",
    risk_segment: "standard",
  },
  account: {
    account_id: "55555555-5555-5555-8555-555555555555",
    account_reference: "ACC-••••-55555555",
    account_type: "savings",
    status: "active",
    currency: "INR",
  },
  session: {
    session_id: "66666666-6666-5666-8666-666666666666",
    device_id: "77777777-7777-5777-8777-777777777777",
    masked_ip_address: "198.51.xxx.xxx",
    city: "Delhi",
    country: "IN",
    started_at: "2026-07-14T09:00:00Z",
    ended_at: null,
    status: "active",
  },
  transaction: {
    transaction_id: "88888888-8888-5888-8888-888888888888",
    beneficiary_id: "99999999-9999-5999-8999-999999999999",
    beneficiary_display_name: "Northline Services",
    channel_id: "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa",
    amount_minor: 8950000,
    currency: "INR",
    created_at: "2026-07-14T09:30:00Z",
    status: "held",
    destination_risk: "high",
  },
  crypto_readiness: {
    channel_id: "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa",
    channel_code: "web_banking",
    channel_display_name: "Web banking",
    crypto_asset_id: "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb",
    asset_name: "Web session key exchange",
    priority_score: 86,
    priority_level: "urgent",
    pqc_ready: false,
    migration_status: "planned",
    reasons: ["Long-lived sensitive banking data uses a legacy public-key algorithm."],
    fraud_risk_separation_notice:
      "Quantum readiness is separate from fraud-risk scoring.",
  },
  timeline: [
    {
      occurred_at: "2026-07-14T09:01:00Z",
      item_type: "cyber_event",
      code: "mfa_failed",
      label: "MFA failed",
      description: "A synthetic MFA failure was observed.",
      source_id: "cccccccc-cccc-5ccc-8ccc-cccccccccccc",
    },
    {
      occurred_at: "2026-07-14T09:30:00Z",
      item_type: "transaction",
      code: "transaction_initiated",
      label: "Transaction initiated",
      description: "A synthetic transaction entered the held state.",
      source_id: "88888888-8888-5888-8888-888888888888",
    },
    {
      occurred_at: "2026-07-14T09:30:00Z",
      item_type: "incident",
      code: "contextual_decision",
      label: "Contextual decision recorded",
      description: "A critical decision was persisted.",
      source_id: "33333333-3333-5333-8333-333333333333",
    },
  ],
  cyber_contributions: [
    {
      contribution_id: "d1111111-1111-5111-8111-111111111111",
      category: "cyber_rule",
      code: "CYBER_MFA_FAILED",
      label: "Failed MFA",
      points: 18,
      explanation: "The session included a failed MFA challenge.",
      source_event_id: "cccccccc-cccc-5ccc-8ccc-cccccccccccc",
      source_transaction_id: null,
      source_baseline_id: null,
      display_order: 1,
    },
  ],
  transaction_contributions: [
    {
      contribution_id: "d2222222-2222-5222-8222-222222222222",
      category: "transaction_rule",
      code: "TX_NEW_BENEFICIARY",
      label: "New beneficiary",
      points: 20,
      explanation: "The beneficiary is absent from the customer baseline.",
      source_event_id: null,
      source_transaction_id: "88888888-8888-5888-8888-888888888888",
      source_baseline_id: null,
      display_order: 2,
    },
  ],
  interaction_contributions: [
    {
      contribution_id: "d3333333-3333-5333-8333-333333333333",
      category: "correlation",
      code: "CORR_MFA_AMOUNT",
      label: "Failed MFA and high amount",
      points: 8,
      explanation:
        "A failed MFA preceded an unusually high transfer in the matched session.",
      source_event_id: "cccccccc-cccc-5ccc-8ccc-cccccccccccc",
      source_transaction_id: "88888888-8888-5888-8888-888888888888",
      source_baseline_id: null,
      display_order: 3,
    },
  ],
  analyst_actions: [],
  available_actions: [
    "add_note",
    "start_review",
    "mark_confirmed_fraud",
    "mark_legitimate",
    "simulate_release",
    "simulate_decline",
  ],
};

export const incidentList: IncidentListResponse = {
  items: [
    {
      ...incidentDetail,
      customer_id: incidentDetail.customer.customer_id,
      customer_reference: incidentDetail.customer.customer_reference,
      customer_display_name: incidentDetail.customer.display_name,
      account_id: incidentDetail.account.account_id,
      account_reference: incidentDetail.account.account_reference,
      transaction_id: incidentDetail.transaction.transaction_id,
      transaction_status: incidentDetail.transaction.status,
      amount_minor: incidentDetail.transaction.amount_minor,
      currency: "INR",
    },
  ],
  pagination: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
};

export const customerContext: CustomerContext = {
  customer_id: incidentDetail.customer.customer_id,
  customer_reference: incidentDetail.customer.customer_reference,
  display_name: incidentDetail.customer.display_name,
  home_city: "Pune",
  home_country: "IN",
  risk_segment: "standard",
  created_at: "2026-06-01T09:00:00Z",
  behavioural_baseline: {
    baseline_id: "eeeeeeee-eeee-5eee-8eee-eeeeeeeeeeee",
    sample_started_at: "2026-06-30T09:00:00Z",
    sample_ended_at: "2026-07-14T09:00:00Z",
    typical_login_start_hour: 8,
    typical_login_end_hour: 20,
    usual_cities: ["Pune"],
    known_channels: ["web_banking"],
    normal_transaction_median_minor: 180000,
    transaction_amount_mad_minor: 40000,
    average_daily_transaction_count: "2.2",
    typical_beneficiary_age_days: "180",
    typical_transaction_velocity_30m: "1.1",
    usual_destination_risks: ["low"],
    model_version: "baseline-v1",
  },
  accounts: [],
  familiar_locations: ["Pune"],
  linked_incidents: [],
  trusted_devices: [
    {
      device_id: incidentDetail.session.device_id,
      device_reference: "DEV-••••-77777777",
      device_type: "mobile",
      operating_system: "Android",
      trusted: true,
      posture: "trusted",
      first_seen_at: "2026-06-10T09:00:00Z",
      last_seen_at: "2026-07-14T08:00:00Z",
    },
  ],
  recent_sessions: [
    {
      session_id: incidentDetail.session.session_id,
      masked_ip_address: "203.0.xxx.xxx",
      city: "Pune",
      country: "IN",
      started_at: "2026-07-13T09:00:00Z",
      status: "ended",
    },
  ],
  recent_beneficiaries: [
    {
      beneficiary_id: "ffffffff-ffff-5fff-8fff-ffffffffffff",
      beneficiary_reference: "BEN-••••-FFFFFFFF",
      display_name: "Metro Utilities",
      created_at: "2026-03-01T09:00:00Z",
      risk_level: "low",
    },
  ],
  recent_transactions: [
    {
      transaction_id: "12121212-1212-5212-8212-121212121212",
      amount_minor: 175000,
      currency: "INR",
      created_at: "2026-07-13T09:00:00Z",
      status: "permitted",
      destination_risk: "low",
    },
  ],
};

export const dashboardSummary: DashboardSummary = {
  visible_incidents: 18,
  incidents_by_severity: { low: 5, guarded: 4, elevated: 3, high: 2, critical: 4 },
  open_incidents: 12,
  in_review_incidents: 2,
  transactions_held: 6,
  legitimate_unusual_activity_permitted: 1,
  confirmed_fraud_cases: 2,
  source_systems: [
    {
      source: "Cyber telemetry",
      status: "healthy",
      record_count: 188,
      detail: "Deterministic cyber events loaded.",
    },
    {
      source: "Transactions",
      status: "healthy",
      record_count: 240,
      detail: "Synthetic transactions loaded.",
    },
  ],
  synthetic_data_notice: "All values are deterministic synthetic prototype data.",
};

export const dashboardTrends: DashboardTrends = {
  window_start: "2026-07-01",
  window_end: "2026-07-14",
  synthetic_data_notice: dashboardSummary.synthetic_data_notice,
  points: Array.from({ length: 14 }, (_, index) => ({
    day: `2026-07-${String(index + 1).padStart(2, "0")}`,
    incident_volume: index % 3,
    severity_distribution: {
      low: 1,
      guarded: 0,
      elevated: 0,
      high: 0,
      critical: index % 5 === 0 ? 1 : 0,
    },
    average_cyber_score: "32.00",
    average_transaction_score: "28.00",
    average_fused_score: "31.00",
    transaction_actions: {
      permitted: 4,
      held: index % 4 === 0 ? 1 : 0,
      released: 0,
      declined: 0,
      pending: 0,
      cancelled: 0,
    },
  })),
};

export const scenarioCatalog: ScenarioCatalog = {
  synthetic_data_notice:
    "All showcase scenarios operate only on deterministic synthetic data.",
  items: [
    {
      scenario_key: "normal_activity",
      title: "Normal activity",
      purpose: "Low-risk permitted transaction from familiar context.",
      status: "not_run",
      simulation_epoch: "2026-07-14T09:00:00Z",
      started_at: "2026-07-14T09:00:00Z",
      completed_at: null,
      result_incident_id: null,
      important_signals: ["Known device", "Typical amount"],
      expected_outcome: {
        cyber_score: 10,
        transaction_score: 10,
        correlation_bonus: 0,
        raw_fused_score: "9.00",
        fused_score: 9,
        severity: "low",
        recommended_action: "allow",
        transaction_status: "permitted",
      },
    },
    {
      scenario_key: "legitimate_new_device",
      title: "Legitimate new device",
      purpose: "Guarded monitoring without a hold or step-up requirement.",
      status: "not_run",
      simulation_epoch: "2026-07-14T09:00:00Z",
      started_at: "2026-07-14T09:00:00Z",
      completed_at: null,
      result_incident_id: null,
      important_signals: ["New device", "Successful verification"],
      expected_outcome: {
        cyber_score: 40,
        transaction_score: 10,
        correlation_bonus: 0,
        raw_fused_score: "22.50",
        fused_score: 23,
        severity: "guarded",
        recommended_action: "allow_and_monitor",
        transaction_status: "permitted",
      },
    },
    {
      scenario_key: "account_takeover",
      title: "Account takeover",
      purpose: "Cross-domain evidence leading to a critical held transaction.",
      status: "completed",
      simulation_epoch: "2026-07-14T09:00:00Z",
      started_at: "2026-07-14T09:00:00Z",
      completed_at: "2026-07-14T09:30:00Z",
      result_incident_id: incidentDetail.incident_id,
      important_signals: ["Failed MFA", "New beneficiary", "Velocity spike"],
      expected_outcome: {
        cyber_score: 78,
        transaction_score: 79,
        correlation_bonus: 18,
        raw_fused_score: "88.65",
        fused_score: 89,
        severity: "critical",
        recommended_action: "hold_and_open_critical_incident",
        transaction_status: "held",
      },
    },
  ],
};

export const quantumAssets: QuantumAssets = {
  synthetic_data_notice: "Synthetic cryptographic inventory.",
  active_attack_detection_disclaimer:
    "This service does not detect active quantum attacks.",
  items: [
    {
      crypto_asset_id: "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb",
      name: "Web session key exchange",
      algorithm_family: "rsa",
      data_sensitivity: "critical",
      confidentiality_years: 12,
      pqc_ready: false,
      migration_status: "planned",
      readiness_priority_score: 86,
      readiness_priority_level: "urgent",
      migration_priority_reasons: [
        "Long confidentiality lifetime and legacy public-key algorithm.",
      ],
      assessed_at: "2026-07-14T09:00:00Z",
      linked_channels: [
        {
          channel_id: "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa",
          channel_code: "web_banking",
          display_name: "Web banking",
          active: true,
        },
      ],
      fraud_risk_separation_notice:
        "Quantum readiness is separate from fraud-risk scoring.",
    },
  ],
};
export const quantumSummary: QuantumSummary = {
  total_assets: 1,
  linked_transaction_channels: 1,
  pqc_ready_assets: 0,
  migration_status_counts: { planned: 1 },
  readiness_priority_counts: { low: 0, medium: 0, high: 0, urgent: 1 },
  highest_priority_assets: quantumAssets.items,
  fraud_risk_separation_notice:
    quantumAssets.items[0]?.fraud_risk_separation_notice ?? "",
  active_attack_detection_disclaimer: quantumAssets.active_attack_detection_disclaimer,
};

const metrics: BenchmarkMethodMetrics = {
  true_positives: 10,
  false_positives: 2,
  true_negatives: 28,
  false_negatives: 8,
  precision: "0.8333",
  recall: "0.5556",
  f1: "0.6667",
  decisions: { permitted: 12, monitored: 8, stepped_up: 10, held: 18 },
};
function point(threshold: number, label: string): BenchmarkOperatingPoint {
  return {
    threshold,
    label,
    positive_definition: `Score at or above ${String(threshold)} is positive.`,
    isolated_cyber_rule_score: metrics,
    isolated_transaction_rule_score: metrics,
    fused_hybrid_contextual_score: metrics,
  };
}
export const benchmarkSummary: BenchmarkSummary = {
  fixture_version: "benchmark-v1",
  benchmark_name: "benchmark-v1 — mixed synthetic security benchmark",
  total_cases: 48,
  label_distribution: { legitimate: 30, attack: 18 },
  comparator_definitions: {
    isolated_cyber_rule_score: "Cyber rules evaluated without transaction context.",
    isolated_transaction_rule_score: "Transaction rules evaluated without cyber context.",
    fused_hybrid_contextual_score: "Backend fused score with eligible interactions.",
  },
  operating_points: {
    escalation_40: point(40, "40+ escalation or step-up threshold"),
    intervention_60: point(60, "60+ operational hold/intervention threshold"),
    critical_80: point(80, "80+ critical-only threshold"),
  },
  cohorts: {
    normal_legitimate: {
      case_count: 7,
      label_distribution: { legitimate: 7, attack: 0 },
      operating_points: { intervention_60: point(60, "60+") },
    },
    cross_domain_attacks: {
      case_count: 11,
      label_distribution: { legitimate: 0, attack: 11 },
      operating_points: { intervention_60: point(60, "60+") },
    },
  },
  limitations: [
    "It contains no legitimate cases with unusual evidence in both domains.",
    "The isolated and fused score scales are not calibrated identically.",
    "The fused method underperforms isolated methods at 60+ on the complete mixed fixture.",
  ],
  context_aware_scenario_statement:
    "RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.",
  disclaimer:
    "Prototype evaluation on deterministic synthetic data only; no real-world accuracy claim is made.",
};

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "test-request",
      ...headers,
    },
  });
}

export function installApiMock(
  options: {
    role?: "analyst" | "admin";
    loginFails?: boolean;
    loginStatus?: 429 | 500 | 503;
    loginNetworkFailure?: boolean;
    actionConflict?: boolean;
    actionIdempotent?: boolean;
    dashboardFails?: boolean;
    incidentsEmpty?: boolean;
    incidentPages?: number;
    incidentNotFound?: boolean;
    scenarioReplay?: boolean;
  } = {},
) {
  const user = options.role === "admin" ? adminUser : analystUser;
  const mock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      await Promise.resolve();
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      const method = init?.method ?? "GET";
      if (url.pathname === "/health")
        return response({ status: "ok", service: "RiskWeave API", version: "0.5.0" });
      if (url.pathname === "/ready")
        return response({
          status: "ready",
          service: "RiskWeave API",
          checks: { database: "reachable", migrations: "current" },
          revision: "0003_intelligence_support",
        });
      if (url.pathname === "/api/auth/login") {
        if (options.loginNetworkFailure === true)
          throw new TypeError("synthetic network failure");
        if (options.loginStatus !== undefined)
          return response(
            {
              detail:
                options.loginStatus === 503
                  ? "Authentication is not configured"
                  : "Authentication request rejected",
            },
            options.loginStatus,
            options.loginStatus === 429 ? { "Retry-After": "30" } : {},
          );
        return options.loginFails === true
          ? response({ detail: "Invalid email or password" }, 401)
          : response({
              access_token: "test-token",
              token_type: "bearer",
              expires_in: 900,
              user,
            });
      }
      if (url.pathname === "/api/auth/me") return response(user);
      if (url.pathname === "/api/dashboard/summary")
        return options.dashboardFails === true
          ? response({ detail: "Synthetic aggregate failure" }, 500)
          : response(dashboardSummary);
      if (url.pathname === "/api/dashboard/trends") return response(dashboardTrends);
      if (url.pathname === "/api/incidents") {
        if (options.incidentsEmpty === true)
          return response({
            items: [],
            pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
          });
        const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
        return response({
          ...incidentList,
          pagination: {
            ...incidentList.pagination,
            page,
            total_items:
              options.incidentPages === undefined
                ? incidentList.pagination.total_items
                : options.incidentPages * incidentList.pagination.page_size,
            total_pages: options.incidentPages ?? incidentList.pagination.total_pages,
          },
        });
      }
      if (
        url.pathname === `/api/incidents/${incidentDetail.incident_id}` &&
        method === "GET"
      )
        return options.incidentNotFound === true
          ? response({ detail: "Incident not found" }, 404)
          : response(incidentDetail);
      if (
        url.pathname === `/api/incidents/${incidentDetail.incident_id}` &&
        method === "PATCH"
      )
        return options.actionConflict === true
          ? response(
              { detail: "incident changed after the supplied concurrency token" },
              409,
            )
          : response({
              incident_id: incidentDetail.incident_id,
              status: "in_review",
              transaction_status: "held",
              updated_at: "2026-07-14T09:31:00Z",
              recorded_action: {
                analyst_action_id: "abababab-abab-5bab-8bab-abababababab",
                analyst_id: user.user_id,
                analyst_display_name: user.display_name,
                action_type: "start_review",
                note: null,
                previous_incident_status: "open",
                new_incident_status: "in_review",
                previous_transaction_status: "held",
                new_transaction_status: "held",
                created_at: "2026-07-14T09:31:00Z",
              },
              idempotent_replay: options.actionIdempotent === true,
            });
      if (url.pathname.endsWith("/actions"))
        return response({
          incident_id: incidentDetail.incident_id,
          status: "open",
          transaction_status: "held",
          updated_at: "2026-07-14T09:31:00Z",
          recorded_action: {
            analyst_action_id: "cdcdcdcd-cdcd-5dcd-8dcd-cdcdcdcdcdcd",
            analyst_id: user.user_id,
            analyst_display_name: user.display_name,
            action_type: "add_note",
            note: "Reviewed evidence",
            previous_incident_status: "open",
            new_incident_status: "open",
            previous_transaction_status: "held",
            new_transaction_status: "held",
            created_at: "2026-07-14T09:31:00Z",
          },
          idempotent_replay: false,
        });
      if (url.pathname === `/api/customers/${incidentDetail.customer.customer_id}`)
        return response(customerContext);
      if (url.pathname === "/api/scenarios") return response(scenarioCatalog);
      if (url.pathname.startsWith("/api/scenarios/") && url.pathname.endsWith("/run"))
        return response({
          scenario_key: "legitimate_new_device",
          incident_id: incidentDetail.incident_id,
          ...scenarioCatalog.items[1]?.expected_outcome,
          idempotent: options.scenarioReplay === true,
        });
      if (url.pathname === "/api/scenarios/reset")
        return response({
          dataset_version: "riskweave-demo-v1",
          counts: { incidents: 15 },
          fingerprint: "fixed-fingerprint",
          elapsed_seconds: 0.4,
          exact_baseline_restored: true,
        });
      if (url.pathname === "/api/quantum/assets") return response(quantumAssets);
      if (url.pathname === "/api/quantum/summary") return response(quantumSummary);
      if (url.pathname === "/api/benchmark/summary") return response(benchmarkSummary);
      return response({ detail: `Unhandled test route ${method} ${url.pathname}` }, 404);
    },
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}
