export type UserRole = "analyst" | "admin";
export type Severity = "low" | "guarded" | "elevated" | "high" | "critical";
export type IncidentStatus =
  "open" | "in_review" | "confirmed_fraud" | "legitimate" | "closed";
export type TransactionStatus =
  "pending" | "permitted" | "held" | "released" | "declined" | "cancelled";
export type RecommendedAction =
  | "allow"
  | "allow_and_monitor"
  | "step_up_authentication"
  | "hold_for_review"
  | "hold_and_open_critical_incident";
export type ScenarioKey =
  "normal_activity" | "legitimate_new_device" | "account_takeover";
export type AnalystActionType =
  | "add_note"
  | "start_review"
  | "mark_confirmed_fraud"
  | "mark_legitimate"
  | "simulate_hold"
  | "simulate_release"
  | "simulate_decline"
  | "close_incident";

export interface AuthenticatedUser {
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthenticatedUser;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  service: string;
  checks: { database: string; migrations: string };
  revision: string | null;
}

export interface SeverityCounts {
  low: number;
  guarded: number;
  elevated: number;
  high: number;
  critical: number;
}

export interface SourceHealth {
  source: string;
  status: string;
  record_count: number;
  detail: string;
}

export interface DashboardSummary {
  visible_incidents: number;
  incidents_by_severity: SeverityCounts;
  open_incidents: number;
  in_review_incidents: number;
  transactions_held: number;
  legitimate_unusual_activity_permitted: number;
  confirmed_fraud_cases: number;
  source_systems: SourceHealth[];
  synthetic_data_notice: string;
}

export interface TrendPoint {
  day: string;
  incident_volume: number;
  severity_distribution: SeverityCounts;
  average_cyber_score: string | null;
  average_transaction_score: string | null;
  average_fused_score: string | null;
  transaction_actions: Record<TransactionStatus, number>;
}

export interface DashboardTrends {
  window_start: string;
  window_end: string;
  points: TrendPoint[];
  synthetic_data_notice: string;
}

export interface IncidentScore {
  cyber_score: number;
  transaction_score: number;
  correlation_bonus: number;
  raw_fused_score: string;
  fused_score: number;
}

export interface IncidentListItem extends IncidentScore {
  incident_id: string;
  incident_reference: string;
  customer_id: string;
  customer_reference: string;
  customer_display_name: string;
  account_id: string;
  account_reference: string;
  transaction_id: string;
  scenario_key: ScenarioKey | null;
  severity: Severity;
  status: IncidentStatus;
  recommended_action: RecommendedAction;
  transaction_status: TransactionStatus;
  amount_minor: number;
  currency: "INR";
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface IncidentListResponse {
  items: IncidentListItem[];
  pagination: PaginationMeta;
}

export interface Contribution {
  contribution_id: string;
  category: string;
  code: string;
  label: string;
  points: number;
  explanation: string;
  source_event_id: string | null;
  source_transaction_id: string | null;
  source_baseline_id: string | null;
  display_order: number;
}

export interface TimelineItem {
  occurred_at: string;
  item_type:
    "cyber_event" | "beneficiary" | "transaction" | "incident" | "analyst_action";
  code: string;
  label: string;
  description: string;
  source_id: string;
}

export interface AnalystAction {
  analyst_action_id: string;
  analyst_id: string;
  analyst_display_name: string;
  action_type: AnalystActionType;
  note: string | null;
  previous_incident_status: IncidentStatus;
  new_incident_status: IncidentStatus;
  previous_transaction_status: TransactionStatus;
  new_transaction_status: TransactionStatus;
  created_at: string;
}

export interface IncidentDetail extends IncidentScore {
  incident_id: string;
  incident_reference: string;
  scenario_key: ScenarioKey | null;
  severity: Severity;
  status: IncidentStatus;
  recommended_action: RecommendedAction;
  summary: string;
  signal_narrative: Record<string, string | number>[];
  decision_explanation: string;
  action_explanation: string;
  engine_version: string;
  model_version: string;
  created_at: string;
  updated_at: string;
  customer: {
    customer_id: string;
    customer_reference: string;
    display_name: string;
    home_city: string;
    home_country: string;
    risk_segment: string;
  };
  account: {
    account_id: string;
    account_reference: string;
    account_type: string;
    status: string;
    currency: "INR";
  };
  session: {
    session_id: string;
    device_id: string;
    masked_ip_address: string;
    city: string;
    country: string;
    started_at: string;
    ended_at: string | null;
    status: string;
  };
  transaction: {
    transaction_id: string;
    beneficiary_id: string;
    beneficiary_display_name: string;
    channel_id: string;
    amount_minor: number;
    currency: "INR";
    created_at: string;
    status: TransactionStatus;
    destination_risk: string;
  };
  crypto_readiness: {
    channel_id: string;
    channel_code: string;
    channel_display_name: string;
    crypto_asset_id: string;
    asset_name: string;
    priority_score: number;
    priority_level: string;
    pqc_ready: boolean;
    migration_status: string;
    reasons: string[];
    fraud_risk_separation_notice: string;
  };
  timeline: TimelineItem[];
  cyber_contributions: Contribution[];
  transaction_contributions: Contribution[];
  interaction_contributions: Contribution[];
  analyst_actions: AnalystAction[];
  available_actions: AnalystActionType[];
}

export interface BehaviourBaseline {
  baseline_id: string;
  sample_started_at: string;
  sample_ended_at: string;
  typical_login_start_hour: number;
  typical_login_end_hour: number;
  usual_cities: string[];
  known_channels: string[];
  normal_transaction_median_minor: number;
  transaction_amount_mad_minor: number;
  average_daily_transaction_count: string;
  typical_beneficiary_age_days: string;
  typical_transaction_velocity_30m: string;
  usual_destination_risks: string[];
  model_version: string;
}

export interface CustomerContext {
  customer_id: string;
  customer_reference: string;
  display_name: string;
  home_city: string;
  home_country: string;
  risk_segment: string;
  created_at: string;
  behavioural_baseline: BehaviourBaseline;
  accounts: Record<string, unknown>[];
  trusted_devices: {
    device_id: string;
    device_reference: string;
    device_type: string;
    operating_system: string;
    trusted: boolean;
    posture: string;
    first_seen_at: string;
    last_seen_at: string;
  }[];
  familiar_locations: string[];
  recent_sessions: {
    session_id: string;
    masked_ip_address: string;
    city: string;
    country: string;
    started_at: string;
    status: string;
  }[];
  recent_beneficiaries: {
    beneficiary_id: string;
    beneficiary_reference: string;
    display_name: string;
    created_at: string;
    risk_level: string;
  }[];
  recent_transactions: {
    transaction_id: string;
    amount_minor: number;
    currency: string;
    created_at: string;
    status: TransactionStatus;
    destination_risk: string;
  }[];
  linked_incidents: Record<string, unknown>[];
}

export interface IncidentMutationResponse {
  incident_id: string;
  status: IncidentStatus;
  transaction_status: TransactionStatus;
  updated_at: string;
  recorded_action: AnalystAction;
  idempotent_replay: boolean;
}

export interface ScenarioExpectedOutcome extends IncidentScore {
  severity: Severity;
  recommended_action: RecommendedAction;
  transaction_status: TransactionStatus;
}

export interface ScenarioDefinition {
  scenario_key: ScenarioKey;
  title: string;
  purpose: string;
  status: "not_run" | "running" | "completed" | "failed";
  simulation_epoch: string;
  started_at: string;
  completed_at: string | null;
  result_incident_id: string | null;
  important_signals: string[];
  expected_outcome: ScenarioExpectedOutcome;
}

export interface ScenarioCatalog {
  items: ScenarioDefinition[];
  synthetic_data_notice: string;
}

export interface ScenarioExecution extends ScenarioExpectedOutcome {
  scenario_key: ScenarioKey;
  incident_id: string;
  idempotent: boolean;
}

export interface ScenarioReset {
  dataset_version: string;
  counts: Record<string, number>;
  fingerprint: string;
  elapsed_seconds: number;
  exact_baseline_restored: boolean;
}

export interface QuantumAsset {
  crypto_asset_id: string;
  name: string;
  algorithm_family: string;
  data_sensitivity: string;
  confidentiality_years: number;
  pqc_ready: boolean;
  migration_status: string;
  readiness_priority_score: number;
  readiness_priority_level: string;
  migration_priority_reasons: string[];
  assessed_at: string;
  linked_channels: {
    channel_id: string;
    channel_code: string;
    display_name: string;
    active: boolean;
  }[];
  fraud_risk_separation_notice: string;
}

export interface QuantumAssets {
  items: QuantumAsset[];
  synthetic_data_notice: string;
  active_attack_detection_disclaimer: string;
}

export interface QuantumSummary {
  total_assets: number;
  linked_transaction_channels: number;
  pqc_ready_assets: number;
  migration_status_counts: Record<string, number>;
  readiness_priority_counts: Record<"low" | "medium" | "high" | "urgent", number>;
  highest_priority_assets: QuantumAsset[];
  fraud_risk_separation_notice: string;
  active_attack_detection_disclaimer: string;
}

export interface BenchmarkMethodMetrics {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  precision: string | null;
  recall: string | null;
  f1: string | null;
  decisions: { permitted: number; monitored: number; stepped_up: number; held: number };
}

export interface BenchmarkOperatingPoint {
  threshold: number;
  label: string;
  positive_definition: string;
  isolated_cyber_rule_score: BenchmarkMethodMetrics;
  isolated_transaction_rule_score: BenchmarkMethodMetrics;
  fused_hybrid_contextual_score: BenchmarkMethodMetrics;
}

export interface BenchmarkSummary {
  fixture_version: string;
  benchmark_name: string;
  total_cases: number;
  label_distribution: Record<string, number>;
  comparator_definitions: Record<string, string>;
  operating_points: Record<string, BenchmarkOperatingPoint>;
  cohorts: Record<
    string,
    {
      case_count: number;
      label_distribution: Record<string, number>;
      operating_points: Record<string, BenchmarkOperatingPoint>;
    }
  >;
  limitations: string[];
  context_aware_scenario_statement: string;
  disclaimer: string;
}
