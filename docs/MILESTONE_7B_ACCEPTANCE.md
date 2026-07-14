# Milestone 7B acceptance — Visual Redesign and Decision Weave

**Completed:** 15 July 2026  
**Milestone 7A checkpoint:** `7bfcb48a1e7281263ca19730f009c579f9ed759e`  
**Scope boundary:** Milestone 7B only; no cloud deployment, PPT, demo video, benchmark-v2, scoring
change, new fraud use case, mobile-first redesign, or Milestone 7C work

## Verdict

Milestone 7B is complete. RiskWeave now uses route-specific banking-operations compositions instead
of a repeated dashboard template, makes the two showcase investigations the product proof, and
expresses its core idea through a server-authoritative Decision Weave. All seven P0 issues and all 31
P1 findings from the approved audit are resolved. No P1 item is deferred.

The redesign preserves the locked scenarios, deterministic identifiers, workflow semantics, RBAC,
benchmark-v1 fixture/results, and quantum/fraud separation. The frontend does not calculate a score,
weight, threshold, severity, or action.

## P0 resolution register

| Finding | Resolution | Evidence |
|---|---|---|
| P0-01 — false fused arithmetic | Replaced bare source-score addition with backend-authored source scores, 0.45 weights, exact weighted terms, interaction bonus, raw fused value, one half-up rounded result, and rounding mode. | `FusionProjection` API contract, `DecisionWeave`, unit/integration/E2E assertions |
| P0-02 — scrambled 1024 ordering | Decision Weave uses deliberate semantic DOM stages and a breakpoint-specific linear composition; the E2E contract asserts both semantic order and 1024 usability. | `DecisionWeave.tsx`, responsive CSS, Chromium test |
| P0-03 — incomplete queue | Added amount/currency, C/T/bonus/fused composition, transaction state, explicit case state, and backend `transaction_status` filtering with URL persistence. | incident API/filter tests, queue unit/E2E tests |
| P0-04 — tiny typography | Operational text now follows a 13–16 px body scale; dense metadata is at least 12 px, with smaller monospace reserved for nonessential identifiers. | design tokens/CSS, 1024/zoom/axe checks |
| P0-05 — Cancelled omitted | Transaction-action visualization and accessible summary include every backend category, including Cancelled, and reconcile to the persisted total. | overview component and API-consistency E2E assertions |
| P0-06 — false production label | Shell and System Health render authenticated backend context: Local deterministic demo, loopback API, dataset state, simulation epoch, migration revision, and safe integrity evidence. | `/api/system/context`, admin `/api/system/integrity`, schema/service tests |
| P0-07 — incomplete captures | A visual-ready gate verifies shell/navigation/route content; 27 new PNGs were generated and reviewed. Historical Milestone 6 files remain untouched. | `visual-baselines.spec.ts`, Milestone 7B screenshot index |

## P1 disposition register

Every P1 finding is resolved; none is hidden as future polish.

| Finding | Status | Implemented disposition |
|---|---|---|
| P1-01 navigation hierarchy | Resolved | Navigation is grouped into Operations, Demonstration, Resilience & Evidence, and Administration while preserving RBAC. |
| P1-02 repeated route composition | Resolved | Overview, queue, dossier, simulator, migration register, health ledger, evidence report, and login use distinct compositions. |
| P1-03 equal-card saturation | Resolved | Open sections, ledgers, editorial rules, bounded evidence/action panels, and fewer independent cards establish hierarchy. |
| P1-04 focus/skip/title/route focus | Resolved | Added skip link, two-layer focus treatment, route document titles, destination-heading focus, and queue return focus. |
| P1-05 overview metric hierarchy | Resolved | High/Critical, Open/In Review, and Held lead; secondary outcomes move to a restrained ledger; priority cases occupy the first fold. |
| P1-06 low-value incident chart | Resolved | Replaced the oversized smoothed treatment with a compact discrete operational volume composition. |
| P1-07 trend/severity ambiguity | Resolved | Daily averages are explicitly named, volume context and direct counts are present, and line identity is not colour-only. |
| P1-08 queue filters/overflow | Resolved | Core filters stay visible; scenario/date are advanced; transaction status is server-filtered; table has deliberate overflow, sticky structure, and guidance. |
| P1-09 protected transaction absent | Resolved | Decision Context leads with amount, beneficiary, channel, transaction state, masked customer/account, session origin, and recommendation. |
| P1-10 arithmetic convergence | Resolved | Decision Weave uses two evidence rails, genuine interactions, authoritative weighted terms, and one decision endpoint. |
| P1-11 aggregate-only interactions | Resolved | Each interaction knot names and links its persisted cyber and transaction source contributions with bonus and explanation. |
| P1-12 generic timeline | Resolved | Active evidence uses persisted decisive descriptions and source relevance; baseline context is presented separately. |
| P1-13 chronology before evidence | Resolved | Decisive evidence and interaction pairs precede the full chronology. |
| P1-14 mixed controls | Resolved | Investigation disposition, synthetic transaction response, and analyst notes are separate bounded workflows. |
| P1-15 Scenario B mitigation buried | Resolved | A dedicated “Why intervention was avoided” module foregrounds normal transaction context, zero bonus, permitted state, no hold, and no step-up. |
| P1-16 flat contributions | Resolved | Contributions are ranked by points/relevance, interactions occupy the bridge, and full evidence remains available below. |
| P1-17 pricing-card simulator | Resolved | Simulator is a progressive three-journey storyboard: normal → isolated unusual cyber → cross-domain takeover. |
| P1-18 transient simulator feedback | Resolved | Per-scenario busy/result/replay/failure state and direct result links persist in-page; reset reports restored state. |
| P1-19 repetitive quantum page | Resolved | Quantum uses one compact summary ledger, one urgent migration decision, and one channel-linked asset register. |
| P1-20 quantum resembles fraud risk | Resolved | “Migration priority index” has a separate violet/neutral grammar and an explicit fraud-score boundary. |
| P1-21 missing integrity evidence | Resolved | Admin health shows dataset counts versus baseline, fingerprint, seeds/epoch, scenario state, benchmark fixture, reset, and audit context. |
| P1-22 bounded conclusion buried | Resolved | Evaluation leads with the approved bounded conclusion and unequal-calibration warning; 60+ operational evidence follows. |
| P1-23 opaque benchmark shorthand | Resolved | Human comparator names and expanded confusion-matrix labels lead; internal identifiers are secondary. |
| P1-24 late 1024 reflow | Resolved | Stress breakpoints deliberately recompose shell, Decision Weave, action rail, simulator, charts, quantum, and tables. |
| P1-25 colour-heavy charts | Resolved | Charts use direct labels/non-colour differentiation and concise textual summaries reconciled to source data. |
| P1-26 weak table semantics | Resolved | Tables use meaningful headers/row identity, preserved direct links, labelled overflow regions, and visible overflow guidance. |
| P1-27 fragile toast/session/mutation/note behavior | Resolved | Persistent danger/conflict feedback, pauseable toasts, enlarged dismiss targets, focused mutation results, session-expiry notice, and unsaved-note protection are tested. |
| P1-28 destructive refetch states | Resolved | Initial loading remains route-shaped while background refresh retains authoritative content with a bounded busy state. |
| P1-29 first-entry route errors | Resolved | Deterministic direct-entry tests for both showcase investigations and Evaluation pass without initial recoverable errors. |
| P1-30 implementation-virtue copy | Resolved | Primary copy describes analyst outcomes; rounding, versions, idempotency, and provenance are demoted to evidence/help context. |
| P1-31 missing shell context | Resolved | Authenticated shell context shows environment, dataset/scenario state, and simulation epoch from the safe backend projection. |

## Decision Weave implementation

The semantic sequence is:

1. cyber evidence;
2. backend-authored weighted cyber term;
3. genuine cross-domain interactions;
4. backend-authored weighted transaction term;
5. transaction evidence;
6. authoritative decision.

For Account Takeover it renders `0.45 × 78 = 35.10`, `0.45 × 79 = 35.55`, `+18.00`, raw
`88.65`, and rounded `89`. For Legitimate New Device it renders `0.45 × 40 = 18.00`,
`0.45 × 10 = 4.50`, `+0.00`, raw `22.50`, and rounded `23`. Responsive CSS changes placement,
not reading order. Connection labels and the linear text alternative keep the relationship
understandable without colour or decorative motion.

## Additive backend work

The approved backend slice is additive and read-only except for the existing workflows:

- incident detail now exposes a typed `fusion_projection` derived from persisted authoritative
  values, with Decimal JSON strings for exact terms and `ROUND_HALF_UP` provenance;
- incident listing accepts an authoritative `transaction_status` filter;
- `/api/system/context` exposes safe authenticated shell context to both roles;
- `/api/system/integrity` exposes admin-only deterministic integrity evidence;
- integration tests verify filter behavior, projection consistency, RBAC, and absence of secret
  configuration fields.

No migration was added. Risk rules, weights, thresholds, scenario values, benchmark data, anomaly
logic, workflow transitions, and authorization semantics were not changed.

## Verification evidence

### Browser matrix

| Command | Result |
|---|---|
| `npm run test:e2e:chromium` | 35 executable tests passed; visual-capture test intentionally skipped |
| `npm run test:e2e -- --project=webkit` | 22 applicable tests passed; 14 Chromium-only diagnostics intentionally skipped |
| Firefox in `mcr.microsoft.com/playwright:v1.61.1-noble` | 22 applicable tests passed; 14 Chromium-only diagnostics intentionally skipped |
| Native Firefox launch | Unavailable on this macOS host: software-rendered framebuffer mapping stalls before test code; the official Linux-image result above is the authoritative Firefox check |
| `npm run test:e2e:visual` | 1 explicit capture test passed; 27 PNGs generated |

The first post-redesign Chromium run exposed a queue assertion race: the test read rows before React
rendered the successful API response. The product response was correct. The test now waits for the
authoritative page-size row count; the focused regression and complete rerun both passed.

### Tests, coverage, and build

| Gate | Result |
|---|---|
| Backend pytest with PostgreSQL integration | 89 passed |
| Backend coverage | 95.02% total |
| Frontend Vitest | 33 passed across 5 files |
| Frontend coverage | 86.30% statements; 73.17% branches; 83.62% functions; 87.55% lines |
| Ruff/Prettier format check | Passed |
| Ruff/ESLint lint | Passed with zero warnings |
| mypy / strict TypeScript | Passed; mypy checked 86 source files |
| Frontend production build | Passed; 657 modules transformed |
| Python dependency audit | No known vulnerabilities |
| npm dependency audit | 0 vulnerabilities |
| Docker Compose | database, backend, and frontend healthy |
| `/health` | `status=ok`, API version 0.5.0 |
| `/ready` | database reachable, migrations current, revision `0003_intelligence_support` |

Production output is code-split. The main entry is 331.62 kB (104.42 kB gzip), CSS is 79.21 kB
(15.83 kB gzip), Incident Detail is 28.55 kB (7.21 kB gzip), and the Recharts-bearing Overview
route is 392.58 kB (111.60 kB gzip).

### Accessibility, keyboard, and viewports

- no serious or critical axe violations across the required routes;
- skip navigation, route focus, visible focus, dialog trap/restoration, mutation confirmation focus,
  stale-conflict focus, session expiry, and unsaved-note departure protection passed;
- severity and state remain text-labelled rather than colour-only;
- chart text alternatives, table headers, reduced motion, and 200% zoom passed;
- `1440×900`, `1280×720`, and `1024×768` passed with no clipped critical controls;
- 1024 deliberately scrolls only labelled enterprise-table regions and preserves Decision Weave
  semantics.

## Visual evidence

The exact 27-file matrix, seeded state, visual purpose, status, and reproduction command are indexed
in `docs/visual-baselines/milestone-7b/README.md`. All nine routes were reviewed at all three required
viewports. No incomplete shell, black capture region, loading state, secret, debug overlay, false
arithmetic, or contradictory environment label remains. Milestone 6 baselines were not modified.

## Files changed in Milestone 7B

### Authoritative/product documentation

- `ACCEPTANCE_TESTS.md`
- `README.md`
- `UI_SYSTEM.md`
- `docs/API.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/END_TO_END_TESTING.md`
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/MILESTONE_7B_ACCEPTANCE.md` (new)
- `docs/SCREENSHOT_CHECKLIST.md`
- `docs/visual-baselines/milestone-7b/README.md` (new)
- 27 new PNGs under `docs/visual-baselines/milestone-7b/`

### Backend

- `backend/app/api/routes/incidents.py`
- `backend/app/api/routes/system.py`
- `backend/app/schemas/incidents.py`
- `backend/app/schemas/system.py`
- `backend/app/services/incidents.py`
- `backend/app/services/system_integrity.py` (new)
- `backend/tests/test_business_api_integration.py`
- `backend/tests/test_system_integrity.py` (new)

### Frontend and browser tests

- `frontend/e2e/accessibility-responsive.spec.ts`
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/evidence-health.spec.ts`
- `frontend/e2e/investigation-workflow.spec.ts`
- `frontend/e2e/overview-queue.spec.ts`
- `frontend/e2e/scenarios.spec.ts`
- `frontend/e2e/support/api.ts`
- `frontend/e2e/visual-baselines.spec.ts`
- `frontend/src/App.test.tsx`
- `frontend/src/App.tsx`
- `frontend/src/api/riskweave.ts`
- `frontend/src/app/AuthProvider.tsx`
- `frontend/src/app/auth-context.ts`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/Brand.tsx`
- `frontend/src/components/DecisionWeave.tsx` (new)
- `frontend/src/components/DecisionWeave.test.tsx` (new)
- `frontend/src/components/ToastProvider.tsx`
- `frontend/src/components/ToastProvider.test.tsx` (new)
- `frontend/src/components/charts.tsx`
- `frontend/src/components/incident-components.tsx`
- `frontend/src/components/incident-components.test.tsx` (new)
- `frontend/src/components/ui.tsx`
- `frontend/src/pages/EvaluationPage.tsx`
- `frontend/src/pages/IncidentDetailPage.tsx`
- `frontend/src/pages/IncidentDetailPage.test.tsx` (new)
- `frontend/src/pages/IncidentsPage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/OverviewPage.tsx`
- `frontend/src/pages/QuantumReadinessPage.tsx`
- `frontend/src/pages/SimulatorPage.tsx`
- `frontend/src/pages/SystemHealthPage.tsx`
- `frontend/src/styles/global.css`
- `frontend/src/styles/tokens.css`
- `frontend/src/test/fixtures.ts`
- `frontend/src/types/api.ts`

No file was deleted.

## Commands executed

The meaningful implementation and verification commands were:

```text
git commit -m "docs: add parallel UI and product design audit"
docker compose up --build -d
docker compose ps
npm run test:e2e:visual
npm run test:e2e:chromium
npm run test:e2e:chromium -- --grep "queue pagination"
npm run test:e2e -- --project=webkit
npm run test:e2e -- --project=firefox
docker run --rm --network host --env-file .env -e CI=true -v "<repo>/frontend:/work" -w /work mcr.microsoft.com/playwright:v1.61.1-noble npm run test:e2e -- --project=firefox
make format
make format-check
make lint
make typecheck
env RUN_DATABASE_TESTS=1 ./.venv/bin/pytest --cov=app --cov=risk_engine --cov-report=term-missing
npm run test:coverage
make build
make audit
curl -sS http://localhost:8000/health
curl -sS http://localhost:8000/ready
curl -sS http://localhost:4173/healthz
git diff --check
```

The native Firefox command did not reach application tests for the host reason documented above; the
same project completed its supported Firefox contract in the official Linux image. One earlier
Chromium run failed only at the queue timing assertion and is retained in this report rather than
hidden; the corrected complete run passed.

## Remaining visual weaknesses and deliberate deferrals

These are not failed P1 findings:

- the 1024 incident and evidence registers intentionally require labelled horizontal scrolling;
- several operational pages are vertically long because exhaustive evidence remains available below
  the first fold;
- the Recharts-bearing Overview route is the largest lazy chunk and remains a later optimization
  candidate, not a current blocking defect;
- final presentation crops, micro-copy refinement, motion refinement, and Ultra visual QA belong to
  Milestone 7C or later;
- no mobile-first layout was attempted by scope.

Milestone 7C has not begun.
