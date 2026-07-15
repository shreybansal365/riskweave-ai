# RiskWeave visual-baseline checklist

## Historical Milestone 6 evidence

The existing captures in `docs/visual-baselines/milestone-6/` remain unchanged historical inputs:

- Overview at 1440×900 with the seeded 14-day dataset and no loading state.
- Incident queue with scenario markers, server filters, and readable fused scores.
- Account-takeover investigation showing 78 cyber, 79 transaction, bonus 18, fused 89, critical, held.
- Legitimate-new-device investigation showing 40 cyber, 10 transaction, bonus 0, fused 23, guarded,
  allow and monitor, and permitted.
- Simulator with all three backend-authoritative expected outcomes.
- Quantum-readiness inventory with separation disclaimer visible.
- Evaluation view with 40+, 60+, 80+, cohort context, limitations, and the exact bounded statement.

Do not overwrite or present those images as the post-redesign interface.

## Milestone 7B captured review matrix

The explicit visual capture command targets `docs/visual-baselines/milestone-7b/`. It completed on
15 July 2026 and the directory contains nine screens at each of `1440×900`, `1280×720`, and
`1024×768` (27 PNGs total):

1. Login
2. Operational overview
3. Incident queue
4. Account-takeover investigation
5. Legitimate-new-device investigation
6. Scenario simulator
7. Quantum readiness
8. System health
9. Evaluation

These files are reviewed Milestone 7B baselines, not final PPT screenshots. The Milestone 6 directory
was not overwritten. Capture provenance and exact filenames are indexed in
`docs/visual-baselines/milestone-7b/README.md`.

## Milestone 7B.1 focused brand evidence

The Concept A and login-route-focus capture writes only to
`docs/visual-baselines/milestone-7b1/`. It contains direct and reloaded login evidence at 1440×900,
login at 1024×768, authenticated shell evidence at both viewports, light/dark lockup previews, and a
favicon/small-size preview. The focused route heading remains the active element in the login
captures; the absence of a rectangle is therefore evidence of the scoped visual correction rather
than a scripted blur.

## Milestone 7B.1.1 inverse-brand and favicon evidence

The correction capture writes only to `docs/visual-baselines/milestone-7b1-1/`. It contains the
unchanged light lockup, corrected inverse dark lockup, favicon assets at 16/32/64 pixels on light and
dark surfaces, direct/reloaded login states and comparison, authenticated shell at 1440×900 and
1024×768, and a manual real-browser tab capture. The actual tab capture records browser/version,
cache-busting procedure, route, and observed icon in the directory README. Earlier baselines remain
untouched.

## Route-specific readiness

- **Login:** split authentication composition is complete; no credential, token, stale error, or
  session notice from an earlier run is visible.
- **Overview:** urgent metrics, controlled outcomes, priority investigations, analytical trends, all
  transaction-action categories, and source health are loaded from the API.
- **Incident queue:** transaction-state filter is visible; amount, C/T/bonus/fused composition,
  recommendation, transaction state, and case state remain readable.
- **Account takeover:** Decision Context shows the authoritative treatment; Decision Weave shows
  backend terms `0.45 × 78 = 35.10`, `0.45 × 79 = 35.55`, `+18.00`, and `88.65 → 89`; interaction
  sources, critical/held state, and next valid actions are visible.
- **Legitimate new device:** 40 cyber, 10 transaction, zero interaction, raw 22.50, rounded 23,
  Guarded, Allow and monitor, Permitted, no hold, and no step-up are explicit.
- **Simulator:** the normal, guarded, and critical stages read as one progressive decision story;
  admin controls have a settled state.
- **Quantum readiness:** migration-priority language and color remain distinct from fraud severity;
  the fraud-separation statement is visible.
- **System health:** authenticated integrity data has loaded; environment, dataset, readiness,
  scenarios, benchmark, reset, and audit state are truthful and contain no secret.
- **Evaluation:** the bounded conclusion and unequal-calibration limitation precede compact 40+/60+/
  80+ evidence; unfavorable fused results remain visible.

## Capture preparation

1. Restore the deterministic baseline.
2. Run all three showcase scenarios.
3. Seed and sign in with the intended synthetic admin identity.
4. Verify `/health`, `/ready`, `/api/system/context`, and `/api/system/integrity` return the expected
   safe state.
5. Verify no credential, bearer token, connection string, or raw environment value is visible.
6. Wait for route-specific persisted content and local fonts.
7. Enable reduced motion and return scroll position to zero.
8. Confirm no tooltip, toast, loading skeleton, error state, dialog, or debug console obscures evidence.
9. Capture exactly at 1440×900, 1280×720, and 1024×768.
10. Keep the Milestone 6 directory untouched.

## Review after capture

For every PNG verify:

- the shell is complete rather than collapsed or half-loaded;
- no primary action or decision field is clipped;
- only labelled enterprise tables use horizontal overflow;
- Decision Weave retains semantic reading order and never suggests raw-score addition;
- route title, environment label, dataset state, and content do not contradict each other;
- severity, transaction state, and migration priority remain text-labelled and visually distinct;
- Scenario B does not imply a hold, step-up, or analyst-created allow action;
- benchmark and synthetic-data qualifications remain legible;
- no raw token, password, email password hint, stack trace, or development overlay appears.

Capture with:

```bash
cd frontend
npm run test:e2e:visual
```

Capture the narrowly scoped Milestone 7B.1.1 evidence with:

```bash
cd frontend
npm run test:e2e:brand-visual-7b1-1
```
