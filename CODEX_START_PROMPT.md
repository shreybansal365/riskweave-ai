# Initial Codex Prompt

Read the associated ChatGPT conversation only to understand the background, product intent, quality expectations, and decision rationale behind RiskWeave AI.

The repository documents are authoritative. Read them completely in this canonical order:

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

If any earlier conversation conflicts with these files, follow the repository files. If the repository files conflict with one another, identify the conflict and stop before implementation.

Do not begin an implementation phase until the user explicitly approves that phase.

Before an approved phase:

1. inspect the repository and current changes;
2. summarise the approved scope;
3. identify any remaining ambiguity or technical risk;
4. propose the bounded work for that phase;
5. map it to acceptance tests;
6. state the exact verification commands and completion boundary;
7. wait for approval before making large changes.

The project must remain free/open-source/free-tier compatible, use synthetic data only, avoid paid APIs, keep scoring explainable and server-owned, preserve deterministic scenarios and benchmark results, and produce a bespoke banking-security interface rather than a generic AI-generated dashboard.
