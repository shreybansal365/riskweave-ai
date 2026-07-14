# RiskWeave AI

RiskWeave AI is an explainable cyber-transaction intelligence prototype for FinSpark’26 Problem Statement 2. The approved product vision correlates cybersecurity telemetry with transaction behaviour, while keeping every decision deterministic, inspectable, and clearly qualified as a synthetic-data prototype.

Milestone 2 establishes the complete PostgreSQL domain schema plus a bounded authentication and
security foundation: Argon2id demo identities, short-lived JWT access tokens, server-side analyst/admin
authorization, append-only security audit records, request identifiers, security headers, safe errors,
and a restrained React shell that reports real service connectivity. It intentionally contains no risk
scoring, correlation, synthetic banking scenarios, incident-management APIs, business screens, charts,
or dashboard metrics.

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

## Foundation architecture

```text
Browser
  │
  ├── GET /health ──> FastAPI liveness (database-independent)
  │
  └── GET /ready ───> FastAPI ──> PostgreSQL SELECT 1
                                  └─> Alembic revision check
```

The frontend displays backend-owned status. It does not recreate backend readiness logic, and no frontend scoring logic exists.

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
  "version": "0.2.0"
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
  "revision": "0002_domain_security"
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
| `make audit` | Audit locked runtime dependencies |
| `make check` | Run all non-build quality gates |
| `make build` | Create the frontend production build |
| `make migrate` | Upgrade PostgreSQL to the latest Alembic revision |
| `make migration-check` | Verify model metadata has no ungenerated migration operations |
| `make seed-users` | Idempotently reconcile analyst/admin identities from environment credentials |
| `make docker-up` | Build and start the complete local stack in the background |
| `make docker-logs` | Show recent service logs |
| `make docker-down` | Stop the local stack |

## Environment contract

Milestone 2 consumes:

| Variable | Purpose | Safe local default |
|---|---|---|
| `APP_NAME` | API display name | `RiskWeave API` |
| `APP_VERSION` | API version | `0.2.0` |
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
| `VITE_API_BASE_URL` | Browser-visible API origin | `http://localhost:8000` |

The simulation and model variables in `.env.example` remain reserved for approved later milestones.

## Repository layout

```text
.
├── backend/                 FastAPI, domain models, auth/security, Alembic, tests
├── frontend/                React, strict TypeScript, service-status shell
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
- valid Docker Compose configuration.

## Milestone 2 API and security boundary

Implemented endpoints:

- `POST /api/auth/login`;
- `GET /api/auth/me`;
- `GET /api/auth/admin-check` as the minimal server-side RBAC verification surface;
- `GET /health`;
- `GET /ready`.

The PostgreSQL schema contains every entity and enum in `DATA_SCHEMA.md`, but this milestone adds no
business behavior for incidents, transactions, scenarios, risk contributions, or quantum readiness.
Audit rows are append-oriented in the application and protected by PostgreSQL from update, delete, and
truncate operations.

## Deferred boundary

The following are explicitly deferred until their approved milestones:

- risk and anomaly scoring;
- deterministic synthetic banking fixtures;
- correlation and incident workflows;
- benchmark evaluation;
- business screens, metrics, charts, and finished visual design.

This is a synthetic-data prototype, not a production banking control. Later benchmark outcomes must be
reported exactly as computed and identified as prototype evaluation on deterministic synthetic data;
they are not evidence of real-world banking accuracy. Any production use would require validation on
representative governed data, model governance, independent security and regulatory review, monitoring,
operational controls, key management, shared abuse protection, and end-to-end integration testing.
