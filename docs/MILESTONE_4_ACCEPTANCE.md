# Milestone 4 Acceptance Mapping

| Acceptance criterion | Implementation evidence | Test evidence |
|---|---|---|
| Milestone 3 checkpoint exists | Commit `4c0d8f462e46a5d5d6bda1fb198f5c94251494fe` | Git history check |
| Incident list/detail APIs | Typed routes, schemas, and `IncidentQueryService` | Pagination, filters, search, chronology, score/contribution, missing-ID tests |
| Analyst workflows | `AnalystWorkflowService` with explicit transitions and row locks | Transition, stale token, idempotency replay/key conflict, note, hold/release tests |
| Server-side RBAC | Existing bearer dependencies; scenario run/reset use `AdminUser` | Analyst denial and admin success tests with authorization audit |
| Dashboard source consistency | `DashboardService` aggregates persisted rows | Source count, severity total, held count, 14-day reconciliation tests |
| Customer/account context | Bounded `CustomerContextService` queries and masking | Customer/account linkage, limits, masking, and missing-ID tests |
| Scenario determinism | API delegates to Milestone 3 scenario/reset services | Idempotent replay and exact baseline fingerprint restoration tests |
| Quantum readiness | Pure deterministic readiness assessment over channel-linked assets | 88/urgent and 22/low reconciliation, explanations, channel counts, disclaimers |
| benchmark-v1 transparency | Read-only service evaluates immutable fixture | Three operating points, exact unfavorable 60+ result, six cohorts, limitations |
| API quality | Strict Pydantic schemas, bounded inputs, request IDs, safe errors | Validation, auth failure, empty state, and OpenAPI generation tests |
| Quality gates | Ruff, mypy, pytest, Vitest, dependency audits, Compose | Reported in Milestone 4 handoff |

No frontend business workflow, deployment change, presentation asset, screenshot, demo video, or
benchmark-v2 is included in this milestone.

