# RiskWeave AI — Locked Decisions

- **Product name:** RiskWeave AI
- **Repository:** `riskweave-ai`
- **Hackathon:** FinSpark’26
- **Official team:** CyberForge
- **Public maintainer wording:** `Built and maintained by Shrey Bansal.`
- **Problem statement:** Problem Statement 2 — AI-Driven Correlation of Cybersecurity Telemetry and Transactional Behaviour
- **Primary use case:** Account takeover followed by an attempted fraudulent transfer

## Authority rule

The ChatGPT conversation may be supplied to Codex for background, intent, and rationale. The repository documents are the final source of truth. If earlier discussion conflicts with these documents, follow these documents.

The canonical repository read order is defined in `AGENTS.md` and repeated in `README.md` and `CODEX_START_PROMPT.md`.

## Core product principle

> A cyber event may look harmless alone. A transaction may look legitimate alone. Together, they may reveal an attack.

## Locked scoring decisions

```text
fused_score =
    0.45 × cyber_score
  + 0.45 × transaction_score
  + correlation_bonus
```

- Clamp the result to 0–100.
- Round half-up once on the backend after clamping.
- The frontend displays backend values and never recalculates a score.
- Correlation bonus is capped at 18.

| Score | Severity | Response |
|---:|---|---|
| 0–19 | Low | Allow |
| 20–39 | Guarded | Allow and monitor |
| 40–59 | Elevated | Step-up verification |
| 60–79 | High | Hold for analyst review |
| 80–100 | Critical | Hold transaction and open critical incident |

Scenario B is locked to cyber score 40, transaction score 10, correlation bonus 0, raw fused score 22.5, and backend half-up rounded fused score 23. Its severity is `guarded`, its action is `allow_and_monitor`, and the transaction is permitted with no hold or step-up authentication.

A correlation bonus is awarded only when a documented cross-domain interaction rule is genuinely satisfied. A bonus must never be introduced or adjusted to reach a preferred score, severity, or action.

## Locked intelligence decisions

- Transparent security and transaction rules are the primary scoring method.
- A fixed-seed Isolation Forest supplies a maximum of 10 anomaly points to each individual risk stream.
- Training data is deterministic, synthetic historical behaviour.
- The anomaly model can never independently hold a transaction.
- Every visible explanation describes a concrete behavioural deviation.
- Do not expose unexplained model probabilities, confidence values, or opaque AI scores.

## Locked data and simulation decisions

- PostgreSQL is the only runtime database.
- Docker provides PostgreSQL locally; Supabase PostgreSQL is the preferred deployment database.
- Simulation uses a fixed epoch, fixed seeds, deterministic UUIDv5 identifiers, idempotent scenario runs, and atomic reset.
- Correlation includes only events satisfying:

```text
transaction_time - 30 minutes <= event_time <= transaction_time
```

- Events must match the transaction’s customer, account, and session.
- Future, mismatched, and out-of-window events are excluded and tested.
- A deterministic 14-day background dataset provides 15 background incidents; running all three showcase scenarios produces 18 visible incidents.

## Locked evaluation decisions

- A 48-case labeled synthetic benchmark compares isolated cyber rules, isolated transaction rules, and fused contextual decisions.
- Benchmark labels and fixtures are fixed independently of observed results; they must not be constructed or altered to guarantee that the fused method wins.
- Benchmark results are computed, deterministic, and explicitly labeled as prototype results on synthetic data.
- No benchmark result may be presented as real-world banking accuracy.

## Locked quantum-readiness decisions

- Cryptographic assets are linked to transaction channels.
- Quantum readiness remains separate from fraud-risk scoring.
- The product assesses migration priority and harvest-now-decrypt-later exposure; it does not detect an active quantum attacker.

## Hard constraints

- Free, open-source, or free-tier-compatible technologies only.
- Synthetic data only.
- No paid external AI API.
- No unsupported production-accuracy claims.
- No claim of detecting an active quantum-computing attacker.
- No generic AI-generated dashboard aesthetics.
- No scope expansion without approval.
- Prefer a complete, polished, deterministic prototype over broad but shallow feature coverage.
