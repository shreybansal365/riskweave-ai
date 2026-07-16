# RiskWeave AI — deployment and recovery

## Scope

The hosted release is a no-cost hackathon demonstration, not a production banking deployment. It
uses synthetic data only and makes no uptime, compliance, fraud-prevention, or real-world-accuracy
claim.

## Topology

- Frontend: Vercel Hobby, static Vite build.
- Backend: Render Free Docker web service.
- Database: Supabase PostgreSQL Free (preferred).
- Source and CI: GitHub and GitHub Actions.
- Mandatory fallback: the complete local Docker Compose stack.

The deployment configuration reserves these deterministic project/service names:

- Vercel project: `riskweave-ai-shreybansal365`;
- Render service: `riskweave-api-shreybansal365`;
- Render region: `singapore`;
- frontend target origin: `https://riskweave-ai-shreybansal365.vercel.app`;
- backend target origin: `https://riskweave-api-shreybansal365.onrender.com`.

Treat an origin as live only after its endpoint checks pass. If a provider assigns a different origin,
update `vercel.json`, `render.yaml`, `CORS_ORIGINS`, and `VITE_API_BASE_URL` together before the final
build.

## Local fallback

Copy `.env.example` to `.env`, set a strong local JWT secret and two non-reused demo passwords, then
run:

```bash
docker compose up --build -d
docker compose exec backend python -m app.cli.seed_demo_users
docker compose exec backend python -m app.cli.reset_demo_data
```

Verify:

```bash
curl --fail http://localhost:4173/login
curl --fail http://localhost:8000/health
curl --fail http://localhost:8000/ready
```

The local database remains PostgreSQL. No SQLite or filesystem persistence fallback exists.

## Environment inventory

Only `VITE_API_BASE_URL` is browser-visible. The following backend values belong in Render or the
operator's uncommitted environment; never place their values in Git, screenshots, logs, or the
frontend bundle:

```text
APP_NAME
APP_VERSION
APP_ENV
LOG_LEVEL
DATABASE_URL
CORS_ORIGINS
JWT_SECRET
ACCESS_TOKEN_TTL_MINUTES
AUTH_FAILURE_LIMIT
AUTH_FAILURE_WINDOW_SECONDS
DEMO_ADMIN_EMAIL
DEMO_ADMIN_PASSWORD
DEMO_ANALYST_EMAIL
DEMO_ANALYST_PASSWORD
DEMO_SEED
MODEL_RANDOM_SEED
SIMULATION_EPOCH
RELEASE_BOOTSTRAP_CONFIRM
```

Vercel requires:

```text
VITE_API_BASE_URL
```

Render supplies `PORT`; the Docker image binds Uvicorn to `0.0.0.0:${PORT}`. PostgreSQL connection
strings beginning with `postgresql://` are normalized to psycopg by validated backend settings.

## Supabase PostgreSQL

1. Create one Free project in the Supabase dashboard.
2. Use the provider's PostgreSQL connection string with TLS enabled. Prefer the transaction pooler
   when direct IPv6 connectivity is unavailable.
3. Store that value only as Render's `DATABASE_URL` secret and in the temporary operator environment
   used for recovery commands.
4. Do not use Supabase Auth, Storage, Edge Functions, or client-side keys; RiskWeave uses only hosted
   PostgreSQL.

Supabase Free projects may pause after low activity over a seven-day window. They can be resumed from
the dashboard within the provider's restore window. Before a judge session, resume the project and
wake the backend, then verify `/ready`.

### Render PostgreSQL fallback

If Supabase authorization is unavailable, a Render Free PostgreSQL database can supply the same
`DATABASE_URL`. This is a submission fallback only: Render Free PostgreSQL expires 30 days after
creation, has no managed backups, and is deleted after the documented grace period unless upgraded.
Recreate it, rerun the guarded bootstrap, and reverify the manifest if it expires.

## Render backend

`render.yaml` defines the Docker build context, exact service name, Free plan, `/health` check,
reviewed environment inventory, and an `initialDeployHook` that runs the guarded bootstrap once.
Secrets marked `sync: false` must be supplied in the Render consent screen. `JWT_SECRET` is generated
by Render.

The image always runs `alembic upgrade head` before starting Uvicorn. It does **not** reset data on
restart. On the first deploy only, the hook runs:

```bash
python -m app.cli.bootstrap_release
```

The command:

- requires `APP_ENV=production` and `RELEASE_BOOTSTRAP_CONFIRM=baseline-v1`;
- applies migrations before inspecting the database;
- initializes only an entirely empty deterministic domain;
- verifies the exact baseline-v1 manifest counts and fingerprint;
- idempotently reconciles the analyst and administrator identities;
- no-ops on an already exact baseline;
- refuses partial, modified, or unexpected state instead of resetting it;
- never exposes a password or JWT value.

For recovery outside Render, run the same command from `backend/` with the hosted environment values
in the current process. Never paste those values into repository files:

```bash
cd backend
.venv/bin/python -m app.cli.bootstrap_release
```

The expected baseline result is 12 customers, 12 accounts, 16 devices, 180 transactions, 240 cyber
events, 15 incidents, three not-run scenario records, and fingerprint
`2ac2c997d21246cc7380ce1f53e121bb58c79891ea98229e47e6f2ec998ef0ca`.

Render Free web services spin down after inactivity. The first wake request can take about a minute;
the UI exposes a recoverable service-unavailable state instead of inventing a green status.

## Vercel frontend

`vercel.json` builds the `frontend/` Vite application, serves `frontend/dist`, rewrites SPA routes to
`index.html`, and sets security headers. Its CSP `connect-src` contains only `self` and the exact
Render API origin—never a blanket `https:` source. Set `VITE_API_BASE_URL` to that same verified API
origin before the production build.

Directly reload `/overview` and an incident URL after deployment. Static assets, local Inter font,
manifest, and favicon must continue returning their real content rather than the SPA shell.

## First-release sequence

1. Create or select the Supabase Free project and obtain the TLS PostgreSQL URL.
2. Publish the GitHub repository only after secret and licensing checks pass.
3. Create the Render Blueprint from `render.yaml`, supply only the prompted secrets, and wait for the
   initial bootstrap hook.
4. Verify backend `/health` and `/ready` plus the baseline manifest.
5. Create the Vercel project from the repository, set `VITE_API_BASE_URL`, and deploy.
6. Confirm Render `CORS_ORIGINS` equals the final Vercel origin exactly; redeploy if it changed.
7. Sign in as both roles, verify RBAC, and run the three scenarios as administrator.
8. Verify counts move from 15 baseline incidents to 18 visible incidents and the exact scenario
   outcomes remain 9/low/permitted, 23/guarded/permitted, and 89/critical/held.
9. Reset once and confirm the exact baseline fingerprint, then replay the scenarios for the demo.
10. Verify benchmark-v1 limitations and quantum/fraud separation on the hosted UI.

## Hosted acceptance checklist

- public root and `/login` return the RiskWeave application;
- direct and reloaded `/overview` and `/incidents/{id}` routes load;
- `/health` returns HTTP 200;
- `/ready` returns HTTP 200 with database `reachable` and migrations `current`;
- both seeded roles authenticate without browser storage persistence;
- analyst/admin permissions remain distinct;
- Scenario A is 10/10/0/9, allowed;
- Scenario B is 40/10/0/22.50/23, guarded, monitored, and permitted;
- Scenario C is 78/79/18/88.65/89, critical and held;
- reset restores 15 incidents and the manifest fingerprint; all scenarios produce 18 incidents;
- favicon, web manifest, and Vite-emitted local Inter font return HTTP 200;
- CSP and CORS name only the final API/frontend origins;
- no secret appears in HTML, JavaScript, HTTP logs, screenshots, or Git history.

## Recovery

- Backend cold start: request `/health`, wait for HTTP 200, then request `/ready`.
- Paused Supabase project: resume it in the dashboard, then wake Render and verify `/ready`.
- Empty replacement database: point `DATABASE_URL` to it and run the guarded release bootstrap once.
- Partial or modified database: do not force bootstrap. Preserve evidence, create a fresh database, and
  initialize that empty target.
- Provider outage or deadline failure: run the documented local Docker stack and retain the recorded
  demo as a presentation fallback.
