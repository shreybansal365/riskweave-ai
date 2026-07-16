# RiskWeave AI — Acceptance Tests

> This document defines the normative acceptance contract. Verified release completion and evidence
> are recorded in `docs/FINAL_RELEASE_ACCEPTANCE.md`; unchecked boxes are not a live release-status
> dashboard.

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
- [ ] Migrations run against local and verified hosted Render PostgreSQL.

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

## Milestone 7B visual redesign and Decision Weave

- [ ] Milestone 7A is committed before redesign work begins.
- [ ] Incident detail exposes backend-authored cyber and transaction weights and weighted terms;
  frontend source contains no scoring constant or independent score calculation.
- [ ] Decision Weave distinguishes source scores, weighted terms, eligible interaction bonus, raw
  fused score, rounded score, severity, recommendation, and transaction state without false arithmetic.
- [ ] Decision Weave interaction knots use backend-authored persisted contribution IDs, rule codes,
  and event/transaction references to pair genuine cyber and transaction evidence; the frontend owns
  no fraud-rule pairing table.
- [ ] Decision Weave has a plain-language alternative and meaningful DOM order at 1440, 1280, and
  1024 px.
- [ ] Decision Context answers what happened, how risky it is, why, transaction treatment, and the
  next valid analyst action in the investigation first fold.
- [ ] Scenario B emphasizes mitigating context, zero interaction bonus, Guarded, Allow and monitor,
  Permitted, no hold, and no step-up; no frontend-only workflow action is introduced.
- [ ] Incident Queue displays amount/currency, cyber score, transaction score, bonus, fused score,
  severity, transaction status, recommendation, and case status.
- [ ] Incident Queue transaction-status filtering is API-backed, typed, URL-persistent, and tested.
- [ ] Transaction-action visualization and its accessible summary include every backend category,
  including Cancelled, and reconcile exactly to the total.
- [ ] System Health and shell use an authenticated backend integrity/context projection for truthful
  environment, simulation, dataset, scenario, benchmark, migration, reset, and audit context.
- [ ] No secret, credential, token, connection string, or sensitive environment value appears in the
  integrity/context response or frontend.
- [ ] Operational text is at least 14 px, secondary metadata at least 12 px, and 11 px text is limited
  to nonessential monospace identifiers.
- [ ] The Simulator reads as a progressive three-state decision story rather than a pricing-card grid.
- [ ] Quantum migration priority uses distinct terminology and presentation and remains separate from
  fraud risk.
- [ ] Evaluation leads with the bounded statement, retains unfavorable 60+ results, and keeps the
  unequal-calibration limitation adjacent to compact comparator views.
- [ ] Skip navigation, route titles, route-heading focus, dialog/mutation focus, session-expiry
  announcement, and unsaved-note protection work.
- [ ] Production-CSS contrast, 200% zoom, reduced motion, keyboard access, table overflow, and
  viewport-bounded dialogs pass.
- [ ] Milestone 7B visual baselines cover all nine required screens at 1440×900, 1280×720, and
  1024×768 without incomplete shells, errors, clipping, false arithmetic, or contradictory context.
- [ ] Milestone 6 baselines remain unchanged as historical evidence.

## Milestone 7B.1 brand lock and login route focus

- [ ] Milestone 7B is committed before brand-lock work begins.
- [ ] Concept A is recreated as maintainable SVG artwork rather than an embedded concept-sheet PNG.
- [ ] Light and dark horizontal lockups, standalone icon, favicon, and app-icon variants exist.
- [ ] Every public wordmark reads exactly `RiskWeave AI`; `AI` is teal and the same visual cap height.
- [ ] Login, desktop shell, compact shell, favicon, and metadata use the approved brand assets.
- [ ] Icon-only and decorative Brand variants expose the correct accessible semantics.
- [ ] The optional tagline is not globally repeated in the application workspace.
- [ ] Obsolete branch-merger logo classes and references are absent.
- [ ] Direct and reloaded login routes focus the hero heading for announcement without a visible
  rectangle, outline, or box shadow.
- [ ] Interactive controls retain a clear keyboard focus indicator after the route-focus correction.
- [ ] Skip navigation, destination-heading focus, route titles, and axe checks continue to pass.
- [ ] Milestone 7B.1 visual evidence contains the three login states, two shell viewports, both
  lockups, and the small-size preview without overwriting Milestone 7B.

## Milestone 7B.1.1 dark brand, favicon, and repository scope

- [ ] The approved light Concept A geometry and colour treatment remain visually unchanged.
- [ ] Light and dark full-size lockups use identical Concept A path geometry.
- [ ] The dark decision path and solid endpoint use inverse slate `#98A4B3` against application
  background `#08111F`, with measured WCAG contrast of at least 4.5:1.
- [ ] The dark mark contains no halo, translucent backing stroke, keyline, or outlined target-like
  endpoint.
- [ ] Exported horizontal SVG wordmarks use deterministic vector outlines, retain an accessible
  `RiskWeave AI` title, and embed no font file.
- [ ] Document metadata declares SVG, 32×32 PNG, 16×16 PNG, ICO, Apple touch, and web-manifest icon
  fallbacks; every declared asset responds successfully.
- [ ] A cache-busted real Chrome or Brave tab displays the Concept A favicon rather than a generic
  globe or default framework icon.
- [ ] Direct-entry and reloaded login states remain clean while semantic route focus, skip
  navigation, and visible interactive focus remain intact.
- [ ] `frontend/public/` contains only reviewed production brand, favicon, manifest, and metadata
  assets, with no generated previews, caches, or hidden system files.
- [ ] Milestone 7B.1.1 evidence is isolated under its own directory and does not overwrite earlier
  visual baselines.

## Milestone 7B.1.2 original Concept A geometry fidelity

- [ ] The original cropped Concept A artwork controls full-size mark geometry; the previous compact
  production mark controls neither amplitude nor crossover placement.
- [ ] The original-versus-previous diagnosis and previous path data are preserved before replacement.
- [ ] React, light-lockup, dark-lockup, and standalone full-size assets use the same eight path strings,
  endpoint coordinates, 16-unit stroke width, and `700×240` geometric source.
- [ ] The corrected mark materially restores the reference's tall cyber descent, separate upper cyber
  arc, broad amber rise, first crossover, lower weave, decision tail, and large solid endpoint.
- [ ] The public application lockup remains horizontal and the outlined `RiskWeave AI` wordmark remains
  unchanged.
- [ ] Light full-size geometry uses cyan `#1F9E9D`, amber `#DF9417`, and navy `#0B1A2D`.
- [ ] Dark full-size geometry differs only through inverse decision colour `#98A4B3`; its 7.47:1
  contrast, solid endpoint, and no-halo treatment remain intact.
- [ ] Favicon declarations, fallbacks, manifest, MIME handling, and cache-busted real-browser activation
  remain unchanged and valid.
- [ ] Route-heading semantic focus, clean direct/reload rendering, skip navigation, visible interactive
  focus, and axe results do not regress.
- [ ] Milestone 7B.1.2 evidence contains original/corrected, previous/corrected, overlay, both lockups,
  login, two shell sizes, favicon preview, and direct/reload comparisons without overwriting earlier
  evidence.

## Documentation

- [ ] README covers problem, solution, setup, demo, architecture, risk model, benchmark, security, synthetic data, and limitations.
- [ ] Public wording says `Built and maintained by Shrey Bansal.`
- [ ] FinSpark’26 is acknowledged.
- [ ] Benchmark and anomaly claims use qualified prototype language.
- [ ] Quantum terminology follows `SECURITY.md`.

## Deployment

- [ ] Frontend and backend deploy.
- [ ] Render PostgreSQL migrations and guarded deterministic bootstrap run.
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
