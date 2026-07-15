# RiskWeave AI — UI and Design System

## Objective

The interface must look like a credible premium banking-security product: calm, exact, trustworthy, and data-rich without clutter. The investigation workspace—not a generic dashboard—is the hero experience.

All scores, severities, actions, metrics, and benchmark results are API-owned values. The frontend formats and presents them but never recalculates them.

## Anti-slop rules

Do not use:

- generic purple-blue gradients;
- neon hacker visuals;
- excessive glassmorphism;
- oversized rounded cards;
- meaningless charts;
- fake maps;
- decorative shields;
- random AI badges;
- filler animations;
- inconsistent metrics;
- stock admin-dashboard layouts;
- default component-library themes presented without bespoke design work.

## Visual direction

### Palette

- Midnight: `#0B1424`
- Deep navy: `#111C2E`
- Slate: `#364152`
- Canvas: `#F5F7FA`
- Surface: `#FFFFFF`
- Teal accent: `#0F766E`
- Cyan correlation: `#0891B2`
- Verified green: `#15803D`
- Elevated amber: `#B45309`
- Critical red: `#B42318`
- Border: `#D9E0E8`
- Muted text: `#667085`
- Primary text: `#182230`

Implement semantic tokens such as `surface`, `text-primary`, `risk-critical`, and `signal-correlation`; components must not scatter raw colour values.

### Locked brand identity

Concept A is the definitive RiskWeave AI logo. The production SVG preserves two woven signal
strands, cyan/teal cyber evidence, amber transaction evidence, one authoritative decision path, and
one solid endpoint. The light variant keeps the approved navy decision treatment. The dark variant
uses the same geometry with inverse slate `#98A4B3` against `#08111F` (7.47:1 contrast), without a
halo, keyline, or outlined target ring. The full wordmark is exactly `RiskWeave AI`; `AI` is teal and
has the same visual cap height as `RiskWeave`, never superscript or microtype.

The full-size mark uses the reference-derived `700×240` Concept A geometry documented in
`docs/visual-baselines/milestone-7b1-2/GEOMETRY_NOTES.md`. Its tall descending cyber sweep, separate
upper cyber arc, broad transaction rise, two woven decision sections, and 25-unit endpoint are the
locked production silhouette. Normal-size React, light-lockup, dark-lockup, and standalone assets
use the same path and endpoint coordinates. Small favicon and app-icon treatments may remain
optically simplified.

Use the light-surface lockup with a navy wordmark and the dark-surface lockup with a near-white
wordmark. Exported public lockups use outlined wordmark paths for cross-machine consistency; the
reusable Brand component provides semantic HTML text, full and icon-only variants, accessible
naming, and an explicit decorative mode. The optimized favicon may simplify fine geometry but must
preserve the two-strand crossover and single endpoint. Minimum sizes, clear space, asset locations,
tagline usage, and prohibited modifications are documented in `docs/BRAND_GUIDELINES.md`.

The optional tagline `Cyber intelligence. Financial confidence.` is selective. Do not repeat it in
navigation or ordinary page headers. The brand mark is an identity asset; it is not the operational
Decision Weave and never stands in for case evidence or score provenance.

### Typography

- Use a locally bundled free variable font such as Inter.
- Use tabular numerals for scores, amounts, and timestamps.
- Maintain a compact enterprise hierarchy rather than oversized marketing typography.
- Default body text must remain readable at 14–16 px.
- Operational body text is at least 14 px; secondary metadata is at least 12 px.
- Eleven-pixel text is reserved for nonessential monospace identifiers and may not carry a decision,
  action, amount, status, explanation, or navigation label.
- Use tabular numerals for scores, weighted terms, amounts, and timestamps.

### Spacing, shape, and elevation

- Base spacing unit: 4 px.
- Primary spacing steps: 4, 8, 12, 16, 24, 32, 40.
- Control radius: 6 px.
- Panel radius: 8 px.
- Avoid pill-shaped containers except compact status chips.
- Use borders and surface contrast before shadows.
- Shadows are reserved for overlays, sticky layers, and active investigation panels.

### Layout

- Persistent restrained navigation rail or sidebar.
- Dense top context bar for environment, simulation time, and signed-in role.
- Main workspace optimized for 1440×900 and fully usable at 1280×720.
- Primary actions remain visible without horizontal scrolling at both required sizes.
- Customer and transaction context may use a secondary rail or drawer, but critical evidence stays in the main reading flow.
- The shell groups operational routes separately from resilience/evidence routes.
- Environment, simulation epoch/state, and dataset state are backend-authoritative context. The
  frontend build mode may not invent or relabel them.

### Editorial hierarchy

- Level 1: decision-critical state—fused decision, transaction treatment, recommended action, and
  urgent analyst work.
- Level 2: investigation evidence—cyber, transaction, interaction, chronology, and customer context.
- Level 3: supporting context—provenance, benchmark method, system metadata, and migration detail.
- Do not express every level as an equal white card. Use open sections, compact ledgers, and bounded
  action/evidence panels according to meaning.

## Primary screens

1. Overview
2. Incident Queue
3. Investigation Workspace
4. Scenario Simulator
5. Customer and Account Context
6. Quantum Readiness
7. System Health
8. Evaluation

## Overview

Approved headline metrics:

- open investigations;
- critical incidents;
- held transactions;
- permitted-but-monitored transactions.

Approved analytical views:

- 14-day incident volume and severity trend;
- incident distribution by severity;
- recent incident queue;
- compact synthetic benchmark comparison table.

Every metric must have a tooltip or adjacent definition. Do not display “false positives prevented,” money saved, accuracy, or loss avoided unless a defined synthetic benchmark calculation explicitly supports the wording.

The benchmark table must state:

> Prototype evaluation on deterministic synthetic data; not evidence of real-world banking accuracy.

It must identify `benchmark-v1 — mixed synthetic security benchmark`, label the three comparators
exactly, distinguish 40+ escalation, 60+ operational intervention, and 80+ critical-only results, and
show cohort-level context. The 60+ result is primary only when the interface describes transaction
holds or intervention. Benchmark surfaces must expose the known composition and calibration
limitations rather than implying universal false-positive reduction.

## Incident Queue

Required columns:

- incident identifier;
- scenario marker where applicable;
- customer/account identifier;
- transaction amount;
- cyber score;
- transaction score;
- correlation bonus;
- fused score;
- severity;
- transaction status;
- incident status;
- created time.

Filters must support severity, transaction status, incident status, scenario/background origin, and search. Rows link directly to the correct investigation URL.

The transaction-status filter is server-backed. Wide tables use a labeled horizontal-scroll region,
sticky headers, and a sticky incident-identity or risk column where useful. Required triage fields are
not deleted at 1024 px and text is not compressed below the approved type scale.

## Hero screen: Investigation Workspace

Must include:

- case header and scenario/background marker;
- fused score and severity;
- customer/account summary;
- cyber score;
- transaction score;
- correlation bonus;
- combined chronological timeline;
- grouped contribution breakdown;
- plain-language explanation;
- recommended action;
- current transaction status;
- channel-linked quantum-readiness context that is visually secondary;
- analyst controls and notes.

The key visual shows separate cyber and transaction evidence converging into one decision. Cyber, transaction, anomaly, and correlation contributions must remain visually distinguishable.

### Decision Weave

The investigation signature is a server-authoritative Decision Weave:

1. prioritized cyber evidence;
2. prioritized transaction evidence;
3. genuine interaction knots paired to their source evidence;
4. one decision node containing source scores, weighted terms when returned by the backend,
   correlation bonus, raw fused score, rounded score, severity, recommendation, and transaction state.

The component must not imply that raw cyber and transaction scores are directly added. Explicit
weights and weighted terms may be displayed only when supplied by the backend; the frontend contains
no scoring constant or independent calculation. DOM order and an adjacent text alternative preserve
the same meaning at 1440, 1280, and 1024 px. Connections are evidence-bearing rather than decorative
and are never distinguished by colour alone.

The first fold also contains a compact Decision Context ledger answering what happened, how risky it
is, why, what happened to the transaction, and what the analyst can do next. Case disposition,
analyst notes, and simulated payment response are separate control groups.

Scenario B must visibly read:

- `Guarded`;
- `Allow and monitor`;
- `Transaction permitted`;
- no hold;
- no step-up authentication.

It must also explain why intervention was avoided, show that no genuine cross-domain interaction was
satisfied, and present `Allow and monitor` as authoritative treatment rather than as an invented
analyst workflow action.

## Scenario Simulator

Required controls:

- Run normal activity
- Run unusual but legitimate activity
- Run account takeover
- Atomic reset

Each scenario shows `not_run`, `running`, `completed`, or `failed`; it reports the deterministic result and links to the generated investigation. Re-running a scenario must not create duplicate logical records.

Scenario execution and atomic reset controls are visible and enabled only for authenticated admins.
Analysts may view scenario state and investigate generated incidents but receive no executable run or
reset control.

## Customer and Account Context

Show only decision-relevant synthetic context:

- customer and account summary;
- usual locations and login hours;
- known devices;
- transaction amount baseline;
- normal velocity;
- known beneficiaries;
- recent sessions and transactions.

Avoid psychological profiling or unsupported customer labels.

## Quantum Readiness

Show:

- transaction channel;
- linked crypto asset;
- current algorithm family;
- data sensitivity and confidentiality lifetime;
- migration status;
- readiness priority and reasons.

This screen and the investigation context must explicitly state that readiness does not alter fraud-risk scores and does not indicate an active quantum attack.

## System Health

Admin-only operational view:

- API and database readiness;
- migration status;
- seed manifest version;
- simulation epoch and seeds;
- scenario state;
- benchmark fixture version;
- latest reset, summarized audit integrity, and latest safe audit reference;
- truthful environment/deployment context and safe API origin;
- baseline and active incident counts plus dataset fingerprint or verified integrity state.

Do not expose secrets, plaintext credentials, connection strings, or raw tokens.

## Component requirements

- risk badge;
- score meter;
- contribution bar;
- correlation connector;
- incident timeline;
- event item;
- status chip;
- action panel;
- dense table;
- benchmark comparison table;
- empty state;
- loading skeleton;
- success state;
- error state;
- confirmation dialog;
- toast.

## Interaction requirements

- working filters with URL-compatible state where useful;
- direct incident URLs;
- deterministic scenario controls;
- clear progress states;
- confirmation before analyst or reset actions;
- visible keyboard focus;
- correct focus trapping and restoration for dialogs;
- no colour-only severity;
- no optimistic display of a final action before the backend confirms it.

## Motion

Use restrained motion only for:

- timeline arrival;
- backend-confirmed score transition;
- dialog or drawer opening;
- scenario progress and completion.

Honor reduced-motion preferences. Motion must not hide or delay essential information.

## Responsive and accessibility requirements

- Complete usability at 1440×900 and 1280×720.
- No mobile application is required, but narrower desktop layouts must degrade safely.
- WCAG-aware contrast for text and controls.
- Semantic headings, labels, tables, and status announcements.
- Keyboard access for filters, dialogs, tables, scenario controls, and analyst actions.
- Automated accessibility checks on Overview, Queue, Investigation, and Simulator.
- Deliberate 1024×768 composition: Decision Weave retains semantic order, Simulator reflows before
  cards become narrow, the investigation action rail stacks, tables expose deliberate overflow, and
  dialogs remain viewport-bounded with internally scrollable content.
- Skip-to-main-content, route-specific document titles, heading focus after navigation, row-header
  semantics, focus restoration, session-expiry announcement, and unsaved-note protection.
- Programmatically focused route headings use a dedicated noninteractive route-focus target. They
  remain focusable and announced after navigation but do not receive the interactive-control focus
  ring. Links, buttons, fields, navigation items, dialogs, rows, and other controls retain the strong
  visible focus treatment.
- Production-CSS contrast and 200% zoom verification supplement automated axe checks.

## Required UI states

Every data surface must define:

- loading;
- empty;
- success;
- recoverable error;
- authorization failure;
- backend wake-up or unavailable state where relevant.

## Screenshot-ready views

- Overview with the 14-day dataset
- Incident Queue with showcase markers
- Account-Takeover Investigation
- Unusual-but-Legitimate Investigation
- Scenario Simulator
- Quantum Readiness
- Synthetic benchmark comparison
