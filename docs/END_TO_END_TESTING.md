# End-to-end product verification

Milestone 6 verifies RiskWeave as one composed product: browser, React application, FastAPI,
PostgreSQL, authentication, RBAC, persisted workflows, deterministic scenarios, benchmark-v1, and
quantum-readiness reporting. Playwright runs against the Docker application at
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

## Browser matrix

| Engine | Milestone 6 contract | Local result |
|---|---|---|
| Chromium | Full suite, including failure injection, axe, responsive matrix, and timing sanity | 31 applicable tests passed |
| Firefox | Core analyst/admin, evidence, workflow, queue, and scenario journeys | 20 applicable tests passed; 12 Chromium-only checks skipped |
| WebKit | Core analyst/admin, evidence, workflow, queue, and scenario journeys | 20 applicable tests passed; 12 Chromium-only checks skipped |

On this macOS automation host, native headless Firefox 151 starts but cannot map its software-rendered
framebuffer. The failure occurs before any test code runs. Firefox is therefore verified in the
version-matched official Playwright Linux image against the same local Docker stack:

```bash
docker run --rm --network host --env-file .env \
  -e CI=true \
  -v "$PWD/frontend:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  npm run test:e2e -- --project=firefox
```

This is a host-renderer limitation, not a waived Firefox product check. Chromium is the standard CI
engine to control runtime cost; Firefox and WebKit remain part of the documented local release matrix.

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

## Coverage map

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

## Accessibility and viewport contract

Chromium runs axe against login, overview, incident queue, both showcase investigation semantics,
simulator, quantum readiness, system health, and evaluation. Milestone 6 permits no serious or
critical violations.

Keyboard tests verify visible focus, row activation, dialog focus trapping/restoration, and reduced
motion. Responsive tests exercise `1440×900`, `1280×720`, and `1024×768`; only enterprise tables may
scroll horizontally.

## Visual review baselines

The explicit capture command is:

```bash
cd frontend
npm run test:e2e:visual
```

It requires each route's persisted content, exact URL, loaded fonts, reduced motion, and scroll
position zero before capture. Nine `1440×900` PNGs are stored in
`docs/visual-baselines/milestone-6/`. They are functional review evidence for Milestone 7, not the
final presentation screenshots.

## CI behavior

The `Browser E2E (Chromium)` job waits for all existing frontend, backend, and Compose gates. It starts
a fresh composed stack with non-secret synthetic CI credentials, waits for database-backed readiness,
seeds users, runs Chromium headlessly, uploads failure artifacts only when necessary, emits service
logs on failure, and destroys the CI volume afterward.
