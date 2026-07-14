# Milestone 5 acceptance mapping

| Acceptance criterion | Implementation / verification |
|---|---|
| M4 checkpoint exists | commit `732755726d917b46a2debd6c780c45daa34260ad` |
| Login and protected routing | in-memory `AuthProvider`, protected route parent, login/me workflow tests |
| Analyst/admin distinction | role-aware navigation; admin-only health and simulator controls; backend RBAC unchanged |
| Required screens | all eight approved routes implemented |
| API-owned business values | centralized typed API layer; no frontend formula, threshold, or metric fixtures in production |
| Incident workflow | server-returned valid actions, idempotency keys, concurrency token, 409 handling, refetch |
| Scenario B | backend catalog returns 40/10/0, raw 22.5, fused 23, guarded, allow-and-monitor, permitted |
| Account takeover | backend catalog returns 78/79/18, raw 88.65, fused 89, critical, held |
| Quantum separation | dedicated screen and investigation notice; no fraud-score coupling |
| Honest benchmark-v1 | three operating points, comparator definitions, cohorts, limitations, exact statement |
| Loading/empty/error/degraded states | reusable state primitives across product data surfaces |
| Keyboard and accessibility | focus styling, semantic controls/tables, keyboard rows, trapped/restored dialog focus, login and investigation axe checks |
| Original visual identity | bespoke command-centre shell and investigation convergence; no dashboard theme |
| Frontend quality gates | Prettier, ESLint, strict TypeScript, Vitest with V8 coverage, production build, npm audit |
| Backend regression gates | Ruff, mypy, PostgreSQL pytest suite, migration/OpenAPI checks, dependency audit |
| Runtime health | Compose, PostgreSQL, `/health`, `/ready`, frontend-to-API verification |

Milestone 6 remains responsible for the final masterpiece-level visual critique, broader rendered
responsive refinement, final animation work, complete end-to-end browser coverage, and evidence
capture.
