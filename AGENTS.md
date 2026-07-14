# AGENTS.md — Codex Instructions

## Canonical read order

This file is read first. Before modifying any repository file, read the remaining authoritative documents completely in this order:

1. `PROJECT_DECISIONS.md`
2. `SPEC.md`
3. `ARCHITECTURE.md`
4. `DATA_SCHEMA.md`
5. `UI_SYSTEM.md`
6. `SECURITY.md`
7. `DEMO_SCENARIOS.md`
8. `ACCEPTANCE_TESTS.md`
9. `DEPLOYMENT.md`

`CODEX_START_PROMPT.md` is an operational handoff prompt, not a higher-authority specification. `README.md` is an index and later becomes the public product README.

## Authority

- Repository specifications override earlier conversation.
- `PROJECT_DECISIONS.md` contains locked product decisions.
- Do not silently reinterpret or expand scope.
- If documents conflict, stop before implementation, identify the exact conflict, and request approval for a reconciliation.

## First response for a new implementation phase

Do not code immediately. First:

1. inspect the repository and current changes;
2. summarise the approved phase and use case;
3. identify ambiguities or conflicts;
4. propose the bounded implementation work;
5. map it to acceptance tests;
6. identify engineering risks;
7. wait for approval before large changes.

## Engineering rules

- Keep risk scoring explainable.
- Keep scenarios, benchmark fixtures, identifiers, and timestamps deterministic.
- Keep frontend and backend values consistent.
- The frontend must never calculate risk scores, thresholds, severity, or recommended action.
- Use strict TypeScript and Python type hints.
- Validate all API schemas.
- Validate event-specific attributes before persistence.
- Keep business logic out of route handlers.
- Keep scoring and model logic out of UI components.
- Add tests with each feature.
- Use Alembic migrations for database changes.
- PostgreSQL is the only runtime database.
- Use free/open-source/free-tier-compatible technology only.
- Use synthetic data only.
- No paid external AI API.
- No real banking data.
- No scope expansion without approval.

## Risk-intelligence rules

- Use the exact formula and thresholds in `ARCHITECTURE.md`.
- Clamp and round once on the backend.
- Correlation bonus cannot exceed 18.
- Isolation Forest uses deterministic synthetic history and seed `26026`.
- Anomaly contribution cannot exceed 10 points per stream.
- Rules remain the primary scoring mechanism.
- Anomaly output alone cannot trigger step-up authentication or a hold.
- Explain observable deviations; never expose an opaque AI probability or confidence value.

## Data and simulation rules

- Use the fixed simulation epoch and seed from `DEMO_SCENARIOS.md`.
- Use UUIDv5 for seeded and scenario-generated records.
- Scenario runs are idempotent.
- Reset is atomic and restores the exact baseline manifest.
- Correlation requires matching customer, account, and session plus the approved inclusive time window.
- Quantum-readiness data never modifies fraud-risk scores.

## UI rules

Avoid:

- purple-blue gradients;
- neon hacker visuals;
- excessive glassmorphism;
- giant rounded cards;
- meaningless charts;
- random AI badges;
- decorative shields;
- fake maps;
- template-like admin layouts;
- default component-library styling without bespoke design work.

The investigation workspace is the hero screen. Scenario B must visibly show guarded, monitored, and permitted with no hold or step-up.

## Verification after each phase

- format;
- lint;
- type-check;
- run unit tests;
- run integration tests where applicable;
- run relevant end-to-end or visual checks where applicable;
- report changed files;
- report unresolved issues;
- compare against acceptance criteria;
- stop at the approved phase boundary.

## Unsupported claims prohibited

Do not claim:

- zero false positives;
- guaranteed fraud prevention;
- production readiness;
- certified compliance;
- active quantum-attack detection;
- real-world accuracy from synthetic benchmark results;
- quantified banking losses prevented without defensible evidence.

A feature is complete only when implementation, tests, states, documentation, and acceptance criteria are all satisfied.
