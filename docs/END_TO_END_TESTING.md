# End-to-end product verification

Milestone 6 verified RiskWeave as one composed product: browser, React application, FastAPI,
PostgreSQL, authentication, RBAC, persisted workflows, deterministic scenarios, benchmark-v1, and
quantum-readiness reporting. Those results remain historical evidence.

Milestone 7B extends that regression contract for the redesigned information hierarchy,
server-authoritative Decision Weave, safe system projections, new queue filtering, and strengthened
focus/session behavior. The updated Chromium and WebKit contracts and the three-viewport visual
capture completed on 15 July 2026. Playwright runs against the Docker application at
`http://localhost:4173`; it does not replace backend integration tests or Vitest.

## Prerequisites and test identities

1. Copy `.env.example` to `.env`.
2. Set a local-only `JWT_SECRET` of at least 32 characters.
3. Set `DEMO_ADMIN_PASSWORD`, `DEMO_ANALYST_PASSWORD`, `E2E_ADMIN_PASSWORD`, and
   `E2E_ANALYST_PASSWORD`. The E2E values may match the corresponding demo values locally.
4. Start the application and reconcile the deterministic users:

```bash
docker compose up --build -d
docker compose exec backend python -m app.cli.seed_demo_users
```

The passwords remain in `.env`, are never committed, and are not written to browser storage or test
artifacts. The E2E global setup checks both roles and restores the deterministic dataset before the
suite.

## Commands

Run the standard CI browser:

```bash
cd frontend
npm run test:e2e:chromium
```

Run all locally supported engines:

```bash
cd frontend
npm run test:e2e
```

Run Chromium visibly or under the Playwright inspector:

```bash
cd frontend
npm run test:e2e:headed
npm run test:e2e:debug
```

Failure screenshots, traces, and videos are written beneath `frontend/test-results/`. The HTML report
is written to `frontend/playwright-report/` and opened with `npm run test:e2e:report`. Both directories
are ignored by Git. Artifacts are retained only on failure.

## Historical Milestone 6 browser matrix

| Engine   | Milestone 6 contract                                                               | Retained result                                             |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Chromium | Full suite, including failure injection, axe, responsive matrix, and timing sanity | 31 applicable tests passed                                  |
| Firefox  | Core analyst/admin, evidence, workflow, queue, and scenario journeys               | 20 applicable tests passed; 12 Chromium-only checks skipped |
| WebKit   | Core analyst/admin, evidence, workflow, queue, and scenario journeys               | 20 applicable tests passed; 12 Chromium-only checks skipped |

On this macOS automation host, native headless Firefox 151 starts but cannot map its software-rendered
framebuffer. The failure occurs before any test code runs. Firefox and WebKit can be verified in the
exact Playwright 1.61.1 Linux image on the Compose network without relying on Docker Desktop's
platform-specific host networking. The additive browser overlay builds a network-only frontend whose
API origin is `http://backend:8000`, while retaining the normal host-facing frontend for Chromium.
Start the deterministic stack, seed users, then run both secondary engines:

```bash
docker compose -f docker-compose.yml -f docker-compose.browser.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.browser.yml exec -T backend \
  python -m app.cli.seed_demo_users

docker run --rm --network riskweave_default --env-file .env \
  -e CI=true \
  -e E2E_BASE_URL=http://frontend-browser \
  -e E2E_API_URL=http://backend:8000 \
  -v "$PWD/frontend:/work" \
  -v /work/node_modules \
  -w /work \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  sh -lc 'npm install --global npm@11.6.2 && npm ci && npx playwright test --project=firefox && npx playwright test --project=webkit'
```

Firefox and WebKit run sequentially because both projects exercise the same deterministic demo
database and each suite performs an atomic baseline reset. Running the projects concurrently would
make two test harnesses contend for the single shared demonstration state.

The anonymous `/work/node_modules` volume prevents Linux native packages from replacing the host
installation and is deleted with the container. `.env` remains uncommitted. The
`frontend-browser` service has no host port and exists only for this exact browser matrix. This is a
host-renderer limitation, not a waived Firefox product check. Chromium is the standard CI engine to
control runtime cost; Firefox and WebKit remain part of the documented release matrix.

## Milestone 7B browser matrix

| Engine   | Milestone 7B result                                                                                | Scope note                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Chromium | 35 passed; 1 explicit visual-capture test skipped in the functional run                            | Complete functional, failure-injection, axe, responsive, timing, and scenario contract                                       |
| WebKit   | 22 passed; 14 intentional Chromium-only diagnostics skipped                                        | Complete supported analyst/admin, evidence, workflow, queue, and scenario journeys                                           |
| Firefox  | 22 passed; 14 intentional Chromium-only diagnostics skipped in the official Playwright Linux image | Native macOS launch stalls before test code, so the documented version-matched container runs the supported release contract |

The explicit Chromium visual-capture command passed separately and wrote 27 PNGs. The Firefox native
host limitation remains visible, while the version-matched official Linux image provides a real
product result rather than a waived check. The standard CI engine remains Chromium; Firefox and
WebKit are completed secondary-engine checks for this milestone.

## Deterministic setup and isolation

- global setup verifies `/health`, logs in both seeded roles, atomically resets the dataset, and runs
  all three showcase scenarios;
- tests use one worker to prevent competing resets or workflow mutations;
- state-changing tests restore the deterministic showcase dataset in `finally` blocks;
- scenario replays assert stable incident UUIDs;
- reset asserts the exact baseline fingerprint;
- tests do not depend on execution order.

The real rate-limiter journey uses a per-Playwright-process synthetic invalid email (or an explicit
`E2E_RUN_ID`) so an earlier local suite invocation cannot leave the in-memory limiter saturated for a
later run. This identifier is not banking data and does not participate in seeded records, UUIDs,
scenario scores, or baseline fingerprints.

## Historical Milestone 6 coverage map

The browser suite covers:

- analyst/admin login, role-aware navigation, logout, refresh, invalid credentials, throttling, token
  invalidation, and server-side denials;
- API-reconciled overview metrics, 14-day trends, recent links, loading, empty, and error states;
- server pagination, sorting, search, filters, URL state, keyboard row activation, and return-state
  preservation;
- exact account-takeover and legitimate-new-device scores, contributions, timelines, statuses, and
  decision language;
- valid case transitions, notes, duplicate prevention, persisted action history, and two-context stale
  `409` handling;
- exact scenario outcomes, idempotent replay, admin-only run/reset, and atomic reset fingerprint;
- quantum scores and channel links without fraud-score coupling;
- benchmark-v1 version, all operating points, cohorts, limitations, unfavorable results, and exact
  bounded statement;
- system liveness/readiness/migration/source state and recoverable degradation;
- rendered-to-API consistency, unexpected console errors, uncaught exceptions, failed requests,
  third-party calls, and browser-storage leakage.

Intentional navigation or TanStack Query cancellation is normalized per engine (`ERR_ABORTED`,
`NS_BINDING_ABORTED`, or WebKit's exact `cancelled` reason). Other request failures still fail the
test.

## Milestone 7B regression contract — completed

The current Playwright specifications add or tighten assertions for:

- backend-authored `fusion_projection` terms and Decision Weave semantic order;
- exact Scenario B zero-interaction, permitted, allow-and-monitor treatment;
- API-backed `transaction_status` queue filtering, URL preservation, and stable return navigation;
- safe `/api/system/context` shell data and admin-only `/api/system/integrity` evidence;
- exact environment, dataset, migration, scenario, benchmark, reset, and audit rendering without
  secret fields;
- transaction-action charts including the `cancelled` category and source-total reconciliation;
- quantum migration priority remaining separate from every fraud score and decision;
- route document titles, destination-heading focus, skip navigation, dialog restoration, focused
  mutation confirmation, and focused stale-conflict handling;
- explicit session-expiry messaging, persistent dismissible danger toasts, timed-toast pause behavior,
  and unsaved-note route/unload protection;
- production-CSS contrast, 200% zoom, reduced motion, table overflow, and dialog viewport containment;
- 1440×900, 1280×720, and 1024×768 route compositions.

All listed assertions passed in the complete Chromium run. The supported cross-engine subset also
passed in WebKit. Exact counts, the Firefox host limitation, and the complete acceptance mapping are
recorded in `docs/MILESTONE_7B_ACCEPTANCE.md`.

## Accessibility and viewport contract

Chromium ran axe against login, overview, incident queue, both showcase investigation semantics,
simulator, quantum readiness, system health, and evaluation with no serious or critical violations.
The 7B rerun also passed route and mutation focus, session/toast announcements, unsaved-note
protection, production-CSS contrast, 200% zoom, Decision Weave reading order, quantum/fraud
separation, reduced-motion behavior, and dialog focus restoration. Responsive tests passed at
`1440×900`, `1280×720`, and `1024×768`; only labelled enterprise-table regions may scroll
horizontally.

## Visual review baselines

The explicit capture command is:

```bash
cd frontend
npm run test:e2e:visual
```

The nine `1440×900` Milestone 6 PNGs remain unchanged in
`docs/visual-baselines/milestone-6/` as historical audit evidence.

The current capture specification writes the Milestone 7B review matrix to
`docs/visual-baselines/milestone-7b/`: login, overview, incident queue, both showcase
investigations, simulator, quantum readiness, system health, and evaluation at `1440×900`,
`1280×720`, and `1024×768` (27 PNGs total). It requires persisted route content, the exact URL,
loaded fonts, reduced motion, scroll position zero, no loading or error shell, and a non-collapsed
authenticated workspace. The command passed and all 27 PNGs were reviewed for complete shell state,
legible first-fold evidence, and deterministic route content. They are review evidence, not final
presentation screenshots. The directory index documents their provenance and capture contract.

## CI behavior

The `Browser E2E (Chromium)` job waits for all existing frontend, backend, and Compose gates. It starts
a fresh composed stack with non-secret synthetic CI credentials, waits for database-backed readiness,
seeds users, runs Chromium headlessly, uploads failure artifacts only when necessary, emits service
logs on failure, and destroys the CI volume afterward.

The Chromium CI gate is the intended standard 7B automation path. WebKit is a documented local
release check. Firefox is verified in the official Linux image because native launch fails before
product test code on this macOS host.
