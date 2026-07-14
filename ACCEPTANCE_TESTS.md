# RiskWeave AI — Acceptance Tests

## Specification invariants

- [ ] Every document that states a read order uses the canonical order from `AGENTS.md`.
- [ ] Every document uses PostgreSQL as the only runtime database.
- [ ] Every document uses the same formula, thresholds, scenario keys, and enum values.
- [ ] No document says the frontend calculates risk scores.
- [ ] No document describes quantum readiness as active attack detection.

## Setup and repository

- [ ] Fresh clone works.
- [ ] `.env.example` is complete.
- [ ] `.gitignore` excludes `.env`, `.DS_Store`, generated files, and local secrets.
- [ ] `docker compose up --build` starts frontend, API, and PostgreSQL.
- [ ] No SQLite runtime path or SQLite-specific migration exists.
- [ ] Seed and reset work deterministically.

## Database and migrations

- [ ] Alembic creates every entity and enum in `DATA_SCHEMA.md`.
- [ ] Analyst and admin users are persisted with password hashes.
- [ ] Audit events are append-oriented through application APIs.
- [ ] Transaction channels reference crypto assets.
- [ ] Database constraints reject invalid scores, bonuses, amounts, and relationship mismatches.
- [ ] Migrations run against local and Supabase PostgreSQL.

## Backend and API

- [ ] `/health` succeeds without requiring the database.
- [ ] `/ready` verifies database connectivity and migration readiness.
- [ ] Invalid payloads return safe 4xx responses.
- [ ] Risk calculations are server-side.
- [ ] Incident detail returns the ordered timeline and all explanations.
- [ ] Analyst actions persist and create audit events.
- [ ] Admin-only endpoints enforce server-side authorization.
- [ ] Dashboard and benchmark endpoints return calculated database/service values.
- [ ] Incident pagination includes stable metadata and deterministic tie-breaking.
- [ ] Incident filters cover severity, status, scenario, date range, and bounded safe search fields.
- [ ] Incident detail reconciles stored scores, contributions, chronology, analyst history, and
  channel-linked crypto readiness.
- [ ] Invalid incident transitions and stale concurrency tokens return `409`.
- [ ] Replayed incident actions with the same idempotency key create one logical action.
- [ ] Customer and account context responses are bounded and mask display identifiers.
- [ ] Dashboard summary and each 14-day trend point reconcile to persisted source records.
- [ ] Scenario run and reset APIs are admin-only and preserve existing deterministic services.
- [ ] Quantum readiness is explained from asset fields and never changes fraud risk.
- [ ] Benchmark summary retains all three operating points, six cohorts, exact unfavorable results,
  comparator definitions, and limitations.
- [ ] OpenAPI generation succeeds for every Milestone 4 endpoint.

## Fusion and rounding

- [ ] Formula is `0.45 × cyber + 0.45 × transaction + correlation_bonus`.
- [ ] Cyber and transaction streams clamp to 0–100.
- [ ] Correlation bonus clamps to 0–18.
- [ ] Fused value clamps to 0–100 before rounding.
- [ ] Backend rounds half-up exactly once.
- [ ] Frontend contains no independent risk formula or scoring constants.
- [ ] Cyber 40, transaction 10, bonus 0 produces raw fused score 22.5 and backend half-up rounded fused score 23.
- [ ] Cyber 78, transaction 79, bonus 18 produces fused score 89.

## Rule and anomaly engines

- [ ] Rules remain independently testable and are the primary point source.
- [ ] Isolation Forest training data is deterministic and synthetic.
- [ ] Isolation Forest uses the locked random seed.
- [ ] Anomaly contribution is 0–10 per individual stream.
- [ ] Anomaly output alone cannot trigger step-up authentication or a hold.
- [ ] Same fixtures and lockfiles produce the same anomaly contribution.
- [ ] Every anomaly explanation names an understandable feature deviation.
- [ ] No API or UI exposes an unexplained AI probability or confidence score.

## Showcase scenarios

- [ ] Normal scenario produces cyber 10, transaction 10, bonus 0, fused 9, low severity, and a permitted transaction.
- [ ] Scenario B produces cyber 40, transaction 10, bonus 0, raw fused 22.5, and rounded fused 23.
- [ ] Scenario B severity is guarded.
- [ ] Scenario B action is `allow_and_monitor`.
- [ ] Scenario B transaction is permitted.
- [ ] Scenario B has no hold and no step-up authentication.
- [ ] Account takeover produces cyber 78, transaction 79, bonus 18, and fused 89.
- [ ] Account takeover severity is critical.
- [ ] Account takeover transaction is held and a critical incident is opened.
- [ ] Every contribution has code, label, points, explanation, category, and stable order.

## Correlation

- [ ] Eligible events satisfy `transaction_time - 30 minutes <= event_time <= transaction_time`.
- [ ] Correct customer, account, and session matches are required.
- [ ] Device match is checked when present.
- [ ] Events immediately at both inclusive window boundaries are included.
- [ ] Future events are excluded.
- [ ] Events one unit outside the window are excluded.
- [ ] Mismatched customer, account, or session events are excluded.
- [ ] Bonuses require every named signal.
- [ ] Bonuses are awarded only for documented, genuinely satisfied cross-domain interaction rules and never to reach a preferred outcome.
- [ ] Weaker overlapping bonuses are suppressed and total bonus never exceeds 18.
- [ ] Timeline order and tie-breaking are deterministic.

## Background data, scenario state, and reset

- [ ] Baseline manifest contains the exact counts in `DATA_SCHEMA.md`.
- [ ] Reset leaves 15 background incidents and three `not_run` scenarios.
- [ ] Running all scenarios results in exactly 18 visible records.
- [ ] Showcase records are visually and structurally distinguishable from background incidents.
- [ ] Running a scenario twice produces one logical scenario result with the same identifiers and scores.
- [ ] Reset is atomic and completes within 5 seconds locally.
- [ ] A forced reset failure rolls back without partial state.

## Synthetic benchmark

- [ ] The fixed fixture is identified as `benchmark-v1 — mixed synthetic security benchmark`.
- [ ] Benchmark contains exactly 48 fixed labeled cases in the approved class distribution.
- [ ] The comparators are labeled `isolated cyber rule score`, `isolated transaction rule score`, and `fused hybrid contextual score`.
- [ ] All comparators use the same cases and labels while their input and calibration differences are disclosed.
- [ ] Benchmark outputs are calculated from engine results, not hard-coded.
- [ ] Benchmark labels and fixtures are not constructed or altered to guarantee that the fused method wins.
- [ ] 40+ escalation, 60+ operational intervention, and 80+ critical-only results are reported separately.
- [ ] 60+ is primary only when describing transaction holds or operational intervention.
- [ ] Confusion-matrix counts reconcile to 48 for every comparator and operating point.
- [ ] Derived precision, recall, and F1 match the counts where defined.
- [ ] Cohort reporting includes normal legitimate, legitimate unusual cyber, legitimate unusual transaction, cross-domain attack, cyber-only attack, and transaction-only attack cases.
- [ ] The complete mixed-fixture 60+ result retains fused TP 6, FP 0, TN 30, FN 12 without retuning.
- [ ] Benchmark limitations disclose absent legitimate cross-domain hard negatives, seven single-domain attacks, score-scale mismatch, and no established universal false-positive reduction.
- [ ] Same seed and fixtures produce identical results.
- [ ] Every benchmark API and UI surface labels results as prototype outcomes on synthetic data.
- [ ] Documentation makes no real-world accuracy or false-positive guarantee.
- [ ] `benchmark-v2` is documented as a prospective, separately versioned future item and is not created in Milestone 5.

## Frontend

- [ ] Login uses `/api/auth/login` followed by `/api/auth/me` and keeps JWT state in memory only.
- [ ] Protected routes redirect unauthenticated users to login and preserve the intended path.
- [ ] Analyst navigation does not expose administrator-only controls or the system-health route.
- [ ] A 401 or token expiry clears auth state and cached server data.
- [ ] Overview uses API data from the 14-day baseline.
- [ ] Overview metrics have defined operational meaning.
- [ ] Incident filters work.
- [ ] Incident links open the correct direct case URL.
- [ ] Cyber, transaction, correlation, and fused values are shown.
- [ ] All values match the backend exactly.
- [ ] All scenarios run with visible progress and final state.
- [ ] Scenario B visibly shows guarded, permitted, and monitored with no hold.
- [ ] Loading, empty, success, and error states exist.
- [ ] Incident workflow controls come from backend-returned valid actions and handle stale `409` conflicts.
- [ ] Scenario expected outcomes and important signals come from the API rather than duplicated browser logic.
- [ ] Quantum-readiness and benchmark screens retain all required disclaimers and exact bounded language.
- [ ] No placeholders, debug UI, or hard-coded product metrics remain.

## Authentication and security

- [ ] Protected endpoints require authentication.
- [ ] Analyst and admin permissions differ as specified.
- [ ] Passwords use Argon2id hashes.
- [ ] Short-lived access tokens are not stored in `localStorage`.
- [ ] No secrets or demo plaintext passwords are committed.
- [ ] CORS uses an explicit allowlist.
- [ ] Notes are bounded plain text and render safely.
- [ ] Production errors hide stack traces and secrets.
- [ ] Authentication, score generation, recommendations, analyst actions, scenario events, and reset create audit records.

## Quantum readiness

- [ ] Every seeded transaction channel references a crypto asset.
- [ ] Readiness priority is explainable from the asset fields.
- [ ] Quantum values never modify cyber, transaction, correlation, or fused scores.
- [ ] No UI, API, or documentation claims active quantum-attack detection.

## UI quality and accessibility

- [ ] No generic AI-dashboard styling.
- [ ] No meaningless charts or unsupported metrics.
- [ ] Consistent spacing, typography, alignment, and density.
- [ ] Severity uses text, iconography where helpful, and colour.
- [ ] Visible keyboard focus and correct dialog focus management.
- [ ] Automated accessibility checks find no serious violations on core screens.
- [ ] Works at 1440×900 and 1280×720 without clipped primary actions.
- [ ] Account-takeover and Scenario B screenshots are presentation-ready.

## Milestone 6 composed-product verification

- [ ] Milestone 5 checkpoint commit exists before browser-hardening changes.
- [ ] Chromium completes all applicable analyst, admin, failure-injection, accessibility, responsive,
  consistency, performance, and scenario journeys.
- [ ] Firefox and WebKit complete all applicable core product journeys using pinned Playwright engines.
- [ ] Test setup verifies both roles and restores the deterministic showcase dataset without
  test-order dependence.
- [ ] Authentication tests cover memory-only JWT behavior, refresh, logout, bad credentials,
  throttling, invalid/expired session, backend unavailable, `401`, and `403`.
- [ ] Overview totals and 14-day trend points reconcile with authenticated API responses.
- [ ] Queue pagination, sorting, search, filters, URL state, keyboard activation, and return-state
  preservation use server behavior.
- [ ] Both showcase investigations render exact backend scores, contributions, statuses, timelines,
  context, and recommendations.
- [ ] Analyst actions, notes, duplicate prevention, audit history, and two-context stale `409` behavior
  pass through the rendered workflow.
- [ ] All three scenarios display exact authoritative outcomes; replay is idempotent and reset restores
  the exact fingerprint.
- [ ] Quantum and benchmark values reconcile to APIs and retain required separation, disclaimers,
  unfavorable results, limitations, and bounded language.
- [ ] System health reports real frontend, API, database, migration, and source state with a recoverable
  degraded path.
- [ ] No business-critical displayed value exists only as a frontend constant.
- [ ] Required axe surfaces have no serious or critical violations.
- [ ] Required keyboard focus, dialog focus restoration, reduced-motion, and text-plus-color semantics
  pass.
- [ ] Required screens remain usable at 1440×900, 1280×720, and 1024×768.
- [ ] Unexpected console errors, uncaught exceptions, failed HTTP/network requests, secret leakage, and
  third-party calls fail the suite.
- [ ] Nine top-aligned, fully loaded 1440×900 visual-review baselines exist.
- [ ] Chromium E2E is integrated into CI without removing existing gates; failure artifacts upload only
  on failure.
- [ ] Browser matrix, test identities, reset behavior, artifacts, responsive results, accessibility,
  visual baselines, and acceptance evidence are documented.

## Documentation

- [ ] README covers problem, solution, setup, demo, architecture, risk model, benchmark, security, synthetic data, and limitations.
- [ ] Public wording says `Built and maintained by Shrey Bansal.`
- [ ] FinSpark’26 is acknowledged.
- [ ] Benchmark and anomaly claims use qualified prototype language.
- [ ] Quantum terminology follows `SECURITY.md`.

## Deployment

- [ ] Frontend and backend deploy.
- [ ] Supabase PostgreSQL migrations and seeds run.
- [ ] All three scenarios and reset work in deployment.
- [ ] Benchmark summary works in deployment.
- [ ] Free-tier wake-up and database-pausing behavior are documented.
- [ ] Local Docker fallback remains functional.

## Demo

- [ ] Reset works before recording.
- [ ] Demo completes in under 4 minutes.
- [ ] All URLs and direct incident links work.
- [ ] No private tokens or credentials appear.
- [ ] The attack narrative is clear without narration.
- [ ] Scenario B clearly demonstrates proportionate monitoring without intervention.
- [ ] Synthetic-data and prototype limitations are visible where results are presented.
