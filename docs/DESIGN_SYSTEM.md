# RiskWeave implemented design system

## Product character

RiskWeave is a premium banking-security command centre: calm, exact, operational, and editorially
controlled. It does not imitate a generic admin template or theatrical cybersecurity dashboard. The
visual system prioritizes an analyst's decision, then the evidence supporting it, then provenance and
supporting context.

Milestone 7B gives the product a restrained signature: separate cyber and transaction evidence pass
through documented cross-domain interactions and become one explainable, backend-authoritative
decision. That signature is strongest in the investigation workspace and remains secondary elsewhere.

## Editorial hierarchy

The interface uses three explicit information levels:

1. **Decision-critical state** — fused decision, transaction treatment, recommended response, and
   urgent analyst work.
2. **Investigation evidence** — cyber, transaction, interaction, chronology, and bounded
   customer/account context.
3. **Supporting context** — provenance, system metadata, benchmark method, and migration detail.

Every level must not become an equal white card. Decision-critical areas may use inverse or emphasized
surfaces; evidence uses compact ledgers and open sections; provenance belongs behind progressive
disclosure where it is not needed for immediate triage.

## Foundations and semantic tokens

Tokens live in `frontend/src/styles/tokens.css`. Components consume semantic roles rather than
scattering colors or inventing page-specific risk meanings.

Core surface and text roles include:

- `--canvas`, `--surface`, `--surface-subtle`, `--surface-emphasis`, and `--surface-inverse`;
- `--text-primary`, `--text-secondary`, `--text-muted`, and `--text-inverse`;
- `--border`, `--border-strong`, and `--focus`.

Evidence and outcome roles include:

- `--signal-cyber` for cyber evidence;
- `--signal-transaction` for transaction evidence;
- `--signal-correlation` for eligible cross-domain interaction;
- `--risk-critical` and `--risk-elevated` for fraud-risk state;
- `--outcome-verified` for legitimate or released outcomes;
- `--migration-priority` and `--migration-priority-soft` for cryptographic migration posture.

Quantum migration priority deliberately has its own semantic color family. It must never borrow a
fraud severity treatment or imply that migration priority contributed to an incident score.

The spacing scale is based on 4 px. Controls use a restrained radius; panels use a slightly larger
but still compact radius. Borders and surface contrast establish hierarchy before shadows. Shadows
are reserved for dialogs, toasts, sticky layers, and actively elevated investigation surfaces.

Operational body text is at least 14 px and secondary metadata is at least 12 px. Eleven-pixel text is
limited to nonessential monospace identifiers. Tabular numerals are used for scores, weighted terms,
amounts, timestamps, and benchmark metrics.

## Surface grammar

Reusable `Panel` variants express meaning rather than decoration:

- `contained` — bounded task or control surface;
- `open` — editorial section that should not resemble another equal card;
- `ledger` — compact quantitative or evidence register;
- `evidence` — investigation evidence with stronger provenance cues.

Page headers also use route-specific variants (`briefing`, `queue`, `stage`, `register`, `report`, and
`diagnostic`) so the overview, queue, simulator, migration register, evaluation report, and system
diagnostic do not share a template-like composition.

## Reusable components

Implemented primitives include:

- role-aware application shell and grouped navigation;
- route-specific page and panel headers;
- risk and status badges that always include text;
- authoritative score and operational metric displays;
- enterprise table frame with labelled horizontal overflow;
- filter-bar composition with URL-backed state;
- Decision Weave, decisive-evidence ranking, contribution ledger, and evidence-lane timeline;
- separate disposition, transaction-response, and analyst-note panels;
- confirmation dialog with focus trapping and restoration;
- loading, empty, degraded, error, and service-status states;
- accessible tooltips and dismissible notifications.

No complete dashboard theme is used. Recharts provides chart geometry only; RiskWeave owns each
chart's question, copy, palette, density, textual summary, and surrounding hierarchy.

## Decision Weave contract

The hero investigation component has meaningful DOM order:

1. cyber evidence;
2. backend-authored cyber weighted term;
3. eligible cross-domain interactions;
4. backend-authored transaction weighted term;
5. transaction evidence;
6. authoritative decision.

`fusion_projection` supplies the score, decimal weight, and weighted term for both streams, plus the
interaction bonus, raw fused value, rounded fused result, and `ROUND_HALF_UP` mode. The frontend does
not contain `0.45`, calculate a weighted term, apply a threshold, or infer an action.

Interaction knots pair only persisted interaction contributions with their documented cyber and
transaction source evidence. When no eligible rule exists, the component says so explicitly and
shows a zero bonus rather than drawing a decorative connection. An adjacent text alternative states
the same meaning without depending on layout or color.

The first fold pairs the Decision Weave with:

- a case header containing fused risk, severity, case state, transaction state, and treatment;
- a Decision Context ledger containing amount, beneficiary, channel, destination risk, customer,
  account, and session origin;
- ranked decisive evidence;
- the next server-approved workflow controls.

Scenario B remains visibly `Guarded`, `Allow and monitor`, and `Permitted`, with no hold, no step-up,
and no eligible interaction bonus. `Allow and monitor` is treatment, not an invented analyst action.

## Route-specific composition

- **Login** — split product-context and restrained authentication surfaces; no marketing hero.
- **Overview** — three urgent metrics, a controlled-outcome ledger, priority cases, then analytical
  trends and source coverage.
- **Incident queue** — filter/search workbench followed by one dense server-backed triage register.
- **Investigation** — decision first, evidence second, context and provenance third, with a bounded
  action rail.
- **Simulator** — a progressive three-stage story from normal to guarded to critical, not pricing
  cards.
- **Quantum Readiness** — migration register and prioritized asset, with explicit fraud separation.
- **System Health** — diagnostic ledger using authenticated integrity evidence, not guessed green
  states.
- **Evaluation** — bounded conclusion and calibration warning before compact comparator evidence.

## Accessibility and interaction

- the skip link targets the main workspace;
- document titles and the primary heading update with route changes;
- route navigation moves focus to the destination heading or main content;
- queue rows have row-header semantics and keyboard activation;
- dialogs trap focus, support Escape, and restore focus to the trigger;
- successful workflow mutations focus a confirmation; stale `409` conflicts focus an alert;
- session expiry clears memory auth and presents an explicit sign-in notice;
- danger toasts receive focus and persist until dismissed; timed informational toasts pause on hover
  or focus;
- an unsaved analyst note blocks in-app departure and invokes the browser unload warning;
- text accompanies every severity, state, chart, and evidence encoding;
- reduced-motion preferences disable nonessential movement.

The Milestone 6 axe and keyboard results remain historical evidence. Production-CSS contrast, 200%
zoom, the updated mutation/session flows, and all Milestone 7B viewports must be rerun before the
redesign is accepted.

## Responsive boundary

The product has deliberate desktop compositions at:

- **1440×900** — full navigation rail, multi-column operational layouts, complete Decision Weave, and
  sticky action/context relationships where useful;
- **1280×720** — denser gutters and supporting grids, with every primary action and decision field
  still visible;
- **1024×768** — stacked investigation/action regions, preserved Decision Weave semantic order,
  deliberate table overflow, simulator reflow, and viewport-bounded dialogs.

This is not a mobile-first redesign. Enterprise tables may scroll horizontally inside a labelled
region; required triage columns are not silently deleted or compressed below the type contract.

## Visual-review evidence

Milestone 6 captures in `docs/visual-baselines/milestone-6/` are immutable historical inputs. The
Milestone 7B capture test targets nine screens at all three required viewports and writes to
`docs/visual-baselines/milestone-7b/`. Those new files are **planned/pending** until the explicit visual
capture command succeeds; their directory must not be cited as completed evidence beforehand.

## Explicitly rejected patterns

The interface must not use marketing gradients, glass-card fields, neon hacker styling, glowing
shields, fake maps, random AI badges, oversized rounded cards, repetitive decorative icons,
meaningless charts, unsupported success metrics, or a stock admin-dashboard composition.
