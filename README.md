# RiskWeave AI

RiskWeave AI is an explainable cyber-transaction intelligence prototype for FinSpark’26 Problem Statement 2. The approved product vision correlates cybersecurity telemetry with transaction behaviour, while keeping every decision deterministic, inspectable, and clearly qualified as a synthetic-data prototype.

Milestone 6 established the historical composed-product verification baseline against the local
Docker stack: analyst/admin journeys, API-to-render consistency, stale workflow conflicts, exact
scenario/reset behavior, accessibility, required viewports, console/network hygiene, and nine
1440×900 review captures.

Milestone 7B builds on that verified foundation with an editorial banking-operations hierarchy, a
server-authoritative Decision Weave, a denser triage queue, truthful authenticated environment and
dataset context, and deliberately separate fraud-risk and quantum-migration surfaces. The browser
still contains no scoring formula, threshold engine, scenario logic, or fabricated banking metric.
The Milestone 7B Chromium and WebKit contracts passed, and the reviewed three-viewport matrix now
contains 27 captures in `docs/visual-baselines/milestone-7b/`. Native Firefox cannot launch its
software renderer reliably on this macOS host, so its supported 7B contract passed in the
version-matched official Playwright Linux image.

> **Built and maintained by Shrey Bansal.**
> Developed for the FinSpark’26 Hackathon under Team CyberForge.

## Canonical specification order

Read these files before changing product behaviour:

1. `AGENTS.md`
2. `PROJECT_DECISIONS.md`
3. `SPEC.md`
4. `ARCHITECTURE.md`
5. `DATA_SCHEMA.md`
6. `UI_SYSTEM.md`
7. `SECURITY.md`
8. `DEMO_SCENARIOS.md`
9. `ACCEPTANCE_TESTS.md`
10. `DEPLOYMENT.md`
11. `CODEX_START_PROMPT.md`

The linked ChatGPT conversation is background context only. These repository documents are authoritative when anything conflicts.

## Current architecture

```text
Browser
  │
  ├── GET /health ──> FastAPI liveness (database-independent)
  │
  └── GET /ready ───> FastAPI ──> PostgreSQL SELECT 1
                                  └─> Alembic revision check

Deterministic synthetic history ──> persisted behavioural baselines
Cyber events + transaction ───────> identity/time correlation
                                   ├─> transparent rule scores
                                   ├─> capped deterministic anomaly support
                                   └─> documented cross-domain bonuses
                                             │
                                             v
                            Decimal fusion + grounded explanations
                                             │
                                             v
                       PostgreSQL incident/contribution/audit records
```

The frontend displays backend-owned status. It does not recreate backend readiness logic, and no frontend scoring logic exists.

Incident detail now includes a read-only `fusion_projection`. It supplies the stream weights,
weighted terms, interaction bonus, persisted raw value, rounded result, and rounding mode used by the
Decision Weave. The UI renders that projection but never derives it. Authenticated shell context comes
from `/api/system/context`; the deeper dataset, scenario, benchmark, migration, reset, and audit
integrity projection comes from the admin-only `/api/system/integrity` endpoint.

## Prerequisites

For the recommended fresh-clone path:

- Docker Engine or Colima;
- Docker Compose v2 or later.

For optional host-native development:

- Node.js 20.19 or later (Node 24 is used in CI and Docker);
- Python 3.12;
- GNU Make or compatible `make`.

Every dependency is free and open source. JavaScript and Python dependencies are pinned in committed lockfiles.

## Fresh-clone setup

The services and health checks start without an authentication secret:

```bash
docker compose up --build
```

Then open:

- application shell: [http://localhost:4173](http://localhost:4173)
- API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- liveness: [http://localhost:8000/health](http://localhost:8000/health)
- database readiness: [http://localhost:8000/ready](http://localhost:8000/ready)

Expected foundation responses:

```json
{
  "status": "ok",
  "service": "RiskWeave API",
  "version": "0.5.0"
}
```

```json
{
  "status": "ready",
  "service": "RiskWeave API",
  "checks": {
    "database": "reachable",
    "migrations": "current"
  },
  "revision": "0003_intelligence_support"
}
```

To use the demo authentication flow, copy `.env.example` to `.env`, set a unique JWT secret of at
least 32 characters, and set both demo passwords. Never commit `.env`.

After the database is migrated, reconcile the deterministic analyst and admin identities:

```bash
docker compose exec backend python -m app.cli.seed_demo_users
```

The seed is idempotent: rerunning it preserves the same UUIDv5 identities and does not rehash unchanged
passwords. Authentication remains fail-closed with a safe `503` response when `JWT_SECRET` is unset.

### Product routes

After seeding users and the deterministic dataset, sign in at
[http://localhost:4173/login](http://localhost:4173/login). The browser keeps the short-lived JWT only
in application memory; a hard refresh intentionally requires a new sign-in.

| Route | Purpose | Access |
|---|---|---|
| `/overview` | Source-backed metrics, 14-day trends, priority cases, source health | analyst, admin |
| `/incidents` | Server-filtered, URL-preserved triage queue including transaction-state filtering | analyst, admin |
| `/incidents/:incidentId` | Decision Context, Decision Weave, evidence chronology, context, and analyst workflow | analyst, admin |
| `/simulator` | Scenario state and authoritative expected outcomes | read: analyst/admin; run/reset: admin |
| `/quantum-readiness` | Channel-linked crypto migration posture | analyst, admin |
| `/system-health` | Liveness, readiness, migration, deterministic integrity, and source diagnostics | admin |
| `/evaluation` | Qualified benchmark-v1 evidence at 40+, 60+, and 80+ | analyst, admin |

Frontend architecture, API-client ownership, authentication flow, and route behavior are documented in
`docs/FRONTEND_ARCHITECTURE.md`. The reusable visual language is documented in
`docs/DESIGN_SYSTEM.md`.

Restore the exact deterministic background dataset:

```bash
docker compose exec backend python -m app.cli.reset_demo_data
```

Run the three showcase scenarios and the synthetic benchmark:

```bash
docker compose exec backend python -m app.cli.run_scenario normal_activity
docker compose exec backend python -m app.cli.run_scenario legitimate_new_device
docker compose exec backend python -m app.cli.run_scenario account_takeover
docker compose exec backend python -m app.cli.run_benchmark
```

Each scenario is idempotent. Reset restores the same UUIDs, timestamps, counts, scenario states, and
dataset fingerprint. The benchmark output is a prototype evaluation on deterministic synthetic data,
not evidence of real-world banking accuracy.

Stop the stack without deleting PostgreSQL data:

```bash
docker compose down
```

To remove the local Docker volume deliberately, use `docker compose down --volumes` only when its data is no longer needed.

## Host-native development

Install the locked toolchains:

```bash
make setup
```

Run the API from `backend/` after PostgreSQL is available:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Run the frontend from `frontend/`:

```bash
npm run dev
```

Common repository commands:

| Command | Purpose |
|---|---|
| `make format` | Apply Ruff and Prettier formatting |
| `make format-check` | Verify formatting without changes |
| `make lint` | Run Ruff and ESLint |
| `make typecheck` | Run mypy and strict TypeScript checks |
| `make test` | Run pytest and Vitest |
| `make test-e2e-chromium` | Run the standard composed-product browser suite |
| `make test-e2e` | Run the complete locally supported browser matrix |
| `make test-e2e-headed` | Run Chromium visibly for local investigation |
| `make test-e2e-visual` | Regenerate the Milestone 7B nine-screen matrix at 1440×900, 1280×720, and 1024×768 |
| `make audit` | Audit locked runtime dependencies |
| `make check` | Run all non-build quality gates |
| `make build` | Create the frontend production build |
| `make migrate` | Upgrade PostgreSQL to the latest Alembic revision |
| `make migration-check` | Verify model metadata has no ungenerated migration operations |
| `make seed-users` | Idempotently reconcile analyst/admin identities from environment credentials |
| `make seed-data` | Bootstrap the deterministic dataset using the same atomic restore service |
| `make reset-data` | Atomically restore the exact deterministic background dataset |
| `make scenario SCENARIO=normal_activity` | Run one deterministic showcase scenario |
| `make benchmark` | Evaluate the versioned 48-case synthetic benchmark |
| `make docker-up` | Build and start the complete local stack in the background |
| `make docker-logs` | Show recent service logs |
| `make docker-down` | Stop the local stack |

## Environment contract

The current runtime consumes:

| Variable | Purpose | Safe local default |
|---|---|---|
| `APP_NAME` | API display name | `RiskWeave API` |
| `APP_VERSION` | API version | `0.5.0` |
| `APP_ENV` | `development`, `test`, or `production` | `development` |
| `LOG_LEVEL` | Typed Python log level | `INFO` |
| `DATABASE_URL` | PostgreSQL connection using psycopg | Docker Compose value |
| `CORS_ORIGINS` | Comma-separated explicit browser origins | local Vite and container origins |
| `JWT_SECRET` | HS256 signing secret, minimum 32 characters | none; authentication fails closed |
| `ACCESS_TOKEN_TTL_MINUTES` | Short-lived access token duration, 1–60 minutes | `15` |
| `AUTH_FAILURE_LIMIT` | Failed attempts allowed in the in-process demo window | `5` |
| `AUTH_FAILURE_WINDOW_SECONDS` | Prototype login-limiter window | `60` |
| `DEMO_ADMIN_EMAIL` | Deterministic admin identity | `admin@riskweave.demo` |
| `DEMO_ADMIN_PASSWORD` | Admin seed password; stored only as Argon2id | none |
| `DEMO_ANALYST_EMAIL` | Deterministic analyst identity | `analyst@riskweave.demo` |
| `DEMO_ANALYST_PASSWORD` | Analyst seed password; stored only as Argon2id | none |
| `DEMO_SEED` | Locked data-generation seed | `26026` |
| `MODEL_RANDOM_SEED` | Locked Isolation Forest seed | `26026` |
| `SIMULATION_EPOCH` | Locked UTC simulation epoch | `2026-07-14T09:00:00Z` |
| `VITE_API_BASE_URL` | Browser-visible API origin | `http://localhost:8000` |
| `E2E_BASE_URL` | Playwright application origin | `http://localhost:4173` |
| `E2E_API_URL` | Playwright setup/API reconciliation origin | `http://localhost:8000` |
| `E2E_ADMIN_EMAIL` / `E2E_ANALYST_EMAIL` | Synthetic browser-test identities | demo emails |
| `E2E_ADMIN_PASSWORD` / `E2E_ANALYST_PASSWORD` | Uncommitted browser-test credentials | none |

The backend rejects other simulation epochs or seeds so fixture identity and score expectations cannot
drift silently.

## Repository layout

```text
.
├── backend/                 FastAPI, domain models, intelligence, fixtures, Alembic, tests
│   ├── app/services/        Database-backed use-case and scenario orchestration
│   ├── risk_engine/         Pure rules, anomaly, correlation, fusion, explanation, benchmark
│   └── data/                Versioned baseline manifest and 48 benchmark fixtures
├── frontend/                Authenticated React UI, typed API client, unit tests, Playwright E2E
├── docs/                    Architecture, test evidence, and deterministic review baselines
├── .github/workflows/       CI quality gates
├── docker-compose.yml       Local frontend, backend, and PostgreSQL topology
├── Makefile                 Development and verification commands
└── *.md                     Authoritative product and engineering specifications
```

## Quality gates

GitHub Actions verifies:

- committed dependency locks;
- Python and TypeScript formatting;
- Ruff and ESLint;
- mypy and strict TypeScript;
- pytest and Vitest;
- frontend production build;
- PostgreSQL migration-backed integration readiness;
- full fresh upgrade plus safe downgrade/re-upgrade;
- Argon2id hashing, JWT validation, login and `/api/auth/me`;
- server-side analyst/admin role separation and security audit creation;
- deterministic data generation, UUID stability, atomic reset, and scenario idempotency;
- every rule, anomaly cap, correlation boundary/exclusion, interaction, threshold, and rounding edge;
- exact locked scenario scores and persisted explanations/contributions;
- repeatable evaluation of the versioned 48-case benchmark;
- channel-to-crypto-asset linkage without fraud-score coupling;
- incident pagination, safe filters, deterministic detail chronology, and contribution consistency;
- validated workflow transitions, row-lock concurrency, idempotent actions, RBAC, and audit logging;
- source-backed dashboard aggregation, 14-day trend reconciliation, and bounded context queries;
- admin-only deterministic scenario APIs and exact atomic reset;
- explainable quantum-readiness and qualified benchmark-v1 API reports;
- successful OpenAPI generation for the complete Milestone 4 surface;
- in-memory JWT login, authenticated routing, and role-aware analyst/admin navigation;
- API-backed overview, queue, investigation, simulator, quantum, health, and evaluation views;
- Vitest, Testing Library, keyboard-flow, and automated accessibility checks for core UI behavior;
- Playwright analyst/admin journeys across Chromium, Firefox, and WebKit;
- rendered-to-API data reconciliation, stale `409` workflow handling, and exact reset fingerprints;
- axe, keyboard, reduced-motion, console/network, and 1440/1280/1024 viewport audits;
- deterministic 1440×900 visual-review baselines and practical route/bundle sanity checks;
- V8 frontend coverage reporting through `npm run test:coverage`;
- valid Docker Compose configuration.

The browser matrix, deterministic reset strategy, artifact handling, headed mode, Linux Firefox
fallback for this macOS automation host, and CI behavior are documented in
`docs/END_TO_END_TESTING.md`. The milestone evidence is summarized in
`docs/MILESTONE_6_ACCEPTANCE.md`.

Those statements describe the retained Milestone 6 evidence. Milestone 7B adds regression coverage
for the server-authored Decision Weave, transaction-status filtering, authenticated context/integrity
projections, route and mutation focus, session-expiry messaging, persistent toasts, unsaved-note
protection, production-CSS contrast, and the 1440/1280/1024 composition matrix. Chromium passed all
35 executable functional tests; Firefox and WebKit each passed all 22 applicable tests; the separate
visual-capture test passed and produced 27 reviewed PNGs. See `docs/MILESTONE_7B_ACCEPTANCE.md` for
the complete evidence and the explicit native-Firefox host limitation.

## Implemented API and security boundary

Implemented endpoints:

- `POST /api/auth/login`;
- `GET /api/auth/me`;
- `GET /api/auth/admin-check` as the minimal server-side RBAC verification surface;
- `GET /api/incidents`;
- `GET /api/incidents/{incident_id}`;
- `PATCH /api/incidents/{incident_id}`;
- `POST /api/incidents/{incident_id}/actions`;
- `GET /api/dashboard/summary`;
- `GET /api/dashboard/trends`;
- `GET /api/customers/{customer_id}`;
- `GET /api/accounts/{account_id}`;
- `GET /api/scenarios`;
- `POST /api/scenarios/{scenario_key}/run` (admin only);
- `POST /api/scenarios/reset` (admin only);
- `GET /api/quantum/assets`;
- `GET /api/quantum/summary`;
- `GET /api/benchmark/summary`;
- `GET /api/system/context`;
- `GET /api/system/integrity` (admin only);
- `GET /health`;
- `GET /ready`.

The PostgreSQL schema contains every entity and enum in `DATA_SCHEMA.md`. Audit rows are
append-oriented in the application and protected by PostgreSQL from update, delete, and truncate
operations. All business routes require a short-lived access token. Analysts can investigate and
update cases. Scenario execution and reset are server-side admin-only operations.

Endpoint schemas, filters, workflow conflicts, and example requests are documented in
`docs/API.md`. The state machine is documented in `docs/INCIDENT_WORKFLOWS.md`; the independent
cryptographic-readiness method is documented in `docs/QUANTUM_READINESS.md`.

## Milestone 3 intelligence contract

- simulation epoch: `2026-07-14T09:00:00Z`;
- simulation and model seed: `26026`;
- background window: `[2026-06-30T09:00:00Z, 2026-07-14T09:00:00Z)`;
- baseline counts: 12 customers, 12 accounts, 16 devices, 180 transactions, 240 cyber events, and
  15 incidents;
- post-scenario incident count: 18;
- correlation window: inclusive 30 minutes before a transaction, with exact customer/account/session
  identity matching and device matching when present;
- authoritative formula: `0.45 × cyber + 0.45 × transaction + bonus`, clamped to 0–100 and rounded
  once with `ROUND_HALF_UP`;
- maximum anomaly contribution: 10 points per stream;
- maximum documented correlation bonus: 18 points.

Detailed rules and limitations are in `docs/RISK_SCORING.md`; dataset construction is in
`docs/SYNTHETIC_DATA.md`; computed benchmark outcomes are in `docs/BENCHMARK.md`.

## benchmark-v1 reporting

`benchmark-v1 — mixed synthetic security benchmark` reports the isolated cyber rule score,
isolated transaction rule score, and fused hybrid contextual score at three separate operating points:

- 40+ escalation or step-up;
- 60+ operational hold or intervention;
- 80+ critical-only.

The 60+ result is primary only for statements about holds or operational intervention. On the complete
mixed fixture, fused recall at 60+ is 0.3333 versus 0.4444 for each isolated rule comparator. The exact
unfavorable result is retained.

The fixture contains no legitimate case with unusual evidence in both domains, includes seven
single-domain attacks outside RiskWeave's primary use case, and uses isolated and fused score scales
that are not calibrated identically. It does not establish universal false-positive reduction.

> RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.

A separately versioned, prospectively designed `benchmark-v2` remains future work; it is not created
in Milestone 6.

## Deferred boundary

Milestone 7B implements the audited visual hierarchy and product contract but deliberately does not
claim production status or completed browser/visual evidence before the updated verification run. The
following remain outside this milestone:

- final post-verification presentation adjustments and any later animation refinement;
- cloud deployment;
- final GitHub presentation treatment, final screenshots, PPT, and demo video;
- prospectively designed benchmark-v2.

This is a synthetic-data prototype, not a production banking control. Later benchmark outcomes must be
reported exactly as computed and identified as prototype evaluation on deterministic synthetic data;
they are not evidence of real-world banking accuracy. Any production use would require validation on
representative governed data, model governance, independent security and regulatory review, monitoring,
operational controls, key management, shared abuse protection, and end-to-end integration testing.
