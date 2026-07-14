# RiskWeave AI — Data Schema

## Global rules

- PostgreSQL is the only runtime database.
- Seeded and scenario-generated identifiers use `uuid5(NAMESPACE_URL, "https://riskweave.ai/demo/v1/{entity_type}/{stable_key}")`.
- User-created runtime records may use UUIDv4 identifiers.
- All persisted timestamps are timezone-aware UTC values.
- Money is stored in integer minor units and displayed as INR for the prototype.
- Raw events remain separate from derived incidents and risk contributions.
- Scores are integer values from 0–100; correlation bonus is 0–18.
- Database changes use Alembic migrations.
- JSON attributes are accepted only after validation by event-specific Pydantic schemas.

## Identity and access

### User

- `user_id`
- `email` — unique, normalized
- `display_name`
- `password_hash` — Argon2id; never a plaintext password
- `role` — `UserRole`
- `active`
- `created_at`
- `last_login_at`

Roles:

- `analyst`
- `admin`

## Banking and behaviour entities

### Customer

- `customer_id`
- `display_name`
- `home_city`
- `home_country`
- `risk_segment` — `RiskSegment`
- `created_at`

### Account

- `account_id`
- `customer_id`
- `account_type` — `AccountType`
- `currency` — fixed to `INR` for seeded data
- `status` — `AccountStatus`
- `typical_transaction_min_minor`
- `typical_transaction_max_minor`
- `average_daily_transaction_count`
- `created_at`

### BehaviourBaseline

- `baseline_id`
- `customer_id`
- `sample_started_at`
- `sample_ended_at`
- `typical_login_start_hour`
- `typical_login_end_hour`
- `usual_cities`
- `known_channels`
- `median_transaction_amount_minor`
- `transaction_amount_mad_minor`
- `average_daily_transaction_count`
- `typical_beneficiary_age_days`
- `model_version`
- `updated_at`

The baseline is derived only from deterministic synthetic historical sessions and transactions. The raw historical rows remain available for reproducibility.

### Device

- `device_id`
- `customer_id`
- `fingerprint`
- `device_type` — `DeviceType`
- `operating_system`
- `trusted`
- `posture` — `DevicePosture`
- `first_seen_at`
- `last_seen_at`

### Session

- `session_id`
- `customer_id`
- `account_id`
- `device_id`
- `ip_address`
- `city`
- `country`
- `started_at`
- `ended_at`
- `status` — `SessionStatus`

### CyberEvent

- `cyber_event_id`
- `session_id`
- `customer_id`
- `account_id`
- `device_id`
- `event_type` — `CyberEventType`
- `event_time`
- `severity` — `EventSeverity`
- `attributes` — validated event-specific JSON

Supported event types:

- `login_success`
- `login_failed`
- `mfa_success`
- `mfa_failed`
- `new_device`
- `risky_ip`
- `proxy_detected`
- `unusual_location`
- `impossible_travel`
- `unusual_login_time`
- `endpoint_alert`
- `session_token_anomaly`

### Beneficiary

- `beneficiary_id`
- `customer_id`
- `display_name`
- `bank_code`
- `created_at`
- `risk_level` — `RiskLevel`

### CryptoAsset

- `crypto_asset_id`
- `name`
- `algorithm_family` — `AlgorithmFamily`
- `data_sensitivity` — `DataSensitivity`
- `confidentiality_years`
- `pqc_ready`
- `migration_status` — `MigrationStatus`
- `priority_score`
- `priority_level` — `QuantumPriority`
- `assessment_reason`
- `assessed_at`

### TransactionChannel

- `channel_id`
- `channel_code` — `TransactionChannelCode`
- `display_name`
- `crypto_asset_id`
- `active`

The channel-to-asset relationship is used only for quantum-readiness context. It is not an input to fraud-risk scoring.

### Transaction

- `transaction_id`
- `session_id`
- `customer_id`
- `account_id`
- `beneficiary_id`
- `channel_id`
- `amount_minor`
- `currency`
- `created_at`
- `status` — `TransactionStatus`
- `destination_risk` — `RiskLevel`

## Risk and investigation entities

### Incident

- `incident_id`
- `customer_id`
- `account_id`
- `session_id`
- `transaction_id`
- `scenario_key` — nullable `ScenarioKey`
- `cyber_score`
- `transaction_score`
- `correlation_bonus`
- `fused_score`
- `severity` — `Severity`
- `recommended_action` — `RecommendedAction`
- `status` — `IncidentStatus`
- `created_at`
- `updated_at`

All stored scores are final backend values. The frontend does not persist or submit calculated scores.

### RiskContribution

- `contribution_id`
- `incident_id`
- `category` — `ContributionCategory`
- `code`
- `label`
- `points`
- `explanation`
- `source_event_id` — nullable
- `display_order`

Categories:

- `cyber_rule`
- `cyber_anomaly`
- `transaction_rule`
- `transaction_anomaly`
- `correlation`

An anomaly contribution is always 0–10 for its stream. Explanations describe a feature deviation and never expose a model probability or unexplained confidence score.

### AnalystAction

- `analyst_action_id`
- `incident_id`
- `analyst_id`
- `action_type` — `AnalystActionType`
- `note` — nullable plain text
- `previous_incident_status`
- `new_incident_status`
- `previous_transaction_status`
- `new_transaction_status`
- `created_at`

### ScenarioRun

- `scenario_run_id`
- `scenario_key` — `ScenarioKey`
- `status` — `ScenarioRunStatus`
- `seed`
- `simulation_epoch`
- `run_fingerprint`
- `result_incident_id` — nullable
- `started_at`
- `completed_at`

Only one logical result exists per showcase scenario. Re-running a scenario replaces its prior scenario-owned records atomically and produces the same identifiers and scores.

### AuditEvent

- `audit_event_id`
- `actor_user_id` — nullable for system actions
- `event_type` — `AuditEventType`
- `entity_type`
- `entity_id`
- `request_id`
- `details` — validated, non-secret JSON
- `created_at`

Audit events are append-oriented. The application exposes no update or delete operation for them,
and PostgreSQL rejects update, delete, and truncate operations on the audit table.

## Complete enum catalogue

### UserRole

- `analyst`
- `admin`

### RiskSegment

- `standard`
- `heightened`

### AccountType

- `savings`
- `current`

### AccountStatus

- `active`
- `restricted`
- `closed`

### DeviceType

- `desktop`
- `mobile`
- `tablet`

### DevicePosture

- `trusted`
- `unknown`
- `compromised`

### SessionStatus

- `active`
- `ended`
- `revoked`

### CyberEventType

- `login_success`
- `login_failed`
- `mfa_success`
- `mfa_failed`
- `new_device`
- `risky_ip`
- `proxy_detected`
- `unusual_location`
- `impossible_travel`
- `unusual_login_time`
- `endpoint_alert`
- `session_token_anomaly`

### EventSeverity

- `informational`
- `low`
- `medium`
- `high`
- `critical`

### RiskLevel

- `low`
- `medium`
- `high`

### TransactionChannelCode

- `web_banking`
- `mobile_banking`

### TransactionStatus

- `pending`
- `permitted`
- `held`
- `released`
- `declined`
- `cancelled`

### IncidentStatus

- `open`
- `in_review`
- `confirmed_fraud`
- `legitimate`
- `closed`

### Severity

- `low`
- `guarded`
- `elevated`
- `high`
- `critical`

### RecommendedAction

- `allow`
- `allow_and_monitor`
- `step_up_authentication`
- `hold_for_review`
- `hold_and_open_critical_incident`

### ContributionCategory

- `cyber_rule`
- `cyber_anomaly`
- `transaction_rule`
- `transaction_anomaly`
- `correlation`

### AnalystActionType

- `add_note`
- `start_review`
- `mark_confirmed_fraud`
- `mark_legitimate`
- `simulate_hold`
- `simulate_release`
- `simulate_decline`
- `close_incident`

### ScenarioKey

- `normal_activity`
- `legitimate_new_device`
- `account_takeover`

### ScenarioRunStatus

- `not_run`
- `running`
- `completed`
- `failed`

### AlgorithmFamily

- `rsa`
- `ecc`
- `symmetric`
- `ml_kem`
- `ml_dsa`
- `hybrid`
- `other`

### DataSensitivity

- `low`
- `moderate`
- `high`
- `critical`

### MigrationStatus

- `not_assessed`
- `planned`
- `in_progress`
- `pqc_ready`

### QuantumPriority

- `low`
- `medium`
- `high`
- `urgent`

### AuditEventType

- `authentication_succeeded`
- `authentication_failed`
- `authorization_denied`
- `incident_created`
- `score_generated`
- `recommendation_generated`
- `analyst_action_recorded`
- `scenario_started`
- `scenario_completed`
- `scenario_failed`
- `scenario_reset`

## Integrity constraints and indexes

- `User.email` is unique.
- Session customer/account/device relationships must agree with their parent entities.
- Cyber-event customer/account/session identifiers must agree before persistence.
- Transaction customer/account/session identifiers must agree before persistence.
- Amounts, counts, and confidentiality years are non-negative.
- `ended_at` cannot precede `started_at`.
- Score and priority fields use database check constraints.
- Scenario key and deterministic identifiers are unique within the seeded dataset.
- Index incident severity, status, created time, customer, and transaction.
- Index cyber events by session and event time.
- Index transactions by account and created time.
- Index audit events by entity and created time.

## Timeline projection

The investigation timeline is a server-side ordered projection over:

- cyber events;
- beneficiary creation;
- transaction initiation and status changes;
- incident creation;
- analyst actions.

Ordering uses event timestamp followed by a stable event-type and identifier tie-breaker.

## Benchmark fixtures

The 48 labeled benchmark cases are versioned fixtures under `data/benchmark/`; they are not copied real-world records. The benchmark evaluator returns calculated results without persisting hard-coded performance metrics.

## Synthetic baseline manifest

Atomic reset restores exactly:

- 12 customers;
- 12 accounts;
- 16 devices;
- 180 background transactions;
- 240 background cyber events;
- 15 background incidents;
- three scenario definitions with `not_run` state;
- deterministic analyst/admin demo users;
- deterministic behaviour baselines and channel-linked crypto assets.

After all showcase scenarios run, the incident queue contains 18 visible records.
