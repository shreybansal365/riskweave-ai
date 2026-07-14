# RiskWeave AI

RiskWeave AI is an explainable cyber-transaction intelligence prototype for FinSpark’26 Problem Statement 2. The approved product vision correlates cybersecurity telemetry with transaction behaviour, while keeping every decision deterministic, inspectable, and clearly qualified as a synthetic-data prototype.

Milestone 1 establishes only the application foundation: a typed FastAPI service, PostgreSQL migration and readiness contracts, and a restrained React shell that reports real service connectivity. It intentionally contains no risk scoring, incidents, scenarios, authentication, banking data, charts, or dashboard metrics.

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

The default local values are self-contained and require no secret file:

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
  "version": "0.1.0"
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
  "revision": "0001_foundation"
}
```

Copy `.env.example` to `.env` only when you need to override ports or safe local defaults. Never commit `.env`.

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
| `make docker-up` | Build and start the complete local stack in the background |
| `make docker-logs` | Show recent service logs |
| `make docker-down` | Stop the local stack |

## Environment contract

Milestone 1 consumes:

| Variable | Purpose | Safe local default |
|---|---|---|
| `APP_NAME` | API display name | `RiskWeave API` |
| `APP_VERSION` | API version | `0.1.0` |
| `APP_ENV` | `development`, `test`, or `production` | `development` |
| `LOG_LEVEL` | Typed Python log level | `INFO` |
| `DATABASE_URL` | PostgreSQL connection using psycopg | Docker Compose value |
| `CORS_ORIGINS` | Comma-separated explicit browser origins | local Vite and container origins |
| `VITE_API_BASE_URL` | Browser-visible API origin | `http://localhost:8000` |

The additional variables in `.env.example` are reserved for already approved later milestones and are not consumed by this foundation.

## Repository layout

```text
.
├── backend/                 FastAPI, settings, PostgreSQL, Alembic, tests
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
- valid Docker Compose configuration.

## Foundation boundary

The following are explicitly deferred until their approved milestones:

- risk and anomaly scoring;
- deterministic synthetic banking fixtures;
- correlation and incident workflows;
- benchmark evaluation;
- analyst/admin authentication;
- business screens, metrics, charts, and finished visual design.

This is a synthetic-data prototype, not a production banking control. Later benchmark outcomes must be reported exactly as computed and identified as prototype evaluation on deterministic synthetic data; they are not evidence of real-world banking accuracy.
