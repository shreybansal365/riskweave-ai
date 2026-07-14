# RiskWeave AI — Security Requirements

## Security posture

RiskWeave is a synthetic-data prototype, not a production banking control. Security features must be implemented honestly and proportionately without claiming certification, compliance, or production readiness.

## Data

- synthetic data only;
- no real banking credentials;
- no real customer information;
- PostgreSQL is the only runtime database;
- secrets are supplied through environment variables;
- `.env.example` contains names and safe placeholders only;
- `.env`, local secrets, tokens, and database exports are excluded from Git;
- documentation-safe IP ranges are used in all fixtures.

## Authentication and token handling

Roles:

- `analyst`
- `admin`

Analysts can investigate, add notes, update permitted incident outcomes, and view scenario-generated incidents.

Admins can additionally run showcase scenarios, perform atomic reset, inspect system health and audit
events, and manage demo configuration. Scenario run and reset routes are both admin-only in Milestone 4.

Requirements:

- authorization is enforced server-side;
- demo passwords originate from environment variables and are persisted only as Argon2id hashes;
- access tokens are short-lived JWTs;
- frontend keeps the active access token in memory, not `localStorage`;
- no refresh token is required for the prototype;
- hard refresh may require re-authentication;
- failed login attempts are rate-limited by a bounded in-process prototype limiter;
- authentication success and failure create audit events without recording passwords or tokens.

The in-process limiter is intentionally modest and is not represented as distributed production-grade
abuse protection. A production deployment would require a shared rate-limit store and operational
monitoring.

## API security

- Pydantic request and response validation;
- event-specific discriminated validation before JSON attributes are persisted;
- ORM parameterization;
- explicit CORS allowlist;
- safe production errors;
- security headers;
- request identifiers;
- bounded pagination and filters;
- bounded plain-text analyst notes;
- server-side role checks;
- no mass-assignment of score, severity, role, or transaction-status fields;
- state-changing operations use explicit action schemas.
- incident mutations require a bounded idempotency key, lock the incident and transaction rows, and
  may validate an `expected_updated_at` concurrency token;
- invalid workflow transitions return a conflict rather than silently mutating state.

## Score and model integrity

- risk calculations occur only in `risk_engine` on the backend;
- clients cannot submit or override calculated scores;
- formula, thresholds, rule weights, model seed, and model version are configuration-controlled and tested;
- Isolation Forest uses deterministic synthetic training data and a fixed seed;
- anomaly contribution is capped at 10 points per stream;
- anomaly output alone cannot cause step-up authentication or a hold;
- explanations name observable deviations and never expose opaque probability or confidence values;
- generated scores, recommendations, and model/rule versions are audited.

## Correlation integrity

- correlation requires matching customer, account, and session identifiers;
- device matching is enforced when present;
- only the inclusive approved 30-minute window is eligible;
- future, mismatched, and out-of-window events are excluded;
- overlapping correlation bonuses are de-duplicated and globally capped at 18;
- a bonus requires a documented, genuinely satisfied cross-domain interaction rule and is never introduced or adjusted to reach a preferred outcome;
- all negative boundary and mismatch cases are tested.

## Auditability

Append-oriented audit events record:

- authentication success and failure;
- authorization denial;
- incident creation;
- score and recommendation generation;
- analyst action;
- scenario start, completion, and failure;
- atomic reset.

The application exposes no API for updating or deleting audit events. PostgreSQL also rejects update,
delete, and truncate operations on the audit table. Audit details must exclude secrets and raw tokens.

## Scenario and reset safety

- scenario runs are idempotent;
- scenario-owned records use deterministic identifiers;
- atomic reset executes in one database transaction;
- a reset error rolls back fully;
- reset is admin-only;
- reset never changes deployment secrets, user-supplied environment configuration, migrations, or benchmark fixtures.

## Dependency security

- pinned versions and committed lockfiles;
- CI dependency audit;
- no abandoned or unnecessary libraries;
- no paid external AI API;
- no runtime download of an unverified model;
- model training uses repository-controlled fixtures.

## Frontend security

- no unsafe HTML injection;
- no frontend secrets;
- analyst notes render as plain text;
- no access token in `localStorage`;
- no score formula or scoring constants in frontend code;
- authorization failures do not reveal restricted data;
- production builds omit debug panels and stack traces.

## Quantum-readiness boundary

Allowed language:

- quantum-exposure readiness;
- post-quantum migration priority;
- cryptographic inventory;
- harvest-now-decrypt-later exposure.

Prohibited language:

- active quantum attack detected;
- quantum attacker identified;
- guaranteed quantum-proof system.

Channel-linked crypto readiness is context only. It never changes cyber, transaction, correlation, or fused risk.

## Benchmark and claims

- `benchmark-v1 — mixed synthetic security benchmark` is deterministic and synthetic;
- results are computed from the same engine code used by the application;
- labels and fixtures are fixed independently of observed results and are never constructed or altered to guarantee that the fused method wins;
- 40+ escalation, 60+ operational intervention, and 80+ critical-only metrics are reported separately;
- the 60+ result is primary only when describing a hold or operational intervention;
- comparator inputs and score-scale differences are disclosed;
- cohort and limitation reporting accompanies aggregate results;
- all benchmark output is labeled as prototype evaluation on synthetic data;
- do not claim real-world accuracy, zero false positives, guaranteed fraud prevention, or quantified banking loss reduction;
- do not generalize benchmark results beyond the fixed fixture set.

Approved performance wording:

> RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.

## Threat model

Assets:

- incident and synthetic event data;
- analyst decisions;
- risk rules and model configuration;
- scenario and benchmark fixtures;
- authentication secrets;
- audit trail.

Threats:

- unauthorized access;
- broken role authorization;
- score or fixture tampering;
- injection;
- secret or token exposure;
- dependency compromise;
- reset abuse;
- inconsistent or misleading outputs;
- unsupported security or model claims.

## Required limitations statement

Documentation must state that synthetic data is used, scoring and benchmark results are demonstrative, and any production deployment would require representative-data validation, model governance, security review, regulatory review, monitoring, operational controls, and integration testing.
