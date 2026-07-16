# Milestone 7C acceptance — Resource-Disciplined Release Candidate

**Completed:** 15 July 2026
**Starting checkpoint:** `8875531acbdde754c8f507001d98c1633f2c9296`
**Starting state:** clean working tree
**Scope boundary:** bounded local release-candidate refinement only; no deployment, publication,
presentation, portal submission, benchmark-v2, scoring change, brand change, or broad redesign

## Verdict

**PASS.** RiskWeave is a verified local release candidate and is ready for a separately approved
deployment pass. The release-candidate work resolves RW-7B2-001, RW-7B2-007, RW-7B2-010, and
RW-7B2-016, preserves the locked intelligence and workflow contracts, and introduces no remote font
dependency or claim of live banking-system integration.

This verdict applies to the deterministic local prototype. It is not a production-readiness,
compliance, real-world accuracy, or deployment claim.

## Implemented release-candidate corrections

### RW-7B2-001 — current workload versus trend window

`GET /api/dashboard/trends` now returns backend-authored `window_incident_count`. The service derives
that value by summing the exact returned 14-day series rather than using an independent constant.

- current persisted workload after all showcase scenarios: **18 incidents**;
- incidents represented by the returned 14-day baseline trend: **15 incidents**;
- the Overview labels these as **Current visible incidents** and **14-day chart window**;
- the frontend renders both API values and does not reconstruct either count.

Backend integration, frontend unit, Chromium data-consistency, and visual checks assert `18 != 15`,
`window_incident_count == sum(points[].incident_count)`, and a visible distinction at 1440×900 and
1024×768.

### RW-7B2-007 — locally bundled application font

The application uses exact-pinned `@fontsource-variable/inter` **5.2.8**, licensed under the
**SIL Open Font License 1.1 (`OFL-1.1`)**. Attribution and source details are recorded in
`THIRD_PARTY_NOTICES.md`.

- only the Latin variable normal face is imported into the Vite build;
- the emitted asset is `inter-latin-wght-normal-Dx4kXJAl.woff2` (48,256 bytes);
- the composed frontend serves it with HTTP 200 and `Content-Type: font/woff2`;
- source and production-output scans found no Google Fonts, CDN import, remote font URL, or runtime
  remote font request;
- codes, formulas, UUIDs, and operational identifiers retain the existing monospace stack;
- the frozen outlined RiskWeave AI wordmark and every brand asset remain unchanged.

The supported 1440×900, 1280×720, and 1024×768 layouts passed overflow and clipping checks after the
font change.

### RW-7B2-016 — persisted coverage versus service health

The dashboard projection and UI now describe deterministic source fixtures with the vocabulary:

- **Persisted source coverage**;
- **Fixture available**;
- **Fixture empty**;
- **Deterministic data available**.

The words Healthy, Connected, Reachable, and Ready remain reserved for actual frontend, backend, API,
PostgreSQL, and migration checks. No screen implies that a live SIEM, identity provider, endpoint
platform, core-banking system, or payment processor is integrated.

### RW-7B2-010 — current documentation reconciliation

The bounded documentation update:

- records the completed Milestone 7B screenshot evidence instead of calling it pending;
- includes Evaluation in the current route inventory;
- removes superseded current-state “through Milestone 4” language;
- aligns current dashboard API documentation with the generated OpenAPI contract;
- reflects the completed backend-authored interaction provenance and Scenario C familiarity/posture
  distinction from Milestone 7B.3;
- documents the 18-current/15-window contract, local font and attribution, and persisted-source
  terminology;
- leaves historical milestone reports and their original counts intact.

### Decision Weave code treatment

Long backend-authored rule codes remain complete in the DOM and accessible name, while a constrained
single-line, ellipsized visual treatment keeps them secondary to the evidence explanation. The full
value remains available through the accessible label and native title. No score, interaction pairing,
provenance, arithmetic, hierarchy, or evidence ordering changed.

## Route refinement and visual review

The release-candidate pass inspected Login, Overview, Incident Queue, both showcase investigations,
Simulator, Quantum Readiness, Evaluation, and System Health at 1440×900, 1280×720, and 1024×768.
Only concrete release defects were corrected:

- Overview now differentiates current workload from its historical chart window in the first fold;
- System Health distinguishes fixture availability from real runtime connectivity;
- long Decision Weave technical codes no longer break into isolated characters;
- the local variable font is applied consistently without clipping, collision, or unintended
  horizontal overflow.

Navigation, page architecture, cards, badge semantics, Concept A branding, favicon, route focus,
workflows, and visual hierarchy were not redesigned.

## Locked deterministic verification

The complete backend and browser regressions preserve:

| Scenario | Cyber | Transaction | Bonus | Raw fused | Rounded | Outcome |
|---|---:|---:|---:|---:|---:|---|
| Normal Activity | 10 | 10 | 0 | 9.00 | 9 | Low; permitted |
| Legitimate New Device | 40 | 10 | 0 | 22.50 | 23 | Guarded; allow and monitor; permitted |
| Account Takeover | 78 | 79 | 18 | 88.65 | 89 | Critical; held; open critical incident |

The deterministic seed, epoch, UUIDv5 identifiers, strict inclusive correlation window,
backend-authored interaction provenance, idempotent replay, atomic reset fingerprint, and
15-baseline-to-18-showcase incident counts all pass unchanged.

`benchmark-v1` remains the immutable 48-case mixed synthetic security benchmark. Its exact
unfavorable results are retained, including fused recall **0.3333** at the 60+ intervention point
versus **0.4444** for each isolated rule comparator. No fixture, label, metric, limitation, or bounded
claim changed.

## Verification results

### Static analysis, tests, coverage, and build

| Gate | Result |
|---|---|
| Ruff format check | Passed; 92 Python files already formatted |
| Ruff lint | Passed |
| mypy | Passed; 88 source files checked |
| Backend pytest with PostgreSQL integration | 103 passed |
| Backend coverage | 94.78% total |
| Alembic drift check | Passed; no new upgrade operations |
| OpenAPI inspection | Passed; 20 paths; required trend count and exact coverage enum present |
| Prettier | Passed |
| ESLint | Passed with zero warnings |
| strict TypeScript | Passed |
| Frontend Vitest | 39 passed |
| Frontend coverage | 86.28% statements; 73.75% branches; 83.62% functions; 87.53% lines |
| Frontend production build | Passed |
| npm audit | 0 vulnerabilities |
| Python dependency audit | No known vulnerabilities |

The production build emits the local 48.25 kB Inter font. Final JavaScript/CSS output includes a
333.63 kB main entry (105.05 kB gzip), an approximately 392.81 kB Recharts-bearing Overview route
(111.66 kB gzip), and 82.81 kB CSS (16.50 kB gzip). These are practical local observations, not
production performance claims.

### Browser and accessibility

| Gate | Result |
|---|---|
| Complete applicable Chromium suite | 40 passed; 6 explicit visual-capture tests skipped by their gate |
| Focused post-copy Chromium regression | 3 passed: Overview reconciliation, 7C contract, visual capture |
| Principal-route axe checks | No serious or critical violations |
| Required viewports | 1440×900, 1280×720, and 1024×768 passed |
| Direct entry and reload | Passed; route-focus correction preserved |
| Font network audit | Local asset requested; no unexpected third-party or remote-font request |

Firefox and WebKit were intentionally not rerun in Milestone 7C, as required by the resource-disciplined
scope. Their combined final release verification remains deferred until the separately approved
post-deployment verification pass.

### Composed system

| Check | Result |
|---|---|
| `docker compose config --quiet` | Passed |
| PostgreSQL | Healthy |
| Backend | Healthy |
| Frontend | Healthy |
| `/login` | HTTP 200 |
| `/health` | HTTP 200; `status=ok`, version `0.5.0` |
| `/ready` | HTTP 200; database reachable; migrations current at `0003_intelligence_support` |

## Evidence inventory

The concise release-candidate evidence is indexed in
`docs/visual-baselines/milestone-7c/README.md` and contains only:

1. `overview-1440x900.png`
2. `overview-1024x768.png`
3. `account-takeover-decision-weave-1440x900.png`
4. `account-takeover-1024x768.png`
5. `legitimate-new-device-1440x900.png`
6. `system-health-1440x900.png`
7. `incidents-1440x900.png`
8. `evaluation-1440x900.png`
9. `presentation-shortlist-contact-sheet.png`

Historical Milestone 6, 7B, and brand evidence was not overwritten.

## Deliberate limitations

- All banking, identity, endpoint, transaction, quantum-readiness, and benchmark data is deterministic
  and synthetic; no live banking-system connector is claimed.
- `benchmark-v1` is small, mixed, synthetic, and not evidence of real-world accuracy or universal
  false-positive reduction.
- Authentication remains a local demonstration flow with an in-memory access token; refresh requires
  re-authentication.
- Cloud deployment, hosted failure recovery, production secrets, and deployment-provider validation
  remain outside this milestone.
- Firefox and WebKit remain reserved for the combined final release verification after deployment.
- The Recharts-bearing Overview route remains the largest route chunk; no premature dependency or
  chart rewrite was undertaken because it does not block the supported local workflows.

## Release-candidate readiness

RiskWeave passes the approved local Milestone 7C boundary. It is ready for a separately authorized
deployment and publication phase, while the limitations above remain explicit and the working tree is
left uncommitted for review.
