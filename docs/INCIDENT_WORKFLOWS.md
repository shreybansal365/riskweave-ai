# RiskWeave AI — Incident Workflow

## Principles

- Analysts and admins may investigate and apply the same bounded incident actions.
- Scenario execution and reset remain separate admin-only capabilities.
- Scores, severity, and recommended action are immutable investigation evidence during Milestone 4.
- Every accepted action appends one `AnalystAction` and one security `AuditEvent`.
- Incident and transaction rows are locked while a mutation is validated and persisted.
- An optional `expected_updated_at` value detects a stale client view.
- An `Idempotency-Key` maps to a deterministic action UUID for the incident and analyst.

## Incident status transitions

| Action | Allowed current status | New status |
|---|---|---|
| `start_review` | `open` | `in_review` |
| `mark_confirmed_fraud` | `open`, `in_review` | `confirmed_fraud` |
| `mark_legitimate` | `open`, `in_review` | `legitimate` |
| `close_incident` | `in_review`, `confirmed_fraud`, `legitimate` | `closed` |
| `add_note` | any status | unchanged |

`PATCH /api/incidents/{incident_id}` maps the requested target status to these explicit actions. A
client cannot transition a case back to `open` or mass-assign another field.

## Simulated transaction responses

| Action | Allowed transaction state | New transaction state |
|---|---|---|
| `simulate_hold` | `pending`, `permitted`, `released` | `held` |
| `simulate_release` | `held` | `released` |
| `simulate_decline` | `pending`, `held` | `declined` |

A simulated transaction response does not overwrite the incident’s derived score, severity,
recommendation, or evidence. No simulated response is accepted after the incident is closed.

Marking a case legitimate or confirmed fraud classifies the investigation; it does not silently
change the transaction. An analyst uses a separate explicit simulated-response action if the
transaction state should change in the prototype.

## Idempotency and conflicts

For a first request, the service:

1. locks the incident and transaction rows;
2. checks an optional concurrency token;
3. validates the state transition;
4. derives the deterministic action identifier;
5. persists the action, state changes, and audit record in one transaction.

Replaying the same key, action, and note returns the persisted result without a duplicate. Reusing the
same key with different content returns `409 Conflict`. A stale concurrency token or invalid state
transition also returns `409 Conflict` with a safe explanation.

## Audit detail

Audit details contain the action type, previous and new incident status, previous and new transaction
status, and a deterministic idempotency fingerprint. They do not store access tokens, passwords, or
the raw idempotency key.

