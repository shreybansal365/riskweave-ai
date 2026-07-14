# RiskWeave AI — Deployment Plan

## Cost and scope

Use free, open-source, or no-cost tiers only. No paid API, hosted model, or paid database feature is required.

Free-tier deployment is a demonstration and portfolio environment, not a production banking deployment.

## Approved topology

- Frontend: Vercel Hobby
- Backend: Render free web service
- Database: Supabase PostgreSQL Free
- Source and CI: GitHub and GitHub Actions

Equivalent free-tier alternatives require approval before replacing an approved component.

## Database policy

PostgreSQL is the only runtime database:

- local: PostgreSQL container in Docker Compose;
- deployment: Supabase PostgreSQL;
- CI integration tests: PostgreSQL service container.

Do not implement SQLite fallback, SQLite-specific migrations, or filesystem persistence for runtime state.

## Mandatory local fallback

```bash
docker compose up --build
```

The local composition must start:

- frontend;
- FastAPI backend;
- PostgreSQL;
- migrations and deterministic seed through explicit, observable steps.

## Expected environment variables

```text
DATABASE_URL=
JWT_SECRET=
ACCESS_TOKEN_TTL_MINUTES=
CORS_ORIGINS=
APP_ENV=
DEMO_ADMIN_EMAIL=
DEMO_ADMIN_PASSWORD=
DEMO_ANALYST_EMAIL=
DEMO_ANALYST_PASSWORD=
DEMO_SEED=26026
MODEL_RANDOM_SEED=26026
SIMULATION_EPOCH=2026-07-14T09:00:00Z
VITE_API_BASE_URL=
```

Only `VITE_API_BASE_URL` is exposed to frontend build tooling. Passwords, JWT secret, and database URL remain backend secrets.

## Deployment sequence

1. create the Supabase PostgreSQL project;
2. configure a backend-safe PostgreSQL connection string;
3. deploy the Render backend;
4. run Alembic migrations;
5. run atomic deterministic seed;
6. verify `/health` and `/ready`;
7. verify baseline manifest counts;
8. deploy the Vercel frontend;
9. configure `VITE_API_BASE_URL` and the exact CORS origin;
10. verify analyst and admin authentication;
11. run and reset all scenarios;
12. verify the 48-case benchmark summary;
13. verify channel-linked quantum readiness;
14. capture final URLs;
15. document free-tier wake-up and pause behavior;
16. rerun the local Docker acceptance suite.

## Free-tier operational caveats

- Backend cold starts may delay the first request after inactivity.
- Free web-service filesystems are not trusted for persistence.
- The Supabase free database may pause after inactivity.
- Free-tier quotas and terms may change and must be rechecked before final submission.
- No production uptime or durability guarantee is claimed.

## Safeguards

- explicit backend wake-up state in the frontend;
- bounded retry for idempotent GET requests only;
- clear service-unavailable message;
- no automatic retry of analyst actions or reset without an idempotency key;
- database-backed scenario and audit state;
- recorded demo and screenshots as backup;
- local Docker demo ready;
- documented manual wake-up checklist before presentation.

## Deployment verification

- migrations are at the expected revision;
- baseline counts match `DATA_SCHEMA.md`;
- scenario outputs match `DEMO_SCENARIOS.md` exactly;
- reset restores exact identifiers and counts;
- direct incident URLs work after authentication;
- no secrets appear in frontend assets, logs, screenshots, or repository history;
- benchmark labels and limitations are visible;
- quantum readiness remains separate from fraud scores.
