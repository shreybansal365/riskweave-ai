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

### Typography

- Use a locally bundled free variable font such as Inter.
- Use tabular numerals for scores, amounts, and timestamps.
- Maintain a compact enterprise hierarchy rather than oversized marketing typography.
- Default body text must remain readable at 14–16 px.

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

## Primary screens

1. Overview
2. Incident Queue
3. Investigation Workspace
4. Scenario Simulator
5. Customer and Account Context
6. Quantum Readiness
7. System Health

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

Scenario B must visibly read:

- `Guarded`;
- `Allow and monitor`;
- `Transaction permitted`;
- no hold;
- no step-up authentication.

## Scenario Simulator

Required controls:

- Run normal activity
- Run unusual but legitimate activity
- Run account takeover
- Atomic reset

Each scenario shows `not_run`, `running`, `completed`, or `failed`; it reports the deterministic result and links to the generated investigation. Re-running a scenario must not create duplicate logical records.

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
- latest reset and audit-event status.

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
