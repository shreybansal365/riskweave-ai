# Milestone 7B.2 — Repository-wide pre-7C reconciliation audit

**Audit date:** 15 July 2026
**Audited commit:** `cebaf1fab3d907f33cebf005d554bbfb27cf8371`
**Commit subject:** `feat: finalize RiskWeave brand identity`
**Working tree at audit start:** clean
**Audit mode:** read-only inspection after the checkpoint commit; this document is the only Stage 2
working-tree addition and remains uncommitted

## 1. Executive verdict

**Verdict: conditional go, with no P0 defect and three product-contract/story corrections required
before broad Milestone 7C polish.**

RiskWeave's core product is substantially coherent and unusually well verified for a prototype. The
audit reconfirmed the locked fused-risk arithmetic, all three showcase outcomes, strict correlation
eligibility, deterministic seed/reset behavior, the immutable 48-case benchmark-v1 fixture and its
unfavorable results, server-side RBAC, append-only audit enforcement, analyst concurrency controls,
backend-authoritative displayed scores, and strict separation of quantum migration priority from fraud
risk. The Docker composition is reproducible and healthy. The complete Stage 1 verification passed
before the audited checkpoint was created.

The repository is **not yet ready for an unqualified public/deployed handoff**. Nine P1 findings and
eight P2 findings remain. Three P1 findings affect the product contract or central demo story and
should be resolved in a bounded reconciliation pass before visual polish continues:

1. the Decision Weave pairs interaction sources through a frontend-owned rule-code table rather than
   an explicit backend provenance contract;
2. Scenario C persists the attack device as trusted while presenting it as a new device absent from
   customer history, creating a visible semantic contradiction;
3. canonical specifications still claim an admin audit-event inspection surface and stale endpoint
   names that do not match the implemented API.

One visible overview label also contradicts its own 14-day chart (`18 total` beside a 15-incident
window). That is a frontend composition correction suitable for the first 7C pass, but it must be
fixed before final screenshots.

Deployment and publication have separate, explicit gates: Vercel SPA deep-link configuration is
absent; the approved Render/Supabase bootstrap path is not executable as documented; no project
license exists; and the licensing basis for the outlined Avenir Next wordmark requires human
verification. These do not invalidate the local prototype, but they block a safe public release or
judge-facing cloud URL.

### Severity summary

| Severity      | Count | Meaning in this audit                                                                        |
| ------------- | ----: | -------------------------------------------------------------------------------------------- |
| P0            |     0 | No correctness, security, or usability failure that invalidates the current prototype        |
| P1            |     9 | Must be resolved before its stated gate (pre-7C, final evidence, deployment, or publication) |
| P2            |     8 | Bounded hardening/documentation work; not a current product blocker                          |
| Informational |     5 | Confirmed deliberate limitation or non-defect                                                |

### Gate decision

- **Before broad Milestone 7C work:** resolve RW-7B2-002, RW-7B2-003, and RW-7B2-004.
- **May be the first bounded tranche of Milestone 7C:** RW-7B2-001 and RW-7B2-007, plus the
  visual/documentation parts of RW-7B2-010.
- **Before cloud deployment:** resolve RW-7B2-005 and RW-7B2-006; address RW-7B2-014.
- **Before public repository publication:** resolve RW-7B2-008 and RW-7B2-009; address
  RW-7B2-015 and RW-7B2-017.
- **Before final PPT/demo capture:** all pre-7C and 7C items above, plus a verified deployed or local
  fallback path, must be complete.

## 2. Scope and method

This audit reconciled the committed application, tests, migrations, Docker composition, CI workflow,
documentation, and retained visual evidence against the authoritative read order in `AGENTS.md`.
The following sources were read completely:

- `AGENTS.md`, `PROJECT_DECISIONS.md`, `SPEC.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`,
  `UI_SYSTEM.md`, `SECURITY.md`, `DEMO_SCENARIOS.md`, `ACCEPTANCE_TESTS.md`, `DEPLOYMENT.md`, and
  `README.md`;
- `docs/API.md`, `docs/RISK_SCORING.md`, `docs/SYNTHETIC_DATA.md`, `docs/BENCHMARK.md`,
  `docs/INCIDENT_WORKFLOWS.md`, `docs/QUANTUM_READINESS.md`, `docs/DESIGN_SYSTEM.md`,
  `docs/FRONTEND_ARCHITECTURE.md`, `docs/END_TO_END_TESTING.md`, and
  `docs/SCREENSHOT_CHECKLIST.md`;
- Milestone 4, 5, 6, 7A, and 7B acceptance/audit documents plus `docs/BRAND_GUIDELINES.md`;
- all index/README/geometry notes for Milestone 6, 7B, 7B.1, 7B.1.1, and 7B.1.2 evidence.

The audit then traced the relevant frontend and backend implementations, generated OpenAPI surface,
three Alembic migrations, fixed benchmark fixture, Docker and Nginx configuration, GitHub Actions,
unit/integration/E2E tests, current database state, visual matrices, tracked-file history, ignored
artifacts, and dependency audit results. Representative 1440×900 and 1024×768 evidence was visually
inspected; the complete screenshot matrices and their capture contracts were also inventoried.

External deployment assumptions were checked against current official provider documentation:

- [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) states that Vite SPAs need
  an explicit rewrite for deep links;
- [Render's free-service documentation](https://render.com/docs/free) confirms free web-service idle
  spin-down, ephemeral filesystems, and the absence of shell/one-off-job support;
- [Render's web-service documentation](https://render.com/docs/web-services) documents the expected
  `0.0.0.0` port contract;
- [Supabase free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
  confirms the documented inactivity caveat;
- [Vercel pricing](https://vercel.com/pricing) currently retains a no-cost Hobby tier for personal,
  non-commercial work.

No implementation, configuration, existing product documentation, test, migration, fixture, or
visual evidence was changed during Stage 2.

## 3. Milestone-by-milestone reconciliation

| Milestone                     | Reconciled verdict                                         | Evidence and exceptions                                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 specifications        | Core decisions intact                                      | Formula, thresholds, synthetic-only boundary, fixed seed/epoch, benchmark qualification, and quantum separation agree. Canonical API/admin wording has drifted; see RW-7B2-004.                                                                                  |
| Milestone 1 foundation        | Intact                                                     | Strict frontend/backend tooling, PostgreSQL-only runtime, migrations, `/health`, `/ready`, Compose, CI, environment templates, and production builds remain present and passing.                                                                                 |
| Milestone 2 domain/security   | Intact                                                     | Complete domain schema, constraints, roles, Argon2id, short-lived JWTs, safe errors, request IDs, RBAC, seeded demo users, and database-enforced append-only audits are present and tested.                                                                      |
| Milestone 3 intelligence/data | Core logic intact; one narrative inconsistency             | Exact formula/rules/anomaly cap/correlation/benchmark/reset/scenario values pass. Scenario C device trust/familiarity fields conflict with its new-device explanation; see RW-7B2-003.                                                                           |
| Milestone 4 business APIs     | Substantially intact                                       | Incident, workflow, dashboard, context, scenario, quantum, benchmark, and system projections exist and are typed/tested. Canonical audit-event surface remains ambiguous; see RW-7B2-004. Concurrent scenario replay metadata has a narrow race; see RW-7B2-012. |
| Milestone 5 product UI        | Functional contract intact; one visible aggregate mismatch | Authenticated routes, role-aware navigation, API state, workflows, scenarios, quantum, health, and evaluation operate. Overview cadence attaches the all-time total to a baseline-window chart; see RW-7B2-001.                                                  |
| Milestone 6 E2E hardening     | Intact on documented matrix                                | Analyst/admin journeys, stale-state handling, API-to-render checks, axe, responsive matrices, visual evidence, and Chromium CI are retained. Clean-container Firefox repeatability needs packaging documentation; see RW-7B2-011.                                |
| Milestone 7A audit            | Retained                                                   | All original P0/P1 items have an implemented disposition. The deeper reconciliation found that P1-11's provenance claim is only partly backend-authored; see RW-7B2-002.                                                                                         |
| Milestone 7B redesign         | Visually and functionally intact                           | Decision-first hierarchy, queue, scenarios, quantum separation, evaluation qualification, responsive composition, and 27 captures remain. See RW-7B2-001/002 for two evidence-level corrections.                                                                 |
| Milestones 7B.1–7B.1.2 brand  | Frozen implementation intact                               | Corrected Concept A geometry, light/dark treatments, outlined public lockups, favicon fallbacks/manifest, route-focus correction, app integration, evidence, and tests passed. Publication rights need verification; see RW-7B2-009.                             |
| Deployment/presentation       | Deliberately incomplete                                    | Local Docker is healthy; cloud configuration, final URLs, final screenshots, PPT, and demo video are deferred. Two deployment blockers are concrete; see RW-7B2-005/006.                                                                                         |

## 4. Product and business correctness

### Confirmed intact

- The product is explicitly and consistently tied to FinSpark’26 Problem Statement 2.
- The primary product story remains account takeover followed by a fraudulent transfer.
- Cyber authentication/device/network/endpoint evidence and transaction beneficiary/amount/velocity/
  destination evidence converge through documented interactions.
- The hero investigation shows the transaction being protected, decision, reasons, evidence, context,
  and next analyst actions.
- Scenario B remains the central proportional-response example: unusual cyber context is monitored,
  but normal transaction evidence prevents an unnecessary intervention.
- Copy does not claim zero false positives, production readiness, real-world accuracy, guaranteed fraud
  prevention, compliance certification, or active quantum-attack detection.
- The Overview, queue, investigation, simulator, quantum, health, and evaluation routes tell distinct
  operational stories rather than repeating one generic dashboard layout.

### Product-story exceptions

- RW-7B2-001 causes one visible dashboard number to contradict the chart's stated time window.
- RW-7B2-002 means the hero's named source pairing is not fully server-authored.
- RW-7B2-003 weakens the attack-takeover narrative by mixing technical posture/trust with behavioral
  familiarity.

## 5. Risk-intelligence correctness

### Formula and decisions — confirmed intact

`backend/risk_engine/fusion.py` uses `Decimal("0.45")` for each stream, bounds the interaction bonus to
18, clamps to 0–100, and performs one `ROUND_HALF_UP` integer quantization before mapping the result:

```text
fused = 0.45 × cyber + 0.45 × transaction + correlation bonus
0–19  Low      Allow                              Permitted
20–39 Guarded  Allow and monitor                  Permitted
40–59 Elevated Step-up authentication             Pending
60–79 High     Hold for analyst review            Held
80–100 Critical Hold and open critical incident   Held
```

The database stores cyber, transaction, bonus, raw fused, and rounded fused values. The incident API
adds an exact `fusion_projection` with decimal string terms and rounding provenance. Production
frontend code contains no locked scenario score constants, `0.45` weighting, threshold mapping, or
score recomputation. Chart code converts server-authored daily decimal averages only for rendering;
it does not make incident decisions.

### Locked scenarios — confirmed from code and persisted database

| Scenario              | Cyber | Transaction | Bonus |   Raw | Rounded | Decision                                   | Transaction |
| --------------------- | ----: | ----------: | ----: | ----: | ------: | ------------------------------------------ | ----------- |
| Normal Activity       |    10 |          10 |     0 |  9.00 |       9 | Low / Allow                                | Permitted   |
| Legitimate New Device |    40 |          10 |     0 | 22.50 |      23 | Guarded / Allow and monitor                | Permitted   |
| Account Takeover      |    78 |          79 |    18 | 88.65 |      89 | Critical / Hold and open critical incident | Held        |

### Correlation — confirmed intact

`backend/risk_engine/correlation.py` applies the exact inclusive window
`transaction_time - 30 minutes <= event_time <= transaction_time`, requires matching customer,
account, and session, and additionally prevents a conflicting device when both sides have one. Tests
cover the lower/upper boundaries and exclude future, out-of-window, customer-mismatched,
account-mismatched, session-mismatched, device-mismatched, and unrelated evidence. Interaction rules
are awarded only when both documented component contributions exist; bonus is capped at 18.

### Anomaly support and explanations — confirmed intact

- Isolation Forest uses fixed seed `26026`, fixed generated history, 96 estimators, one job, and a
  maximum of 10 points per stream.
- It operates as an outlier gate only when named deviations exist; no raw probability or confidence
  reaches the UI.
- Rules remain the primary scoring mechanism, and anomaly output alone cannot cross a hold/step-up
  action gate.
- Explanations are deterministic templates grounded in persisted contributions.

## 6. Deterministic data and benchmark reconciliation

### Data and reset — confirmed intact

- Fixed simulation seed: `26026`.
- Fixed simulation epoch: `2026-07-14T09:00:00Z`.
- Seeded/scenario identifiers: UUIDv5 through named deterministic namespaces.
- Background window: exactly 14 UTC days preceding the epoch.
- Baseline incidents: 15.
- Incidents after all showcase scenarios: 18.
- Current audited database: 18 incidents, 12 customers, 183 transactions, 251 cyber events, and all
  three scenario-run rows complete.
- Scenario execution is transaction-bound and persistence-idempotent.
- Atomic reset validates the exact baseline manifest and fingerprint.

Background incidents are deliberately curated deterministic profiles, not claims that the engine
discovered real attacks. This limitation is disclosed and acceptable.

### benchmark-v1 — confirmed immutable and honestly reported

The fixture contains 48 unique deterministic cases: 30 legitimate and 18 labeled attacks, split into
7 normal legitimate, 13 legitimate-unusual-cyber, 10 legitimate-unusual-transaction, 11 cross-domain
attacks, 3 cyber-only attacks, and 4 transaction-only attacks.

Retained complete-fixture results:

| Operating point | Comparator                      |  TP |  FP |  TN |  FN | Precision | Recall |     F1 |
| --------------- | ------------------------------- | --: | --: | --: | --: | --------: | -----: | -----: |
| 40+             | Isolated cyber rule score       |  10 |   0 |  30 |   8 |    1.0000 | 0.5556 | 0.7143 |
| 40+             | Isolated transaction rule score |  10 |   0 |  30 |   8 |    1.0000 | 0.5556 | 0.7143 |
| 40+             | Fused hybrid contextual score   |   8 |   0 |  30 |  10 |    1.0000 | 0.4444 | 0.6154 |
| 60+             | Isolated cyber rule score       |   8 |   0 |  30 |  10 |    1.0000 | 0.4444 | 0.6154 |
| 60+             | Isolated transaction rule score |   8 |   0 |  30 |  10 |    1.0000 | 0.4444 | 0.6154 |
| 60+             | Fused hybrid contextual score   |   6 |   0 |  30 |  12 |    1.0000 | 0.3333 | 0.5000 |
| 80+             | Isolated cyber rule score       |   0 |   0 |  30 |  18 |       n/a | 0.0000 |    n/a |
| 80+             | Isolated transaction rule score |   0 |   0 |  30 |  18 |       n/a | 0.0000 |    n/a |
| 80+             | Fused hybrid contextual score   |   6 |   0 |  30 |  12 |    1.0000 | 0.3333 | 0.5000 |

The evaluation UI and API preserve the exact bounded statement, unequal-calibration warning,
synthetic-data disclaimer, all three operating points, six cohorts, seven single-domain attacks, lack
of hard legitimate cross-domain cases, and the fused method's unfavorable 60+ result. No comparator
is visually or textually presented as universally superior. benchmark-v2 remains properly deferred.

## 7. Security and workflow integrity

### Confirmed intact

- Passwords are Argon2id-hashed with explicit parameters; unknown accounts use a dummy hash path.
- Access tokens are short-lived, audience/issuer-bound HS256 JWTs with required claims and in-memory
  frontend storage. No token is stored in `localStorage` or `sessionStorage`.
- Analysts and admins are server-authorized; admin scenario/reset/integrity routes have backend role
  dependencies rather than UI-only hiding.
- Failed/successful authentication, authorization denial, analyst actions, and scenario/reset events
  are audited.
- PostgreSQL rejects update, delete, or truncate attempts against `audit_events` through a migration-
  installed trigger; an integration test exercises this.
- Request IDs are validated or replaced, returned on responses, and included in relevant audits.
- API responses have security/no-store headers and production errors do not expose stack traces.
- CORS is configuration-driven with explicit allowed origins.
- Incident transitions use row locks, a supplied `expected_updated_at` concurrency token, deterministic
  action IDs, idempotency-key conflict checks, and append-oriented action/audit history.
- Stage 1 `npm audit` and Python dependency audit found no known vulnerabilities.

### Accepted prototype limits

- The login limiter is deliberately in-process and account-keyed, not distributed or production-grade.
- Refreshing the browser intentionally requires reauthentication because tokens remain memory-only.
- Demo users and synthetic data require explicit bootstrap; no default password is shipped in the
  frontend bundle.

## 8. Frontend and API contract reconciliation

### Confirmed intact

- All required product routes exist, with auth protection, role-aware shell/navigation, route-specific
  titles, direct incident links, and not-found/error boundaries.
- Queue pagination, sort, severity/status/transaction/scenario/date/search filters are server-backed;
  URL state and return navigation are preserved.
- Incident detail includes scores, exact projection, customer/account/session/transaction context,
  chronology, contributions, explanations, action history, available actions, and channel-linked
  quantum context.
- Mutations invalidate/refetch authoritative data and handle 401/403/404/409/422/429/5xx paths.
- Simulator calls the existing backend scenario services and does not duplicate scenario arithmetic.
- Quantum and benchmark screens render server projections and retain their required disclaimers.
- System Health renders safe backend context/integrity rather than inventing environment state.
- Initial loading, background refresh, empty, error, and degraded-service states are implemented.

### Contract exceptions

- RW-7B2-001: one overview total is attached to the wrong time boundary.
- RW-7B2-002: exact interaction source pairing is owned partly by the browser.
- RW-7B2-004: canonical endpoint/admin-capability text does not match the implemented surface.

## 9. UI, accessibility, and supported viewports

### Confirmed intact

- The seven Milestone 7A P0 and 31 P1 dispositions have implementation and test evidence.
- 1440×900, 1280×720, and 1024×768 compositions exist for every principal route.
- Deliberate table overflow, responsive Decision Weave order, stacked action regions, bounded dialogs,
  and shell/navigation behavior are covered at 1024px.
- Automated axe coverage has no serious or critical violations on required routes.
- Skip navigation, destination heading focus, route titles, visible interactive focus, dialog focus,
  keyboard row activation, reduced-motion behavior, and chart text alternatives are present.
- Brand geometry/treatments are frozen, the real favicon and fallbacks are installed, and
  direct-entry/reload login focus has no visual rectangle.
- Severity and chart meaning are not color-only.

Full phone-width optimization is explicitly outside the supported viewport contract. Its absence is
not a defect in this audit.

### Visual-evidence inventory

| Directory                                |                              Approximate size | Status                                         |
| ---------------------------------------- | --------------------------------------------: | ---------------------------------------------- |
| `docs/visual-baselines/milestone-6/`     |                                      1.06 MiB | Immutable historical product baseline          |
| `docs/visual-baselines/milestone-7b/`    |                                      3.35 MiB | 27 reviewed route/viewport captures plus index |
| `docs/visual-baselines/milestone-7b1/`   |                                      0.51 MiB | Brand/focus evidence                           |
| `docs/visual-baselines/milestone-7b1-1/` |                                      0.81 MiB | Dark/favicons/browser-tab evidence             |
| `docs/visual-baselines/milestone-7b1-2/` |                                      1.22 MiB | Geometry comparison and final brand evidence   |
| **All visual baselines**                 | **6.97 MiB on disk; 7,165,453 tracked bytes** | Moderate, intentional evidence history         |

No accidental duplicate, cache, hidden-system file, generated report, or transient capture was found
in the tracked evidence. Similar login/brand images are deliberate before/after, direct/reload, or
historical comparisons and should not be deleted merely for visual similarity.

## 10. Complete finding register

### P1 findings

#### RW-7B2-001 — 14-day cadence chart displays the all-visible incident total

- **Severity:** P1
- **Affected route/file:** `/overview`; `frontend/src/pages/OverviewPage.tsx:184-196`;
  `backend/app/services/dashboard.py:100-130`
- **Status:** confirmed
- **Evidence:** the backend trend query intentionally excludes scenario incidents by selecting the
  14-day baseline window (`WINDOW_START <= created_at < SIMULATION_EPOCH`), so its points sum to 15.
  The chart's adjacent label uses `summary.data.visible_incidents`, which is 18 after showcase
  scenarios. The screenshot therefore says `14-day UTC window` and `18 total` beside a 15-incident
  series.
- **Why it matters:** it is a visible data contradiction on the first operational screen and weakens
  the product's source-backed-data claim.
- **Recommended correction:** expose or derive a server-authored trend-window incident count from the
  trend response, render that count beside the cadence chart, and retain 18 only for current visible
  cases. Add a test that the chart total equals the sum of returned points.
- **Likely scope:** small backend schema/service addition or frontend sum of already authoritative
  trend points; one component and contract/E2E test.
- **Regression risk:** low if current/all-time and windowed totals are named distinctly.
- **Timing:** may be folded into the first 7C correctness pass; must precede final screenshots.

#### RW-7B2-002 — Decision Weave interaction provenance is partly hard-coded in the frontend

- **Severity:** P1
- **Affected route/file:** both investigation routes;
  `frontend/src/components/DecisionWeave.tsx:9-30,135-177`;
  `backend/app/schemas/incidents.py:78-85`; `backend/risk_engine/correlation.py:68-92`
- **Status:** confirmed
- **Evidence:** the browser owns `interactionSourceCodes`, mapping each correlation rule to one cyber
  and transaction contribution code. The backend contribution supplies a source event ID and shared
  transaction ID, but not the paired component contribution IDs/codes. Several transaction
  contributions share the same transaction ID, so exact pairing cannot always be inferred without the
  client rule table. This is narrower than score reconstruction, but it contradicts the acceptance
  claim that each knot directly links persisted source contributions.
- **Why it matters:** a backend rule rename or new interaction can silently produce a generic/wrong
  source label while scores remain correct. The hero screen should not own fraud-rule semantics.
- **Recommended correction:** add explicit backend-authored component contribution IDs/codes (or a
  typed source-pair object) to each correlation contribution/projection; render only that projection;
  remove `interactionSourceCodes`; add contract tests for all five rules and the zero-bonus case.
- **Likely scope:** additive backend response contract/service plus frontend type/component tests; no
  scoring, weights, bonus, fixture, or migration change required if computed from persisted rows.
- **Regression risk:** medium because it touches the hero API contract; protect locked values and
  contribution order.
- **Timing:** resolve before broad 7C polish.

#### RW-7B2-003 — Scenario C mixes trusted posture with “new/untrusted device” semantics

- **Severity:** P1
- **Affected route/file:** Account-Takeover investigation;
  `backend/app/services/scenarios.py:412-421,435-440,462-474,553-565`;
  `backend/risk_engine/rules.py:43-52`
- **Status:** confirmed
- **Evidence:** the account-takeover device is persisted with `trusted=True`,
  `posture=TRUSTED`, and `first_seen_at=epoch-2 days`; its NEW_DEVICE event says
  `first_seen_fingerprint=False` and `device_posture=trusted`. The risk feature separately sets
  `device_known=False`, and the persisted rule explanation says the device was “not previously
  trusted for this customer.” The anomaly narrative says it was absent from customer history.
- **Why it matters:** “trusted posture,” “known fleet fingerprint,” and “customer familiarity” are
  distinct concepts, but the current data/copy collapses them. A judge inspecting context can see a
  trusted device supporting a new-device contribution.
- **Recommended correction:** preserve the locked 78/79/18/89 result while making the fixture and copy
  semantically precise. Either distinguish organizational posture from customer familiarity in the
  response/explanation, or align the device's persisted trust/history fields with the intended signal.
  Do not change points merely to solve copy.
- **Likely scope:** scenario fixture/explanation semantics and regression assertions; possibly a small
  context label change. No new fraud rule is needed.
- **Regression risk:** medium because Scenario C is locked; assert all exact values, IDs, reset
  fingerprint, and interaction contributions after correction.
- **Timing:** resolve before broad 7C polish and before demo recording.

#### RW-7B2-004 — Canonical admin/API specification has drifted from the implemented boundary

- **Severity:** P1
- **Affected files:** `ARCHITECTURE.md:153-178`, `SPEC.md:103-106`, `UI_SYSTEM.md:114-122`,
  `docs/API.md:145-155`, current OpenAPI
- **Status:** confirmed; final product-scope choice requires approval
- **Evidence:** `ARCHITECTURE.md` lists `/api/system/status` and `/api/audit-events`, while the actual
  typed endpoints are `/api/system/context` and admin-only `/api/system/integrity`. `SPEC.md` says
  admins inspect “audit events” and manage demo configuration. The implemented integrity response
  exposes audit count/latest reference but no audit-event list, and there is no general demo-
  configuration editor. `UI_SYSTEM.md` omits Evaluation from its primary-screen list even though it is
  a required, implemented route. `docs/API.md` accurately documents the current API.
- **Why it matters:** repository specifications are authoritative by policy. Code cannot be considered
  fully reconciled while a canonical document demands a different surface.
- **Recommended correction:** explicitly decide one of two paths: (a) narrow the canonical scope to
  current safe context/integrity evidence and scenario administration, or (b) implement a bounded,
  redacted, paginated admin audit view/API. Remove stale endpoint names and add Evaluation to the
  primary-screen inventory. Do not add a configuration editor without a real use case.
- **Likely scope:** documentation-only if current integrity evidence is approved as sufficient;
  otherwise a bounded backend/UI feature.
- **Regression risk:** low for documentation; medium for a new audit API because redaction/RBAC must
  be explicit.
- **Timing:** resolve the scope decision before broad 7C work.

#### RW-7B2-005 — Approved Vercel topology lacks the required SPA deep-link rewrite

- **Severity:** P1
- **Affected files/routes:** `DEPLOYMENT.md:9-16,63-80,102-109`; repository root/frontend deployment
  configuration; every direct route such as `/incidents/:id`
- **Status:** confirmed configuration absence; cloud behavior not yet exercised
- **Evidence:** no `vercel.json` is tracked. The frontend is a plain Vite SPA using browser history,
  not React Router framework mode. Vercel's current official Vite documentation says SPA deep links do
  not work out of the box and require a rewrite to `/index.html`. The local Nginx fallback is correct
  but does not configure Vercel.
- **Why it matters:** a judge opening or refreshing a copied investigation URL can receive a platform
  404 even though client-side navigation works.
- **Recommended correction:** before deployment, add a verified Vercel configuration at the correct
  project root with Vite build/output settings, SPA rewrite, production security headers where
  appropriate, and a deployed direct-link test.
- **Likely scope:** small deployment configuration and deployment smoke test.
- **Regression risk:** medium; an overbroad rewrite can intercept static assets if configured
  incorrectly, so test root, assets, manifest, favicon, and every direct route.
- **Timing:** not a blocker to 7C; mandatory before cloud deployment/final URLs.

#### RW-7B2-006 — Free-tier Render/Supabase bootstrap is not executable as documented

- **Severity:** P1
- **Affected files:** `DEPLOYMENT.md:63-81`; `backend/Dockerfile`; absent Render service definition
- **Status:** confirmed documentation/configuration gap; provider dashboard remains manual/unverified
- **Evidence:** the backend container automatically runs `alembic upgrade head` then starts Uvicorn on
  port 8000, but it does not seed demo users or reset the deterministic dataset. The deployment plan
  says to run migrations/seed after deploying without specifying where/how. Current Render free web
  services do not provide shell or one-off jobs. No `render.yaml` defines the backend root, port,
  health check, build/start contract, or required environment names. Supabase seeding from a local
  trusted command is possible, but not documented as the approved operator path.
- **Why it matters:** a successful empty deployment can have no login users or dataset, leaving the
  judge-facing UI unusable.
- **Recommended correction:** define and test an explicit no-cost bootstrap path—preferably a local or
  CI one-shot command against Supabase with secret injection, followed by manifest verification—plus
  exact Render root/build/start/port/health settings and recovery steps. Do not place reusable default
  credentials in source or expose an unauthenticated bootstrap endpoint.
- **Likely scope:** deployment manifest/documentation/scripts and an end-to-end cloud rehearsal.
- **Regression risk:** high if bootstrap is made automatic/destructive; require idempotency and
  environment guards.
- **Timing:** not a blocker to 7C; mandatory before cloud deployment.

#### RW-7B2-007 — Application typography is not locally bundled as required

- **Severity:** P1
- **Affected files:** `UI_SYSTEM.md:73-81`; `frontend/src/styles/tokens.css:61`; tracked assets
- **Status:** confirmed
- **Evidence:** the authoritative UI specification requires a locally bundled free variable font such
  as Inter. The CSS declares `Inter, "Avenir Next", "Segoe UI", system-ui`, but the repository contains
  no `@font-face` and no `.woff/.woff2/.ttf/.otf` asset. Rendering therefore varies by host OS.
- **Why it matters:** typography, line wraps, density, screenshots, and perceived polish can shift on
  a judge's or Linux browser. This undercuts deterministic visual evidence.
- **Recommended correction:** bundle a properly licensed OFL variable font as WOFF2, preload it,
  provide explicit fallbacks, document attribution/license, and rerun the three-viewport/axe/visual
  matrix.
- **Likely scope:** frontend asset/token/CSS plus attribution and visual tests.
- **Regression risk:** medium due to reflow across dense tables and the hero screen.
- **Timing:** may be incorporated into 7C; must precede final screenshots.

#### RW-7B2-008 — No repository license or third-party attribution document exists

- **Severity:** P1
- **Affected area:** repository root/publication process
- **Status:** confirmed
- **Evidence:** no tracked `LICENSE`, `COPYING`, `NOTICE`, or `THIRD_PARTY_NOTICES` file exists.
- **Why it matters:** a public GitHub repository without an explicit license does not grant normal
  reuse rights, and third-party asset/font attribution cannot be audited from one place. Team/hackathon
  ownership also means the license choice requires authority rather than an automatic assumption.
- **Recommended correction:** before publication, make an explicit owner/team decision, add the chosen
  project license or an all-rights-reserved notice as appropriate, and add a concise third-party
  attribution/license inventory for source packages and visual/font assets.
- **Likely scope:** legal/documentation only, with human approval.
- **Regression risk:** legal rather than technical.
- **Timing:** not a blocker to 7C; mandatory before public publication.

#### RW-7B2-009 — Avenir Next vector-outline distribution rights require verification

- **Severity:** P1
- **Affected files:** `docs/BRAND_GUIDELINES.md:76-79`;
  `frontend/public/brand/riskweave-lockup-light.svg` and `riskweave-lockup-dark.svg`
- **Status:** probable; requires manual license verification
- **Evidence:** the brand guide explicitly says the public lockups contain vector outlines of the
  visible Avenir Next wordmark. No font file is embedded, but outlining glyphs does not automatically
  establish a right to redistribute those shapes across a public repository, README, and slides.
- **Why it matters:** the frozen brand should not create an avoidable publication/licensing dispute.
- **Recommended correction:** retain the frozen appearance while obtaining/documenting the license
  basis for the source typography. If rights are insufficient, seek explicit approval for a
  metrically/visually compatible OFL-based outlined wordmark; do not silently redesign the brand.
- **Likely scope:** human/legal verification; asset change only if required and separately approved.
- **Regression risk:** high to brand fidelity if changed casually.
- **Timing:** not a blocker to 7C; mandatory before public use beyond permitted local/presentation use.

### P2 findings

#### RW-7B2-010 — Documentation contains completed-work and route inventory drift

- **Severity:** P2
- **Affected files:** `docs/DESIGN_SYSTEM.md:192-197`, `UI_SYSTEM.md:114-122`, portions of
  `ARCHITECTURE.md`, `README.md`, and browser-count history
- **Status:** confirmed
- **Evidence:** Design System still marks Milestone 7B captures “planned/pending” although 27 reviewed
  images and acceptance evidence exist. The primary-screen list omits Evaluation. Architecture still
  describes the API as “through Milestone 4” with superseded names. README counts are accurate as
  historical Milestone 7B evidence but are no longer the current brand-regression suite counts.
- **Why it matters:** condensed milestone summaries become misleading when treated as current status.
- **Recommended correction:** distinguish immutable historical results from current gates, update
  completed evidence status, and reconcile route/endpoint inventories after RW-7B2-004's scope choice.
- **Likely scope:** documentation only.
- **Regression risk:** low.
- **Timing:** may be folded into 7C documentation work.

#### RW-7B2-011 — Secondary-browser clean-container command is not fully self-contained

- **Severity:** P2
- **Affected files:** `docs/END_TO_END_TESTING.md:66-77`; `frontend/package.json`;
  `frontend/package-lock.json`; browser verification process
- **Status:** confirmed reproducibility gap; product tests passed
- **Evidence:** the documented official Playwright container mounts the source and immediately runs
  npm without installing repository dependencies in a clean workspace. During Stage 1, the official
  Playwright image's newer npm exposed optional package-lock metadata variance; an isolated
  non-lock-writing install was needed. The approved application Docker build with its pinned Node
  image still passed `npm ci`.
- **Why it matters:** another developer cannot reliably reproduce Firefox verification from a fresh
  clone using the documented command alone.
- **Recommended correction:** pin the package manager (`packageManager`/Corepack or explicit npm
  version), document/install dependencies in an isolated volume/cache, and test the exact clean-clone
  command in CI or a release script.
- **Likely scope:** package metadata, E2E guide, and optional CI helper; no product behavior.
- **Regression risk:** low to medium because lock regeneration must not drift dependencies.
- **Timing:** before final handoff; may remain outside visual 7C implementation.

#### RW-7B2-012 — Concurrent first scenario replay can misreport `idempotent=false`

- **Severity:** P2
- **Affected file:** `backend/app/services/scenario_operations.py:84-131`
- **Status:** probable from transaction ordering; persistence remains safe
- **Evidence:** the API wrapper reads scenario state without a lock to decide the response flag, then
  calls the inner service, which correctly locks the scenario row. Two simultaneous first requests can
  both pre-read an incomplete row; the second will reuse the completed incident after acquiring the
  inner lock but can still return `idempotent=false`.
- **Why it matters:** no record duplication occurs, but replay messaging/audit metadata can be
  inaccurate under a narrow race.
- **Recommended correction:** have the locked scenario service return whether it created or reused the
  incident, and derive API/audit replay status from that result. Add a concurrent integration test.
- **Likely scope:** backend service response/test only.
- **Regression risk:** medium around transaction boundaries; preserve IDs and counts.
- **Timing:** may follow 7C unless scenario concurrency is part of the live demo.

#### RW-7B2-013 — Frontend cannot reuse an idempotency key after an ambiguous mutation failure

- **Severity:** P2
- **Affected files:** `frontend/src/api/riskweave.ts:97-122`;
  `frontend/src/lib/api-client.ts:95-97`
- **Status:** confirmed; duplicate-click protection and server idempotency remain intact
- **Evidence:** a new random key is generated inside every patch/action request. The UI prevents
  simultaneous double submission, and the server correctly handles repeated identical keys, but a
  user-initiated retry after a lost response cannot reuse the original key.
- **Why it matters:** an ambiguous network failure may require a refetch/409 path instead of a clean
  idempotent replay.
- **Recommended correction:** create the key at mutation intent time, retain it through retry until
  authoritative reconciliation, then discard it. Never persist it with credentials.
- **Likely scope:** frontend mutation state/tests.
- **Regression risk:** low if key lifetime is bounded.
- **Timing:** may remain documented or be folded into a functional hardening pass.

#### RW-7B2-014 — Production frontend CSP permits every HTTPS connection

- **Severity:** P2
- **Affected file:** `frontend/nginx.conf:12`
- **Status:** confirmed hardening opportunity
- **Evidence:** `connect-src 'self' http://localhost:8000 https:` allows browser connections to any
  HTTPS origin. The application currently makes no unexpected third-party calls, so this is not an
  active data leak.
- **Why it matters:** a future injection would have a broader exfiltration channel than needed.
- **Recommended correction:** generate a deployment-specific CSP allowing only self and the configured
  API origin; remove localhost in cloud output. Verify fonts/manifests and API calls under the policy.
- **Likely scope:** deployment/Nginx or platform header configuration.
- **Regression risk:** medium if the build-time API origin is not injected correctly.
- **Timing:** before cloud deployment.

#### RW-7B2-015 — GitHub Actions use mutable major-version tags

- **Severity:** P2
- **Affected file:** `.github/workflows/ci.yml`
- **Status:** confirmed supply-chain hardening opportunity
- **Evidence:** `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, and
  `actions/upload-artifact@v4` are not pinned to immutable commit SHAs.
- **Why it matters:** a compromised or changed upstream tag can alter CI behavior.
- **Recommended correction:** pin third-party actions to reviewed full SHAs and annotate the human
  version; use an update process such as Dependabot/Renovate if desired.
- **Likely scope:** CI configuration only.
- **Regression risk:** low.
- **Timing:** before public repository handoff; not a 7C blocker.

#### RW-7B2-016 — “Healthy source system” means non-empty persisted fixture coverage

- **Severity:** P2
- **Affected files/routes:** `/overview`, `/system-health`;
  `backend/app/services/dashboard.py:53-84`
- **Status:** confirmed semantic limitation, mostly mitigated by surrounding copy
- **Evidence:** a source is `healthy` when its table row count is greater than zero. It does not probe an
  external authentication, endpoint, transaction, or channel connector. The UI usually labels this
  “Persisted data coverage,” which is accurate, but status values can still be read as live connector
  health.
- **Why it matters:** judges should not infer production integrations.
- **Recommended correction:** label the state “fixture available/empty” or “persisted source coverage”
  everywhere, reserving “healthy” for actual service/connectivity checks.
- **Likely scope:** backend enum/copy or presentation labels/tests.
- **Regression risk:** low.
- **Timing:** may be folded into 7C content refinement.

#### RW-7B2-017 — Node is pinned but npm/package-manager behavior is not

- **Severity:** P2
- **Affected files:** `frontend/package.json`, `frontend/Dockerfile`, CI/E2E setup
- **Status:** confirmed reproducibility gap
- **Evidence:** Node `24.13.0` is pinned in the frontend Dockerfile and dependencies are exact, but
  `package.json` has no `packageManager` field. Stage 1 showed that the Docker image's npm accepted
  `npm ci`, while the newer npm in the official Playwright image interpreted one optional package-lock
  entry differently.
- **Why it matters:** lockfile behavior can vary even with the same Node major and exact package
  versions.
- **Recommended correction:** pin the npm version used to create/validate the lock, document it, and
  make CI/Docker/browser containers use that version without rewriting dependencies.
- **Likely scope:** package metadata and tooling configuration.
- **Regression risk:** low if verified with clean installs.
- **Timing:** before final external handoff.

### Informational findings / deliberate limitations

#### RW-7B2-I01 — No cloud deployment, final PPT, demo video, or final screenshot set

This is explicitly deferred, not a regression. It becomes a submission blocker only after 7C and the
deployment reconciliation are complete.

#### RW-7B2-I02 — No phone-first/mobile-phone contract

The supported minimum is 1024×768. Required layouts are usable there. Phone optimization is not a
defect unless scope changes.

#### RW-7B2-I03 — benchmark-v1 does not establish universal false-positive reduction

This is a deliberate, prominently disclosed result. The fixture is mixed, contains seven
single-domain attacks outside the primary product use case, has no legitimate unusual-both-domain
cases, and uses non-identically calibrated score scales. The product retains the exact unfavorable
60+ result.

#### RW-7B2-I04 — Visual evidence consumes about 7 MiB

The size is moderate and the files are intentional historical/comparison evidence. Git LFS or an
artifact release can be considered later, but no current deletion is recommended.

#### RW-7B2-I05 — Local prototype controls are not production banking controls

In-memory JWT sessions, in-process rate limiting, synthetic data, free-tier hosting, one-instance
assumptions, and the absence of production SLA/compliance claims are all disclosed and acceptable for
the prototype.

## 11. Previously completed requirements confirmed intact

The following requirements were explicitly traced and remain intact:

- Problem Statement 2 and account-takeover product focus;
- exact Decimal fusion formula, one half-up rounding, thresholds, actions, and transaction states;
- exact Scenario A/B/C scores, outcomes, deterministic IDs, and persisted rows;
- strict correlation time/identity/device exclusions and bounded interaction bonus;
- fixed-seed, capped, explainable Isolation Forest support;
- deterministic baseline generation, 14-day history, 15→18 incident counts, and atomic reset;
- immutable benchmark-v1 labels/fixtures, all operating points/cohorts, and qualified claims;
- PostgreSQL-only runtime and current Alembic head `0003_intelligence_support`;
- Argon2id, audience/issuer JWT validation, memory-only frontend token, and role enforcement;
- append-only audit trigger and action/scenario/auth audit creation;
- request IDs, safe errors, security headers, validation, and explicit CORS;
- incident pagination/filter/sort/detail consistency and masked customer/account context;
- workflow transition validation, row-lock stale-state conflicts, server idempotency, and audit history;
- admin-only scenario/reset/integrity actions and analyst read-only scenario visibility;
- dashboard values sourced from persisted backend data, except the wrong time-bound label in
  RW-7B2-001;
- channel-linked quantum inventory/readiness explanations with no fraud-score contribution;
- honest Evaluation route with the exact approved bounded statement;
- authenticated deep links, URL-preserved queue filters, loading/empty/error states, and no frontend
  banking-value fabrication;
- Decision Weave arithmetic/projection/semantic order, except source-pair ownership in RW-7B2-002;
- route focus, skip navigation, visible interactive focus, dialog focus, keyboard tables, axe, and
  reduced motion;
- required 1440×900, 1280×720, and 1024×768 layouts and visual matrices;
- frozen Concept A geometry/colors/wordmark, dark contrast, favicon fallbacks/manifest, and app
  integration;
- Docker Compose, frontend/backend/PostgreSQL health, `/health`, `/ready`, frontend production build,
  current unit/integration/E2E suites, and dependency audits.

## 12. Acceptable deliberate limitations

The following are documented and may remain without correction at this milestone:

- synthetic data only; no real customer, banking, security, or benchmark data;
- prototype results only; no real-world accuracy, loss-prevention, compliance, or production claim;
- benchmark-v1 limitations and deferred prospectively designed benchmark-v2;
- no active quantum-attack detection and no claim of a “quantum-proof bank”;
- no mobile-phone redesign below the supported enterprise/tablet viewport;
- refresh-to-reauthenticate memory-only JWT behavior;
- in-process demo login rate limiting rather than distributed abuse protection;
- free-tier cold starts/pausing and mandatory local Docker fallback;
- curated baseline incident profiles rather than claimed model-discovered attacks;
- Chromium as standard CI with documented secondary-engine release checks;
- final deployment, PPT, final screenshots, demo video, and GitHub presentation treatment deferred
  until later milestones.

## 13. Exact blockers before Milestone 7C

There is no P0 blocker. The following P1 reconciliation should happen before broad 7C visual work:

1. **Backend-authored interaction provenance (RW-7B2-002).** This changes the evidence contract that
   the hero visualization consumes; polish should not harden the current client rule table.
2. **Scenario C trust/familiarity semantics (RW-7B2-003).** The flagship attack story must be
   internally consistent before its final content hierarchy is polished.
3. **Canonical scope decision (RW-7B2-004).** Decide whether audit inspection means the current latest
   integrity projection or a bounded audit listing, then align source-of-truth documents/API scope.

These are not invitations to change scores, weights, thresholds, scenario outcomes, benchmark data,
or brand. They are contract/data-semantics reconciliation.

## 14. Fixes that may be incorporated into Milestone 7C

- correct the Overview's windowed total and add a reconciliation assertion (RW-7B2-001);
- bundle the approved free application font and rerun layout/visual baselines (RW-7B2-007);
- update completed visual-evidence and current route/API wording after the canonical scope decision
  (RW-7B2-010);
- relabel persisted fixture coverage so it cannot be mistaken for live external connector health
  (RW-7B2-016);
- retain exact brand assets and avoid reopening Concept A geometry, colors, wordmark, or favicon.

Deployment, licensing, CI supply-chain, and package-manager work should be kept as explicit adjacent
hardening tracks rather than hidden inside visual polish.

## 15. Deployment and presentation readiness

### Ready now

- clean-clone local setup is documented;
- Docker Compose starts PostgreSQL, backend, and frontend;
- migrations apply and health/readiness report the expected revision;
- deterministic user/data/scenario/reset/benchmark commands exist;
- local analyst/admin credentials come from environment values;
- live product routes are understandable and visual evidence is presentation-capable;
- recorded demo/screenshots are already planned as free-tier failure fallback.

### Not ready yet

- no deployed Vercel/Render/Supabase environment has been verified;
- no Vercel SPA deep-link rewrite exists;
- Render/Supabase bootstrap and recovery are not executable from the written sequence;
- deployed origins, CORS, CSP, secrets, health checks, cold-start UX, and database pause recovery are
  unproven;
- no final public license/third-party notice or verified wordmark-outline license basis exists;
- no final GitHub URL, deployed URL, final screenshot set, PPT, or demo video exists.

Nothing here prevents 7C after the three pre-7C reconciliation items. It does prevent claiming that a
judge can already open a production-like public demo.

## 16. Recommended next milestone sequence

1. **Milestone 7B.3 — bounded reconciliation:** RW-7B2-002, RW-7B2-003, and RW-7B2-004 only;
   rerun exact scenarios, reset fingerprint, API contracts, investigation E2E, and core gates.
2. **Milestone 7C — final UI/content refinement:** include RW-7B2-001, RW-7B2-007, RW-7B2-010, and
   RW-7B2-016; preserve brand and all business semantics.
3. **Deployment readiness:** RW-7B2-005/006/014 plus verified direct links, bootstrap, cold start,
   health, and Supabase recovery.
4. **Publication/legal hygiene:** RW-7B2-008/009/015/017 with human authority for licensing.
5. **Final end-to-end release verification:** exact browser matrix, accessibility, dependency audits,
   deterministic reset/scenarios, deployed smoke checks, and clean Git status.
6. **Submission assets:** final screenshots, architecture diagram, demo recording, PPT, portal copy,
   README presentation polish, and submission checklist.
7. **Optional post-submission hardening:** RW-7B2-011/012/013 and benchmark-v2 only under a separately
   approved scope.

## 17. Commands and evidence inspected

### Stage 1 checkpoint verification

The following passed before commit `cebaf1f`:

- `git diff --check`;
- Prettier, ESLint, strict TypeScript;
- frontend Vitest: **38/38 passed** across 6 files;
- frontend coverage: statements **86.45%**, branches **73.91%**, functions **83.73%**, lines
  **87.70%**;
- Ruff format/lint and mypy: **68 source files** typed successfully;
- backend pytest: **89/89 passed**, total coverage **95.02%**;
- Chromium Playwright: **39 applicable passed**, 4 explicit opt-in visual skips;
- Firefox official Playwright Linux image: **25 applicable passed**, 18 intentional
  Chromium-only/visual skips;
- WebKit official Playwright Linux image: **25 applicable passed**, 18 intentional
  Chromium-only/visual skips;
- production frontend build: 657 modules transformed, largest primary application chunk approximately
  333.39 kB / 104.99 kB gzip, Overview route approximately 392.58 kB / 111.60 kB gzip;
- `npm audit`: 0 vulnerabilities;
- Python dependency audit: no known vulnerabilities;
- `docker compose config`;
- `docker compose up --build -d`;
- PostgreSQL, backend, and frontend containers healthy;
- PostgreSQL accepts connections;
- frontend `/login`: HTTP 200;
- backend `/health`: HTTP 200, version 0.5.0;
- backend `/ready`: HTTP 200, database reachable, migrations current at
  `0003_intelligence_support`.

Native macOS Firefox/WebKit launch limitations occurred before product test execution; the matching
official Linux Playwright image supplied the completed engine contracts. This limitation remains
documented rather than hidden.

### Stage 2 read-only evidence commands

Representative commands included:

```text
git status --short
git rev-parse HEAD
git show --stat / --name-status
rg --files
rg and nl/sed traces across specifications, services, routes, schemas, components, tests, and docs
git ls-files and git log filename hygiene searches
du/find inventories for all visual-baseline directories
docker compose ps
docker compose exec PostgreSQL count/revision/fixture queries
alembic check
OpenAPI path enumeration
benchmark-v1 deterministic evaluation and cohort/metric extraction
frontend production-source searches for weights, thresholds, and locked score constants
```

The current database, OpenAPI, migration head, benchmark output, Git history, visual indexes, and
official deployment-provider documentation were compared to the repository claims.

## 18. Final audit state

- **Audited checkpoint:** `cebaf1fab3d907f33cebf005d554bbfb27cf8371`
- **Checkpoint message:** `feat: finalize RiskWeave brand identity`
- **Working tree before this document:** clean
- **Stage 2 implementation/config/test changes:** none
- **Stage 2 working-tree addition:** `docs/MILESTONE_7B2_RECONCILIATION_AUDIT.md` only
- **Audit document committed:** no
- **Milestone 7C begun:** no
