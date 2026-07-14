# Milestone 7A — Parallel Expert UI, Product, and Visual-Quality Audit

**Audit date:** 14–15 July 2026  
**Milestone 6 checkpoint:** 5c06cfd5ea78b7a827952898c06a019459f55c9e  
**Phase type:** Audit only; no redesign implementation  
**Primary viewport:** 1440 × 900  
**Required supporting viewports:** 1280 × 720 and 1024 × 768

## 1. Executive verdict

RiskWeave is already a credible, disciplined, and unusually honest prototype. It avoids the loudest
hackathon and AI-dashboard clichés. The interface uses a calm banking palette, restrained radii,
server-authoritative values, real analyst workflows, deterministic evidence, transparent benchmark
limitations, and a correct separation between fraud risk and quantum readiness. A reviewer can tell
that substantial engineering exists behind the interface.

It is not yet visually exceptional.

The main problem is not a lack of styling. It is a lack of sufficiently strong editorial hierarchy
and product-specific visual authorship. Most routes repeat the same page recipe: small uppercase
eyebrow, large title, explanatory sentence, divider, and a grid of equal white cards. The result is a
well-executed bespoke admin product, but not yet a memorable banking-security product.

RiskWeave's strongest idea is:

> Separate cyber and transaction signals becoming one explainable decision.

That idea is currently represented mostly as arithmetic boxes. The dominant visual reads like
“78 + 79 + 18 → 89,” which hides the 45/45 weighting and does not show which cyber and transaction
facts formed genuine interactions. The future interface must make evidence convergence—not card
regularity—the organizing language of the product.

### Executive decision

- Preserve the engineering and product correctness.
- Keep the calm, precise, non-theatrical character.
- Redesign around analyst decisions, not dashboard completeness.
- Build one restrained visual signature: the **Decision Weave**.
- Make the Account-Takeover and Legitimate-New-Device investigations the primary product proof.
- Treat Overview, Quantum Readiness, System Health, and Evaluation as different work modes rather
  than forcing them into one repeated dashboard template.
- Complete the redesign predominantly in the frontend.
- Approve a small additive backend slice only where server authority or the authoritative UI
  specification requires it.

## 2. Visual maturity score

### Current visual maturity: **6.7 / 10**

### Target visual maturity: **9.2 / 10**

| Dimension | Current | Target | Audit judgment |
|---|---:|---:|---|
| Trustworthiness | 8.0 | 9.5 | Strong server-authoritative and bounded language already creates trust. |
| Coherence | 7.6 | 9.3 | Tokens and components are consistent, but route identities are too similar. |
| Information discipline | 7.0 | 9.3 | Correct information exists, but primary and secondary detail compete. |
| Operational usefulness | 7.1 | 9.3 | Workflows are real; queue and first-fold triage context remain incomplete. |
| Originality | 5.7 | 9.0 | The product avoids clichés but still relies on common card-grid composition. |
| Product-specific identity | 5.8 | 9.4 | Evidence convergence has not yet become a recognizable design language. |
| Accessibility maturity | 7.0 | 9.2 | Semantics are strong; typography, focus, zoom, and dense-table readability need work. |
| Responsive maturity | 6.2 | 9.0 | Layout technically fits, but 1024 px composition degrades semantically. |
| Portfolio readiness | 7.0 | 9.3 | Engineering depth is obvious; final screenshots are not yet presentation-ready. |
| Demo readiness | 7.1 | 9.4 | Scenarios are strong; the five-second evidence story is not yet visible. |

## 3. Audit method and sources

Twelve independent reasoning passes were completed before synthesis:

1. Product Design Director
2. Banking SOC and Fraud-Operations Specialist
3. Information-Architecture Specialist
4. Visual-Systems and Brand Designer
5. Enterprise Data-Visualization Specialist
6. Investigation-Workflow Specialist
7. Accessibility and Inclusive-Design Specialist
8. Responsive and Layout Specialist
9. Motion and Interaction Designer
10. Anti-AI-Slop Reviewer
11. Portfolio and Recruitment Reviewer
12. Presentation and Demo Director

Each pass evaluated the product independently before conclusions were reconciled.

The synthesis inspected:

- the live product at http://localhost:4173;
- all nine principal routes;
- both showcase investigations;
- all Milestone 6 visual baselines;
- AGENTS.md and the canonical specifications;
- UI_SYSTEM.md;
- docs/DESIGN_SYSTEM.md;
- docs/FRONTEND_ARCHITECTURE.md;
- relevant implementation CSS and component structure as read-only evidence;
- the broader project intent from the associated ChatGPT conversation.

### Live and baseline-specific observations

- The 1024 px convergence grid auto-places its operators into a semantically scrambled two-row
  equation. Cyber and Transaction occupy the first row while a bare plus sign, Bonus, and Fused
  decision occupy the second; the arrow is absent.
- The live System Health screen labels the frontend as a “production environment” while displaying
  http://localhost:8000 as the API origin.
- During the live audit, the Legitimate-New-Device investigation and Evaluation route each showed
  the product error state on first entry and recovered after Retry. No browser console error was
  present. This requires reproduction before the final demo; it is not treated as a proven engine or
  API defect in this audit.
- Direct inspection found incomplete or black shell regions in exactly two preserved PNGs:
  `legitimate-new-device-investigation-1440x900.png` and `system-health-1440x900.png`. Account
  Takeover, Quantum Readiness, and Evaluation are complete captures. The two affected live routes can
  render, so this is a presentation-evidence defect pending capture-path diagnosis, not proof of a
  route-specific application failure. It is separate from the first-entry Retry observation above.

## 4. Product invariants the redesign must protect

The redesign is not permitted to weaken or reinterpret:

- API-backed values;
- exact scenario scores and outcomes;
- fused score = 0.45 × cyber score + 0.45 × transaction score + eligible correlation bonus,
  clamped to 0–100 and rounded half-up once on the backend;
- server-owned score calculation and one-time half-up rounding;
- Scenario B as Guarded, Allow and Monitor, Permitted, with no hold and no step-up;
- Account Takeover as Critical, 89, and Held;
- backend-owned workflow legality;
- analyst/admin RBAC;
- direct incident links;
- queue URL filters and return-state preservation;
- deterministic scenario execution and reset;
- benchmark-v1's unfavorable results and limitations;
- quantum/fraud separation;
- memory-only access-token handling;
- accessibility semantics and test coverage;
- existing backend, frontend, integration, and browser verification.

## 5. Independent expert findings

### A. Product Design Director

RiskWeave looks credible and materially more considered than a normal hackathon dashboard. Its
weakness is insufficient editorial hierarchy. The same bordered-card rhythm appears across too many
work modes, so the product feels like a polished custom admin system rather than a recognizable
banking-security product. The director's primary recommendation is to replace arithmetic convergence
with a Decision Weave and use open editorial sections, ledgers, and bounded action panels instead of
universal card grids.

### B. Banking SOC and Fraud-Operations Specialist

The workflows are credible, but the queue and first investigation viewport prioritize scoring
mechanics before the transaction facts an analyst needs. The queue must expose amount, correlation
bonus, transaction state, and case state. The investigation must expose the payment object,
beneficiary, channel, device/location context, and action state before long chronology. Case
disposition, simulated payment response, and notes must be visually separated.

### C. Information-Architecture Specialist

The route model is coherent, but Operations, Demonstration, Assurance, and Administration are
flattened into one numbered list. Page headers consume excessive first-fold space. Overview buries
priority investigations under low-information charts; Evaluation buries conclusions under repeated
tables; Quantum repeats the same two-asset dataset. The investigation should lead with the
operational case statement, decisive evidence, and action before exhaustive evidence.

### D. Visual-Systems and Brand Designer

The colour system, restrained radii, borders, and minimal shadows are strong. Visual maturity is held
back by very small typography, repeated uppercase micro-labels, equal white panels, top accent strips,
and insufficient distinction between route types. The brand mark already hints at two threads
meeting; that geometry should be refined into the product signature rather than adding new cyber
iconography. Red must be reserved for contextually consequential actions.

### E. Enterprise Data-Visualization Specialist

RiskWeave correctly avoids gauges, fake maps, and opaque “AI confidence” displays. The main visual
defects are a mathematically misleading convergence strip, an oversized nearly flat incident-volume
chart, a transaction-action chart that omits the valid Cancelled category, and a redundant four-level
quantum distribution for two assets. The highest-value future visualization is a two-domain timeline
with explicit interaction pairs.

### F. Investigation-Workflow Specialist

The workspace contains the right layers but reads like a complete case report rather than a fast
investigation tool. The analyst sees a large fused score twice before seeing what was transferred,
which signals interacted, and what action to take. The Account-Takeover case needs a held-payment
anchor and explicit interaction pairings. The Legitimate-New-Device case needs first-class mitigating
evidence and a visibly state-aligned action hierarchy.

### G. Accessibility and Inclusive-Design Specialist

Semantic foundations are strong: landmarks, headings, labels, native tables, keyboard-operable rows,
dialog focus trapping, live toasts, reduced motion, and broad axe coverage. The critical weakness is
readability. Many operational labels, table fields, timeline metadata, and explanations render at
approximately 8–11 px despite the approved 14–16 px body scale. Focus indication is too faint, route
focus is unmanaged, data tables lack row headers, chart alternatives are cognitively heavy, and
toasts are too small and short-lived.

### H. Responsive and Layout Specialist

At 1440 px the shell is stable. At 1280 × 720, six metric cards and full page headers become dense.
At 1024 px, several layouts remain technically within the body but no longer communicate well:
convergence is scrambled, three simulator cards are too narrow, the investigation action rail is too
small, charts are compressed, and tables wrap rather than deliberately scroll. Breakpoints must be
chosen by content stress, not by whether body overflow occurs.

### I. Motion and Interaction Designer

The lack of theatrical animation is correct, but feedback is underdeveloped. Buttons lack pressed
states; loading skeletons are generic; route transitions do not manage focus; scenario completion and
idempotent replay depend too heavily on transient feedback; stale conflicts and persisted actions
need stronger state continuity. The future Decision Weave may use one restrained connector
transition, but scores and essential evidence must be immediately stable.

### J. Anti-AI-Slop Reviewer

The interface avoids the obvious slop patterns but retains subtler generated-interface traits:
universal page recipes, equal-card saturation, artificial triptych symmetry, defensive implementation
copy, pill convenience, and over-labelling. The correction is not more styling. It is decision-led
asymmetry, fewer surfaces, progressive technical detail, and route-specific composition.

### K. Portfolio and Recruitment Reviewer

A recruiter or engineering manager will believe that this is substantive software. A product
designer will see disciplined foundations but insufficient editorial authorship. A judge will value
the Simulator and the Scenario B versus Account-Takeover contrast, but the current hero screenshot
does not show the transfer at risk or the three interaction pairs. The README and PPT should lead with
the two investigations, not Overview.

### L. Presentation and Demo Director

The strongest five-second moments are the three scenario outcomes, Scenario B's proportionate
permission, Account Takeover's held decision, and the login tagline. The demo should present
restraint first, decisive intervention second, and then use Queue, Quantum, and Evaluation as
supporting proof. Credentials should never be typed live. System Health belongs in judge Q&A, not the
main narrative.

## 6. P0 issue register

P0 issues damage comprehension, correctness, accessibility, or presentation credibility and must be
fixed before final screenshots or demo recording.

| ID | Issue | Change class | Exact correction | Backend |
|---|---|---|---|---|
| P0-01 | The convergence visual reads as false arithmetic: 78 + 79 + 18 → 89 and 40 + 10 + 0 → 23. | Cross-screen component; data presentation | Remove bare arithmetic. The full weighted visual may show Cyber × 45%, Transaction × 45%, eligible interactions + bonus, raw fused value, and one rounded result **only when every weight and weighted term is returned by the backend**. Until that projection exists, show the two evidence streams, eligible interactions, existing backend explanation, and authoritative result without hard-coded percentages or inferred terms. | **Yes for the full weighted visual:** a read-only backend projection must provide the weights and weighted terms. |
| P0-02 | At 1024 px the convergence grid auto-placement scrambles the equation and loses the arrow. | Responsive; cross-screen component | Use a deliberate two-row layout: row one contains the two weighted streams; row two contains eligible interactions leading to the fused decision. Preserve semantic reading order. | No |
| P0-03 | Incident Queue omits required transaction amount, correlation bonus, and transaction status; “Status” means only case status. | Screen-specific; information architecture | Add Amount, Bonus, Transaction state, and rename Status to Case status. At narrow widths use one compact risk-composition cell rather than deleting values. | No; fields already exist in the list API. |
| P0-04 | Operational typography is substantially below the approved readable scale, with many labels and explanations near 8–11 px. | Global design-system; accessibility | Set operational body text to at least 14 px, secondary metadata to at least 12 px, and reserve 11 px only for nonessential monospace identifiers. Regain density through hierarchy and disclosure, not smaller type. | No |
| P0-05 | Transaction-action totals include Cancelled while the chart and its accessible label omit the valid Cancelled category. | Overview; data consistency | Include Cancelled in chart data, label, and accessible summary, or change both total and chart to the same explicitly supported set. | No |
| P0-06 | System Health says “production environment” while showing a localhost API origin. | Content/config; correctness | Render the true backend-authoritative environment label—such as “Local deterministic demo”—and never derive it from the frontend build mode. Never present this contradictory state in final evidence. | **Yes:** include environment in the authenticated integrity/context projection. |
| P0-07 | Two preserved visual baselines are not presentation-safe: Legitimate-New-Device Investigation and System Health contain incomplete/black shell regions. | Screenshot readiness; diagnostic | Reproduce the capture state, verify shell/font/route readiness, add a deterministic visual-ready gate, and recapture later. Account Takeover, Quantum Readiness, and Evaluation are not affected. Do not overwrite baselines during 7A. | No |

## 7. P1 issue register

P1 issues materially prevent premium competition and portfolio quality.

| ID | Issue | Change class | Exact correction | Backend |
|---|---|---|---|---|
| P1-01 | Navigation gives Operations, Demonstration, Assurance, and Administration equal weight. | Global IA | Group Overview/Incidents, Simulator, Quantum/Evaluation, and System Health under named sections while preserving RBAC. | No |
| P1-02 | Every route repeats the same eyebrow-title-divider-card-field template. | Global design system | Define route-specific composition modes: operations briefing, work queue, case dossier, demonstration stage, migration register, exception ledger, and evidence report. | No |
| P1-03 | Equal-card saturation flattens priority. | Global/cross-screen | Use three surface modes: open sections separated by rules, compact ledgers, and bounded action/evidence panels. Reserve cards for independently meaningful objects. | No |
| P1-04 | Focus rings are faint; no skip link, route-title update, or deliberate route focus exists. | Accessibility/interaction | Add a solid two-layer focus treatment, skip link, route-specific document titles, main-heading focus on navigation, and queue-row focus restoration on return. | No |
| P1-05 | Overview treats six metrics equally and delays the work requiring attention. | Overview hierarchy | Lead with High/Critical, Held, and Open/In Review; place Priority Investigations in the first fold; move dataset-size and contextual outcomes to a secondary strip. | No |
| P1-06 | The large nearly flat incident-volume area chart has low information value and smoothing implies continuous change. | Overview visualization | Replace with discrete daily bars, a compact cadence strip, or severity-by-day view. Give Priority Investigations more space. | No |
| P1-07 | Risk-trend daily averages can be mistaken for threshold decisions; severity bars require axis estimation. | Overview visualization | Label “Daily average risk by stream,” pair it with the existing daily `incident_volume` count or a clear note, add direct severity counts, and use non-colour line differentiation. | No; the current trends response already includes daily incident volume. |
| P1-08 | Queue filters occupy a large always-visible band and tables compress instead of deliberately scrolling. | Queue IA/responsive | Keep search, severity, case status, **transaction status**, and sort visible; move scenario/date into Advanced filters; add table min-width, sticky header, sticky identity column, and a visible overflow cue. | **Yes:** add an authoritative `transaction_status` filter to `GET /api/incidents`, its typed client, and contract tests. |
| P1-09 | The hero first fold does not identify the transaction being protected. | Investigation hierarchy | Add a Decision Context ledger using existing amount, beneficiary, masked customer/account, channel, transaction state, session city, and masked IP. Device posture/trust, beneficiary age, explicit risky-network state, and elapsed evidence window may appear only if added as backend-authored fields; never infer them in the browser. | Optional additive projection for the currently non-first-class context fields. |
| P1-10 | Evidence convergence is an arithmetic infographic rather than an investigation visualization. | Hero component | Build Decision Weave with cyber and transaction rails, genuine interaction nodes, and one fused decision endpoint. Display weights or weighted terms only from the required backend projection; otherwise use non-arithmetic stream labels. | Yes for weighted-term display; no for the core evidence-rail composition. |
| P1-11 | Interactions are shown only as aggregate points, not paired source evidence. | Hero/data visualization | Map new device ↔ new beneficiary, failed MFA ↔ high amount, and endpoint alert ↔ velocity spike using persisted source references. | No |
| P1-12 | Generic timeline descriptions repeat labels and do not expose decisive facts. | Investigation content | Show masked device, city, MFA result, beneficiary age, amount deviation, velocity, and transaction state. Separate baseline context from active incident events. | Additive backend-authored descriptions are recommended. |
| P1-13 | Full chronology precedes concise decisive evidence. | Investigation IA | Show top contributions and interaction pairs before the long timeline; retain the full evidence trail below. | No |
| P1-14 | Case disposition, simulated payment response, and analyst note are one undifferentiated control stack. | Investigation interaction | Split controls into Investigation disposition, Synthetic transaction response, and Analyst note. Keep destructive or contradictory actions secondary and confirmed. | No |
| P1-15 | Scenario B's mitigating evidence is buried and its red Confirm Fraud action visually dominates. | Scenario B; hierarchy/interaction | Add “Why intervention was avoided,” place successful verification/familiar beneficiary/normal amount/no interaction beside unusual cyber context, show the noninteractive authoritative state label “Current treatment: Allow and monitor,” and visually prioritize only valid actions returned in `available_actions` (for example, Mark Legitimate when valid). | Structured server-owned mitigating evidence is recommended. |
| P1-16 | Contribution lists are long, equally weighted visually, and poorly paired to timeline sources. | Investigation component | Show ranked top contributions first, interactions in the central bridge, and complete evidence in expandable detail; never convert points to probability bars. | No |
| P1-17 | Simulator resembles a three-column pricing table and uses implementation language as primary copy. | Simulator composition/content | Recompose as a three-state decision storyboard or selector plus expanded execution canvas. Use “Replay same scenario” and “Reset demonstration data,” with determinism in helper text. | No |
| P1-18 | Simulator execution, idempotent reuse, and reset feedback are too transient. | Simulator interaction/accessibility | Use per-card aria-busy, persistent result/reuse status, explicit reset phases, and a durable result link. Do not invent staged percentages. | No |
| P1-19 | Quantum repeats a two-asset dataset across four cards, a distribution, ranked cards, and a wide table. | Quantum IA/visualization | Use a compact summary ledger, dominant urgent migration row, and prioritized asset register. Remove the four-level distribution. | No |
| P1-20 | Quantum priority visually resembles fraud risk and lacks an explicit scale explanation. | Quantum visual system/content | Label it “Migration priority index,” explain the level mapping, and use a neutral migration grammar distinct from the fused-decision component. | No |
| P1-21 | System Health omits deterministic integrity fields required by UI_SYSTEM.md. | System Health; product completeness | Add seed manifest version, simulation epoch/seeds, scenario state, benchmark fixture, latest reset, and audit-event state between service readiness and source counts. | **Yes:** required authenticated integrity/context projection. |
| P1-22 | Evaluation buries the bounded conclusion under comparator cards and repeated tables. | Evaluation IA | Lead with what benchmark-v1 establishes/does not establish and the approved bounded statement; show 60+ first, then a cross-threshold matrix, cohorts, and detailed methodology. Keep the warning that isolated and fused score scales are not calibrated identically immediately adjacent to the compact comparison. | No |
| P1-23 | Evaluation abbreviations and internal comparator keys increase cognitive load. | Evaluation accessibility/content | Expand TP/FP/TN/FN, use row headers, keep human names primary, demote internal identifiers, and label cohort scope explicitly. | No |
| P1-24 | Required 1024 layouts reflow too late: simulator, investigation rail, chart grids, quantum nested columns, and comparator definitions. | Responsive/global | Move stress breakpoints nearer 1200–1344 px; use two-column/stacked simulator, stack the action rail near 1080 px, and deliberately scroll wide tables. | No |
| P1-25 | Charts rely too heavily on colour and giant aria-label sentences. | Data-viz accessibility | Add direct labels or patterns, concise accessible summaries, and expandable exact-value tables. | No |
| P1-26 | Dense tables lack row-header semantics and visible horizontal-scroll guidance. | Accessibility/cross-screen | Use scope=row for incident, asset, comparator, and cohort names; retain real direct links; label scroll regions and show overflow cues. | No |
| P1-27 | Toasts, mutation focus, busy dialogs, and memory-only-session expiry are fragile. | Interaction/accessibility | Keep errors/conflicts persistent, pause toast timers on focus/hover, enlarge dismiss targets, retain stable focus during busy dialogs, and announce persisted state. Where practical, warn before expiry; always announce “Session expired,” preserve the intended return location, and protect an unsaved analyst-note draft through recovery or an explicit loss warning. | No |
| P1-28 | Loading and refetch states discard too much context. | Interaction | Use route-shaped skeletons; keep queue/health content visible during refetch with an honest busy state; do not animate critical values from zero. | No |
| P1-29 | Two live routes initially displayed recoverable error states during the audit. | Demo reliability; diagnostic | Reproduce Legitimate-New-Device and Evaluation first-entry behavior under deterministic setup. If reproducible, fix before screenshots; retain clear Retry. | Unknown pending diagnosis. |
| P1-30 | Primary copy repeatedly explains implementation virtue rather than analyst outcomes. | Content/copy | Move “ROUND_HALF_UP,” engine versions, browser non-recalculation, idempotency, and defensive engineering language into provenance/help surfaces. | No |
| P1-31 | The top context bar omits environment, simulation time, and dataset state required by UI_SYSTEM.md. | Global shell/product context | Add concise environment, simulation epoch/time, and dataset/scenario state from the same authenticated backend integrity projection used by System Health. Never let frontend build mode invent this context. | **Yes:** required authenticated integrity/context projection. |

## 8. P2 polish register

| ID | Opportunity | Change class | Recommendation |
|---|---|---|---|
| P2-01 | Login feature chips are generic and distant from the form. | Login/content | Remove them or replace them with one concise “Synthetic demo workspace” note. |
| P2-02 | Login card shadow and dead space make the split layout feel familiar. | Login/visual | Reduce float, tighten vertical alignment, and integrate a restrained weave mark. |
| P2-03 | Navigation numbering adds little unless it maps to shortcuts. | Global shell | Remove numbers or make shortcut intent explicit. |
| P2-04 | Accent top borders decorate cards without adding meaning. | Design system | Reserve stream and state colours for evidence, decisions, and intervention. |
| P2-05 | Engine codes and source identifiers compete with human evidence. | Investigation/content | Move them to an Evidence Provenance disclosure with copy affordances. |
| P2-06 | Buttons and rows lack tactile pressed treatment. | Interaction | Add an 80–120 ms darker border/surface or 1 px translate; do not scale or glow. |
| P2-07 | Scenario and login chips flatten sequence into pills. | Cross-screen | Use ordered evidence text or rails; reserve pills for finite statuses. |
| P2-08 | Dialogs and toasts appear/disappear without a coherent transition. | Motion | Use 140–180 ms opacity/4–6 px translation, disabled under reduced motion. |
| P2-09 | Technical status identifiers need plain-language help. | Health/content | Explain migration revision and source identifiers through concise help text. |
| P2-10 | Long investigations lack section navigation. | Investigation/accessibility | Add Decision, Evidence, Context, Actions, and History anchor navigation. |
| P2-11 | Amounts, timestamps, IDs, and score provenance need one formatting grammar. | Global content | Standardize alignment, units, truncation, and copy behavior. |
| P2-12 | Healthy-state motion could look theatrical. | Motion | Keep healthy services static; animate only confirmed state change. |

## 9. Anti-AI-slop findings

RiskWeave avoids the most obvious generated-dashboard clichés. There are no purple-blue gradients,
glowing shields, fake maps, neon hacker grids, glass-card fields, decorative “AI confidence” gauges,
or oversized pill-shaped containers. The remaining risk is subtler.

### 9.1 Universal page recipe

Nearly every route uses the same eyebrow, large title, explanatory sentence, divider, and card field.
This feels generated because the layout precedes the work. A human editorial system lets the job
determine the composition.

**Better principle:** each route gets a form suited to its task.

- Overview is an operations briefing.
- Incidents is a work queue.
- Investigation is a case dossier.
- Simulator is a controlled demonstration stage.
- Quantum is a migration register.
- System Health is an exception ledger.
- Evaluation is an evidence report.

### 9.2 Equal-card saturation

Six Overview cards, four Health cards, four score boxes per scenario, three comparator cards, and four
Quantum cards make unlike information appear equally important.

**Better principle:** use cards only for independent, actionable objects. Use ledgers, open sections,
rules, and one dominant panel elsewhere.

### 9.3 Artificial symmetry

The Simulator resembles a pricing-card triptych. The convergence strip resembles an infographic made
from four equal boxes. Regularity is being used where the evidence itself is unequal.

**Better principle:** let operational importance create asymmetry. Normal activity can be compact,
Scenario B should emphasize proportionate restraint, and Account Takeover should carry the richest
evidence bridge.

### 9.4 Over-labelling

Repeated all-caps labels such as “CONTEXTUAL RISK OPERATIONS,” “TRANSPARENT READINESS SERVICE,” and
“VALID SERVER-APPROVED ACTIONS” make the interface sound specification-generated. Many are also too
small and letter-spaced to read comfortably.

**Better principle:** use one page eyebrow at most, sentence-case panel headings, and labels only when
they remove ambiguity.

### 9.5 Defensive implementation copy

“Replay idempotently,” “Restore exact baseline,” “without recreating risk decisions in the browser,”
engine version strings, and rounding implementation are important engineering facts but poor primary
product copy.

**Better principle:** the primary UI explains operational outcomes. Provenance and implementation
guarantees remain available in disclosures, Health, and Evaluation.

### 9.6 Generic accent strips and badge convenience

One-pixel coloured card tops and repeated evidence chips provide variation without hierarchy. Chips
flatten evidence sequence and causality.

**Better principle:** colour communicates state, stream, interaction, or intervention. Pills are
reserved for finite statuses. Evidence uses ordered text, rails, or connected nodes.

### 9.7 Generic admin-shell cues

Numbered navigation, avatar initials, an API dot, breadcrumb-like route text, and standard sign-out
placement are usable but not distinctive.

**Better principle:** preserve their utility, but make the Decision Weave and investigation
composition carry the brand. Do not decorate the shell to manufacture identity.

### Anti-slop corrective rules

1. Decision-led asymmetry.
2. One meaningful question per visualization.
3. Evidence before arithmetic.
4. Fewer, more purposeful surfaces.
5. Route-specific composition.
6. Status colour, not decorative colour.
7. Progressive technical detail.
8. Human editorial copy.
9. One restrained signature, not repeated cyber decoration.

## 10. Screen-by-screen audit

### 10.1 Login

**What works**

- The dark/light split feels serious and calm.
- “One incident. Every relevant signal.” communicates the premise quickly.
- The form has one clear task, correct labels, responsible memory-only token copy, and no marketing
  clutter.
- The visual identity is stronger than the authenticated Overview.

**What weakens it**

- The split SaaS login, floating white form, top teal rule, and bottom feature chips are familiar.
- The headline scale is slightly theatrical relative to an enterprise analyst tool.
- Important synthetic-environment context is distant from the form.
- Help text is too small.

**What feels generic**

- Three feature chips.
- Large empty white field around a floating card.
- A headline block and form block that do not share a strong editorial grid.

**Remove**

- The three feature chips.
- Excess floating shadow.
- Any future decorative cyber illustration.

**Add**

- A concise “Synthetic demo workspace” label near the form.
- One restrained Decision Weave line or mark linking the product thesis to the form.
- An announced session-expired state when applicable.

**Reorder**

1. Brand.
2. Product thesis.
3. One-line operational explanation.
4. Form with environment label.
5. Memory-only session note.

**Visually dominant**

The thesis and the form should share dominance; neither needs a large decorative panel.

**Exact component recommendations**

- Raise form help and session text to at least 13 px.
- Add aria-busy while verifying.
- Keep button width stable during loading.
- Use a restrained inline progress glyph, never a shaking form.
- Reduce headline size by roughly one step at 1280 × 720.

**Screenshot readiness:** 7.8 / 10. Near-ready after small editorial and typography work.

### 10.2 Overview

**What works**

- All values are backend-derived and qualified.
- High/Critical, Held, and unusual-but-permitted values are meaningful.
- Severity uses text and colour.
- Recent investigations are directly linkable.

**What weakens it**

- Six equal cards flatten priority.
- Visible Incidents and Open/In Review are both 18 in the seeded state and compete equally.
- The largest chart is almost flat and answers little.
- Priority Investigations sit below low-value analytical panels.
- Lower charts are cut off in the first 900 px.

**What feels generic**

- KPI inventory followed by a two-column chart grid.
- Colour accent lines on every metric.
- “Dashboard completeness” rather than an operations briefing.

**Remove**

- The oversized smooth area chart.
- Equal treatment for all six metrics.
- Decorative top strips on secondary metrics.

**Add**

- A first-fold “Cases requiring attention” worklist.
- Three primary metrics: High/Critical, Transactions Held, Open/In Review.
- A secondary outcome ledger: permitted-but-monitored, confirmed fraud, visible dataset.
- Direct severity counts and a concise exact-value table for chart data.

**Reorder**

1. Compact header.
2. Operational attention strip.
3. Priority Investigations.
4. Compact severity/time view.
5. Controlled outcomes.
6. Risk-stream trend and transaction outcomes.
7. Source health.

**Visually dominant**

Current cases requiring analyst attention—not total dataset size.

**Exact component recommendations**

- Use discrete daily bars or a severity-by-day strip.
- Label the line chart “Daily average risk by stream.”
- Differentiate streams by line pattern/direct label as well as colour.
- Add bar-end values to severity.
- Include Cancelled consistently in transaction outcomes.
- Disable repeated chart entrance animation.

**Screenshot readiness:** 6.0 / 10. Do not use the current full-screen capture in the PPT.

### 10.3 Incident Queue

**What works**

- It is the most recognizably operational screen.
- Density, sorting, server filters, direct links, keyboard behavior, and masked identifiers are
  credible.
- Showcase scenarios are easy to spot at the top of the seeded dataset.

**What weakens it**

- Amount, correlation bonus, and transaction state are absent.
- “Status” is ambiguous because it means only case status.
- The filter band consumes substantial first-fold height.
- Recommended Action is verbose while transaction state is missing.
- Wide content compresses rather than using deliberate table behavior.

**What feels generic**

- Large filter card above a standard enterprise table.
- Separate raw score columns with no visual composition.

**Remove**

- Excess filter framing.
- Ambiguous Status heading.
- Row-wide click as the only discoverable navigation contract.

**Add**

- Amount.
- Bonus.
- Transaction state.
- Case state.
- A real direct link in the incident-reference cell.
- Results-count live announcement.
- Sticky table header and identifying column.

**Reorder**

Recommended 1440 px columns:

1. Incident and scenario marker.
2. Severity and fused score.
3. Customer/account.
4. Amount.
5. Observed.
6. Compact composition: C78 · T79 · +18 → 89.
7. Recommended action.
8. Transaction state.
9. Case state.

At narrower widths, keep Amount, Fused, Severity, Transaction state, and Case state visible; use
internal table scrolling rather than deleting authoritative fields.

**Visually dominant**

Whether intervention is required, what value is at risk, and why the case is prioritized.

**Exact component recommendations**

- Keep Search, Severity, Transaction state, Case state, and Sort visible.
- Move Scenario and Date range into Advanced filters.
- Preserve URL parameters.
- Restore row focus and scroll position when returning from detail.
- Use scope=row for the incident identity.

**Screenshot readiness:** 6.4 / 10. Strong supporting screen after P0 data completion.

### 10.4 Account-Takeover Investigation

**What works**

- Critical, Open, 89, Held, and recommended action are unmistakable.
- The dark case header creates appropriate urgency.
- Contribution streams, timeline, customer context, actions, quantum context, and history all exist.
- The exact three interaction rules are persisted.

**What weakens it**

- The masked incident ID dominates instead of the held transfer.
- The score is emphasized twice before amount, beneficiary, channel, and session context.
- The convergence strip hides weighting and does not pair evidence.
- The timeline begins before the analyst sees decisive facts.
- Generic descriptions such as “A synthetic new device signal was observed” add little.
- Case and payment controls are mixed.

**What feels generic**

- Four equal arithmetic cards.
- Large status header followed by a long report.
- Repeated micro-eyebrows and technical provenance above the fold.

**Remove**

- Bare plus signs.
- Duplicate dominant 89.
- Engine versions and ROUND_HALF_UP detail from primary flow.
- Full technical codes/source IDs from primary evidence rows.

**Add**

- Operational case statement: account takeover suspected and a formatted transfer held.
- Decision Context ledger: amount, beneficiary age/state, channel, account/customer, device,
  location/network, session, transaction state.
- Decision Weave with three explicit interaction pairs.
- Decisive Evidence summary.
- Compact 30-minute correlation-window affordance.
- Separated case disposition, synthetic payment response, and note controls.

**Reorder**

1. Compact case header and held-payment statement.
2. Decision Context ledger.
3. Decision Weave and top interaction rules.
4. Recommended response and state-aligned actions.
5. Ranked contributions.
6. Dual-lane chronology.
7. Customer/account baseline.
8. Secondary quantum context.
9. Full history and provenance.

**Visually dominant**

The held payment and the cross-domain evidence that justified intervention.

**Exact component recommendations**

- Cyber rail: new device, failed MFA, risky network, endpoint.
- Transaction rail: new beneficiary, high amount, velocity.
- Interaction knots: three labeled +6 rules.
- Decision endpoint: raw 88.65, rounded 89, Critical, Held.
- Keep a semantic ordered-list/table fallback.
- At wide widths make only a compact decision/action summary sticky.
- Never make the full note form sticky.

**Screenshot readiness:** 6.5 / 10 conceptually. It should become the strongest final screenshot.

### 10.5 Legitimate-New-Device Investigation

**What works**

- Cyber 40, Transaction 10, Bonus 0, Raw 22.50, Fused 23 are exact.
- Guarded, Allow and Monitor, Permitted, and no hold/step-up are explicit.
- It is RiskWeave's strongest defensible demonstration of proportionate control.

**What weakens it**

- It looks like a lower-scored copy of the critical case.
- The normal context that prevents intervention is buried.
- A red Confirm Fraud button dominates despite the authoritative permitted outcome.
- The timeline starts with May baseline context before July incident-time events.

**What feels generic**

- Reusing the critical-case component hierarchy without adapting it to a non-intervention decision.
- Treating every server-valid action as visually equal.

**Remove**

- Dominant red fraud action from the first action position.
- Baseline facts from the incident-time lane.
- Any implication that unusual cyber context alone is fraud.

**Add**

- A “Why intervention was avoided” block.
- Two visible columns: Unusual cyber context and Familiar transaction context.
- Successful verification, known beneficiary, ordinary amount, normal velocity, no interaction rule.
- Outcome band: “Monitor only · transaction permitted.”

**Reorder**

1. Guarded/permitted case header.
2. Why Intervention Was Avoided.
3. Weighted convergence with zero interaction.
4. State-aligned monitoring/legitimate actions.
5. Current-session timeline.
6. Prior familiar context.
7. Complete evidence and provenance.

**Visually dominant**

Proportionate non-intervention.

**Exact component recommendations**

- Show `Current treatment: Allow and monitor` as an authoritative, noninteractive state label.
- Give visual priority only to actions returned in `available_actions`, such as Mark Legitimate when
  it is valid; do not invent a Continue Monitoring analyst action.
- Contradictory actions move to “Other server-approved actions.”
- Keep no-hold/no-step-up language visible without scrolling.
- Use server-owned mitigating evidence if approved; never infer new causal reasoning in the browser.

**Screenshot readiness:** 7.0 / 10 conceptually, but the preserved PNG is unusable and must be
recaptured after redesign.

### 10.6 Scenario Simulator

**What works**

- The three exact outcomes are visible together.
- Scenario B's permitted state and Account Takeover's held state are clear.
- Direct investigation links create a strong demo bridge.
- Admin-only controls and deterministic replay are real.

**What weakens it**

- The triptych resembles pricing cards.
- Every card repeats a 2 × 2 score grid, chip list, outcome footer, and identical CTA.
- Expected and persisted results are not sufficiently distinguished.
- Reset is visually overemphasized.
- At 1024 px the cards become narrow and text-heavy.

**What feels generic**

- Symmetric three-card composition.
- Signal chips.
- Repeated dark fused tiles and buttons.

**Remove**

- Pricing-card rhythm.
- Implementation-first button labels.
- Red prominence for reset before confirmation.

**Add**

- A three-state narrative: familiar → unusual but legitimate → correlated takeover.
- One expanded scenario canvas or unequal storyboard.
- Persistent “existing incident reused” state.
- Explicit Expected deterministic result versus Persisted result.

**Reorder**

Outcome first, evidence sequence second, compact score composition third, result link and execution
control last.

**Visually dominant**

The progression from Allow 9 to Monitor/Permit 23 to Hold 89.

**Exact component recommendations**

- Use two columns by approximately 1200 px; let Account Takeover span both columns or use stacked
  compact rows.
- Add scenario-specific accessible names.
- Apply aria-busy to the active scenario.
- Keep unrelated disabled controls accompanied by a clear shared-running explanation.
- Show reset phases and fingerprint/result inline.

**Screenshot readiness:** 7.2 / 10. Strong demo screen after composition and copy refinement.

### 10.7 Quantum Readiness

**What works**

- Fraud-score separation is immediate and explicit.
- Urgent 88 and Low 22 are transparent.
- Algorithm, sensitivity, confidentiality, channel, readiness, and reasons are available.
- Prohibited active-attack claims are absent.

**What weakens it**

- Four metrics, a four-level distribution, ranked asset cards, and a full table repeat two records.
- Two zero bars are decorative.
- The actionable asset register starts too low.
- Long explanations make the table unusably wide.
- Numeric 88 can be mistaken for the fraud-risk score grammar.

**What feels generic**

- Small-data dashboard furniture.
- KPI cards used to inflate the visual scale of a two-asset fixture.

**Remove**

- Migration-priority distribution.
- Four equal KPI cards.
- Full explanations as permanent wide-table cells.

**Add**

- Compact inventory summary.
- Dominant urgent migration row with asset, channel, algorithm, confidentiality, priority, and reason.
- Expandable asset detail.
- Explicit Migration Priority Index scale.

**Reorder**

1. Separate control-plane notice.
2. Compact inventory summary.
3. Urgent asset and why it is urgent.
4. Prioritized asset register.
5. Readiness methodology and prohibited-claim note.

**Visually dominant**

Which asset should migrate first and why.

**Exact component recommendations**

- Keep Asset, Channel, Algorithm, Migration, and Priority visible at narrow widths.
- Move long reasons into a detail row or adjacent panel.
- Use asset names as row headers.
- Avoid bar entrance animation.

**Screenshot readiness:** 6.0 / 10. Use a focused urgent-asset crop, not the current full screen.

### 10.8 System Health

**What works**

- Liveness, database readiness, migration revision, source counts, and Retry are real.
- Status uses text, not colour alone.
- The page avoids theatrical operational animations.

**What weakens it**

- Four green cards repeat “everything is fine.”
- The environment label contradicts localhost.
- Authoritative deterministic integrity fields are missing.
- No single exception-led summary leads.

**What feels generic**

- Four equal status cards with green dots.
- Raw technical identifiers without enough plain-language context.

**Remove**

- Equal green cards as the dominant composition.
- “production environment” in local demo.
- Any continuous healthy-state animation.

**Add**

- One readiness summary followed by a compact status matrix.
- Seed manifest, epoch/seeds, scenario state, benchmark fixture, latest reset, and audit status.
- Environment/origin context in one place.
- Degraded checks promoted only when present.

**Reorder**

1. Overall readiness/exception summary.
2. Core service matrix.
3. Deterministic integrity state.
4. Source coverage.
5. Environment/origin/refresh metadata.

**Visually dominant**

Any exception; when healthy, one calm readiness statement.

**Exact component recommendations**

- Retain previous values during Retry and label them Refreshing.
- Announce only state changes, not every poll.
- Expand “Alembic revision” with concise help.

**Screenshot readiness:** 6.3 / 10 conceptually, but the preserved System Health PNG is unusable and
must be recaptured after the capture-path defect is resolved. Keep it out of the main PPT.

### 10.9 Evaluation

**What works**

- Results are honest and source-backed.
- All three operating points and six cohorts exist.
- Unfavorable fused results are retained.
- The synthetic-data disclaimer and bounded statement are correct.

**What weakens it**

- It begins as technical documentation.
- The first visible threshold is 40+, although 60+ is primary for holds.
- Three repeated full tables make comparison difficult.
- The conclusion and limitations are below the fold.
- Internal comparator keys and unexplained abbreviations dominate.

**What feels generic**

- Three definition cards followed by repeated tables.
- A schema-first evidence hierarchy.

**Remove**

- Comparator cards as the first substantive section.
- Any leaderboard or winner treatment.
- Internal identifiers from the primary reading flow.

**Add**

- “What benchmark-v1 shows” and “What it does not show.”
- The exact approved bounded statement above metrics:

  > “RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the
  > deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been
  > established by benchmark-v1.”

- A compact comparator × operating-point matrix.
- TP/FP/TN/FN definitions.
- Explicit title for “Fused hybrid contextual score at 60+” cohort evidence.

**Reorder**

1. Version and synthetic disclaimer.
2. Bounded conclusion and limitations.
3. 60+ intervention result.
4. 40+/60+/80+ comparison matrix.
5. Cohort context.
6. Full confusion matrices and comparator definitions in methodology detail.

**Visually dominant**

The bounded conclusion and the unfavorable 60+ result—not a winning metric.

**Exact component recommendations**

- Use consistent numerical precision.
- Use comparator and cohort names as row headers.
- Make exact metrics available without hover.
- Keep “isolated and fused score scales are not calibrated identically” directly beside the compact
  operating-point matrix and include it in the matrix's accessible summary.
- Avoid count-up, ranking, celebratory colour, or animated bars.

**Screenshot readiness:** 5.8 / 10. Final evidence should be a focused 60+ and conclusion composition.

## 11. Design-signature recommendation: Decision Weave

### Concept

Decision Weave expresses RiskWeave's product thesis without decorative cyber imagery.

Two independent evidence rails—Cyber and Transaction—progress through the relevant chronology.
Genuine cross-domain rules appear as labeled knots connecting specific nodes on the two rails. The
rails terminate in one server-authoritative decision node containing raw fused value, rounded score,
severity, recommended action, and transaction state.

### Visual implementation

**Cyber rail**

- Cyan/blue-green restrained rule.
- Human-readable evidence nodes.
- Source time and small domain label.
- Anomaly support appears as an outlined marker within the stream, never as a third “AI” rail.

**Transaction rail**

- Restrained amber rule.
- Beneficiary, amount, velocity, destination, and channel evidence.
- Values remain backend-authored.

**Interaction knots**

- Short connectors between the exact two source signals.
- Stable interaction label and bonus.
- Account Takeover shows:
  - New device ↔ New beneficiary: +6
  - Failed MFA ↔ High amount: +6
  - Endpoint alert ↔ Velocity spike: +6
- Scenario B shows no knot and explicitly states that no genuine interaction rule was satisfied.

**Decision endpoint**

- One calm dark-navy surface.
- Raw fused value.
- Rounded fused score.
- Severity.
- Recommended action.
- Transaction state.
- Weighted terms are visible only when the backend returns the weights and authoritative weighted
  terms. Without that projection, the endpoint uses the existing backend explanation and values and
  does not display client-owned percentages.

### Where it appears

- Full version in both investigation workspaces.
- Compact comparison in Simulator.
- Small composition glyph or abbreviated risk cell in Incident Queue.
- Simplified geometry in the RiskWeave brand mark.
- Optional small excerpt in Overview priority investigations.

### Where it must not appear

- System Health.
- Benchmark metric tables.
- Quantum asset inventory.
- Every metric card.
- Decorative login wallpaper.
- Generic loading skeletons unrelated to correlation.

### Accessibility implications

- DOM reading order remains Cyber evidence, Transaction evidence, Interactions, Decision.
- Every node has visible text.
- Domain is never encoded by colour alone.
- The component includes an adjacent plain-language summary.
- The SVG or connector layer has one concise accessible name and does not duplicate every text node.
- The two-rail visual has a semantic ordered-list or table fallback.
- Motion is optional and fully suppressed by reduced-motion preferences.
- Essential evidence and the final score render immediately; motion never delays them.

### Motion behavior

If motion is used:

1. both evidence rails are already visible;
2. the three interaction connectors receive a single restrained emphasis;
3. the persisted decision endpoint receives a 180–240 ms confirmation treatment;
4. nothing counts up;
5. nothing glows;
6. no “AI thinking” state appears.

### Implementation difficulty

**Medium.** The evidence rails, interaction mapping, chronology, and endpoint composition are
frontend work because incident detail already contains chronology, contributions, interaction source
references, scores, explanations, action, and transaction state. The full visibly weighted equation
requires one additive backend projection so the browser never owns scoring constants.

Backend additions:

- **required for the full weighted visual:** structured weighted fusion terms;
- server-authored mitigating evidence;
- richer deterministic timeline descriptions.

## 12. Unified redesign plan

### Pass 1 — Structural hierarchy

**Goal:** make each route serve one clear job before changing visual styling.

1. Fix the queue's missing authoritative columns.
2. Group navigation into Operations, Demonstration, Assurance, and Administration.
3. Define compact versus editorial page-header variants.
4. Reorder Overview around attention and priority cases.
5. Reorder both investigations around the transaction, decisive evidence, and action.
6. Separate baseline context from incident-time chronology.
7. Recompose Simulator as a decision story.
8. Recompose Quantum as a migration register.
9. Recompose Health as an exception/integrity ledger.
10. Recompose Evaluation around the bounded conclusion and 60+ intervention result.

**Gate:** all API-backed values, routes, URL filters, RBAC, and exact scenario outcomes remain intact.

### Pass 2 — Design system

**Goal:** replace component regularity with a deliberate visual hierarchy.

1. Raise typography to the approved readable scale.
2. Reduce uppercase micro-labels and letter spacing.
3. Define three surface modes: open section, compact ledger, bounded panel.
4. Remove decorative top accent strips.
5. Reserve pills for status.
6. Establish one functional icon family; do not add decorative cyber imagery.
7. Strengthen focus styles.
8. Standardize amounts, timestamps, scores, identifiers, and provenance.
9. Define route stress breakpoints near 1200–1344 px.
10. Document the Decision Weave tokens and component rules.

**Gate:** operational body text is at least 14 px, secondary metadata at least 12 px, and 11 px is
reserved for nonessential monospace identifiers. Production-CSS browser contrast, focus, tabular
alignment, 200% zoom, and reduced-motion checks pass; passing component axe tests alone is not
sufficient evidence for typography or contrast.

### Pass 3 — Hero investigation experience

**Goal:** make the product's unique value obvious in five seconds.

1. Build the Decision Context ledger.
2. Replace arithmetic boxes with Decision Weave.
3. Pair every interaction with its two source signals.
4. Add Account Takeover's held-payment anchor.
5. Add Scenario B's Why Intervention Was Avoided block.
6. Rank decisive contributions before complete evidence.
7. Build dual-lane chronology with separate prior context.
8. Separate workflow disposition, synthetic payment response, and notes.
9. Add compact sticky decision/action summary at wide viewports.
10. Move model versions, codes, sources, and rounding detail into provenance.

**Gate:** Cyber 78, Transaction 79, Bonus 18, Raw 88.65, Fused 89 and Cyber 40,
Transaction 10, Bonus 0, Raw 22.50, Fused 23 match the backend exactly. Scenario B remains permitted
with no hold or step-up.

### Pass 4 — Supporting screens

**Goal:** give every screen a purpose-specific composition.

- Overview: operations briefing.
- Queue: complete worklist and deliberate filters.
- Simulator: three-state decision story.
- Quantum: migration register.
- Health: readiness and deterministic integrity.
- Evaluation: bounded evidence report.
- Login: restrained product entrance.

**Gate:** all content remains server-derived and benchmark/quantum language stays bounded.

### Pass 5 — Interaction and motion

**Goal:** provide state continuity without theatre.

1. Add pressed states.
2. Add route-shaped skeletons.
3. Preserve context during refetch.
4. Add stable login, scenario, reset, mutation, and stale-conflict feedback.
5. Add explicit session-expiry feedback, intended-route recovery, and unsaved-note protection.
6. Correct dialog and toast focus/timing.
7. Add one optional Decision Weave confirmation transition.
8. Disable repeated chart entrance animation.
9. Keep scores stable and immediate.

**Gate:** reduced-motion behavior, memory-only auth, idempotency, and mutation concurrency remain
verified.

### Pass 6 — Responsive and accessibility refinement

**Goal:** make 1440 × 900, 1280 × 720, and 1024 × 768 deliberately composed.

1. Fix the 1024 convergence order.
2. Reflow Simulator before cards become too narrow.
3. Stack the investigation action rail near 1080 px.
4. Stack/compress chart layouts before 1200 px.
5. Add table minima, sticky headers, row headers, and overflow cues.
6. Add skip link, route titles, route focus, focus restoration, and result announcements.
7. Add concise chart summaries plus exact-value alternatives.
8. Verify 200% zoom and keyboard-only usage.
9. Protect dialogs with viewport-bounded height and internally scrollable bodies.
10. Add explicit visual assertions for Decision Weave reading order at 1024 px, Simulator
    two-column/stacked behavior, investigation-rail stacking, visible table overflow guidance and
    sticky identity, and dialog containment.
11. Run contrast checks against the production CSS bundle, not only isolated components.

**Gate:** no serious or critical accessibility violations; no essential clipping; no semantically
scrambled component layout.

### Pass 7 — Screenshot and demo preparation

**Goal:** create presentation evidence, not generic full-page captures.

1. Reproduce and eliminate the black/incomplete baseline capture issue.
2. Add a deterministic route-ready capture gate.
3. Seed and reset the exact final states.
4. Capture the hero investigation above the fold.
5. Capture Scenario B's proportionate decision.
6. Capture Simulator's three-state story.
7. Capture only the first showcase rows of Queue.
8. Capture one urgent Quantum asset.
9. Capture Evaluation's 60+ result and bounded statement.
10. Run the full regression and visual review before replacing any baseline.

**Gate:** no secret, contradictory environment label, clipped shell, transient error state, or
unreadable slide-scale text appears.

## 13. Exact recommended implementation order

This is the implementation sequence recommended for the future Milestone 7B work. It is not executed
in 7A.

1. **Create a regression lock**
   - Record current API response fixtures for both showcase incidents, Queue, Overview, Quantum,
     Health, and Evaluation.
   - Retain exact scores, actions, status, benchmark results, and quantum separation.

2. **Close the P0 presentation/correctness gaps**
   - Queue fields.
   - Cancelled outcome consistency.
   - Environment-label contradiction.
   - Typography scale.
   - Weighted convergence semantics.
   - 1024 convergence ordering.

3. **Approve the minimal backend contract additions**
   - Required: authenticated deterministic integrity/context projection for System Health and the
     shell environment/simulation/dataset context.
   - Required for a visibly weighted Decision Weave: structured backend-authored weights and
     weighted terms. If deferred, omit explicit weights from the UI.
   - Required for full queue-filter compliance: additive `transaction_status` list filtering.
   - Recommended: server-grounded mitigating evidence and richer event descriptions.
   - Keep all additions backward-compatible and non-scoring.

4. **Refactor global shell and route composition**
   - Navigation groups.
   - Compact headers.
   - Environment/dataset context.
   - Surface modes.
   - Focus and route semantics.

5. **Build the investigation foundation**
   - Decision Context.
   - Decision Weave.
   - Evidence ranking.
   - Dual-lane chronology.
   - Action grouping.

6. **Specialize both showcase cases**
   - Account Takeover: held payment and interaction pairs.
   - Legitimate New Device: mitigating context and proportionate action hierarchy.

7. **Rebuild supporting screen compositions**
   - Queue.
   - Overview.
   - Simulator.
   - Quantum.
   - System Health.
   - Evaluation.
   - Login.

8. **Add interaction continuity**
   - Busy states.
   - Persistent scenario/reset results.
   - Mutation confirmation.
   - Stale conflict.
   - Toast/dialog behavior.

9. **Perform responsive and accessibility pass**
   - 1440, 1280, 1024, 200% zoom.
   - Keyboard and screen-reader semantics.
   - Chart alternatives.

10. **Run a human editorial pass**
    - Remove implementation-defensive copy from primary screens.
    - Reduce labels, chips, and repeated disclaimers.
    - Verify terminology with banking/fraud operations.

11. **Run the full product verification suite**
    - Existing backend/frontend/E2E tests.
    - New visual semantics and accessibility tests.
    - Exact API-to-render reconciliation.

12. **Recapture final evidence**
    - Only after all gates pass.
    - Preserve Milestone 6 baselines until replacement is explicitly approved.

## 14. Risks and regression protections

| Risk | Why it matters | Protection |
|---|---|---|
| Frontend accidentally recalculates weighted scores | Violates server authority and can drift from backend rounding. | Display backend-authored weighted terms only. If the projection is unavailable, omit explicit percentages and use non-arithmetic stream labels. Add contract tests that reject client scoring constants and reconcile exact values. |
| Decision Weave becomes decorative | Would recreate AI-slop with connector theatre. | Every node must map to a persisted event/contribution; no decorative crossings. |
| Scenario B becomes visually suspicious or intervention-heavy | Undermines false-positive-control story. | Snapshot and E2E assertions for Guarded, 23, Permitted, no hold, no step-up, zero bonus. |
| Account Takeover loses exhaustive evidence | Editorial hierarchy could hide auditability. | Use progressive disclosure; never delete contributions, sources, chronology, or history. |
| Queue density becomes unreadable | Added columns can prompt tiny typography. | Use compact composition cell, table scroll, sticky columns, and minimum text size. |
| Backend additions alter risk behavior | New synopsis/weighted fields could accidentally duplicate logic. | Add read-only projections from persisted engine outputs; no new scoring rules, weights, thresholds, or labels. |
| Quantum priority looks like fraud risk | Both use numbers near 88/89. | Use distinct migration grammar, explicit “Migration priority index,” and separation statement. |
| Evaluation redesign implies superiority | Visual hierarchy can introduce spin. | Keep unfavorable results, exact limitation text, neutral colour, and no winner state. |
| Compact Evaluation comparison hides unequal calibration | Isolated and fused score scales are not calibrated identically. | Keep that limitation adjacent to every compact operating-point matrix and preserve it in accessible summaries. |
| Motion delays or fabricates work | Animated “AI thinking” would be dishonest. | Immediate authoritative data; only short confirmed-state transitions; reduced-motion parity. |
| Shell redesign weakens RBAC | Hiding and authorization can be confused. | Preserve server enforcement and analyst/admin E2E checks. |
| New breakpoints pass overflow tests but fail comprehension | Technical fit is insufficient. | Add screenshot review and semantic-layout assertions at all three required viewports. |
| Final screenshot state is corrupted | Existing evidence already shows incomplete shell regions. | Route-ready gate, fonts settled, zero scroll, persisted content locator, delayed capture verification, manual inspection. |
| Live first-entry error recurs during demo | Two routes required Retry during audit. | Reproduce with deterministic setup, capture request IDs, fix if real, and warm routes before recording. |
| Larger typography increases page length | Correct accessibility can expose weak hierarchy. | Remove redundant panels and use progressive disclosure rather than shrinking type. |
| Memory-only session expires while an analyst is writing | A note or intended action can be lost without a clear recovery path. | Announce expiry, retain the intended return route, and recover the draft or warn before discarding it. |

### Required regression checks

- Exact scenario values and transaction states.
- No client-side scoring formula.
- Queue list values match API.
- Workflow valid actions and 409 handling.
- Role-aware shell and server RBAC.
- URL filters, direct links, and focus restoration.
- Benchmark-v1 exact tables, cohorts, statement, and limitations.
- Quantum values never appear in fraud composition.
- No serious/critical accessibility violations.
- Production-CSS contrast verification and minimum 14 px operational / 12 px secondary text.
- No unexpected console/network failures.
- 1440 × 900, 1280 × 720, and 1024 × 768 visual checks.
- At 1024 px: correct Decision Weave order, Simulator reflow, investigation-rail stacking, visible
  table overflow guidance with sticky identity, and viewport-bounded dialogs with internal scroll.
- Reduced-motion checks.
- Screenshot capture integrity.
- Evaluation compact comparisons retain the adjacent unequal-calibration warning.

## 15. Screens recommended for final PPT and demo

### Final PPT priority

1. **Account-Takeover Investigation**
   - Primary hero.
   - Show held transfer, evidence rails, three interaction knots, fused 89, and action.

2. **Legitimate-New-Device Investigation**
   - Essential proof of proportionate control.
   - Show unusual cyber context, normal transaction context, zero bonus, 23, and permitted.

3. **Scenario Simulator**
   - Show Normal 9 Allowed, Legitimate 23 Monitored/Permitted, Account Takeover 89 Held.

4. **Incident Queue**
   - Show only the first showcase rows with amount, composition, transaction state, and case state.

5. **Evaluation excerpt**
   - Synthetic disclaimer, 60+ result, unfavorable fused result, bounded statement, limitations.

6. **Quantum urgent-asset view**
   - Legacy RSA, 12-year confidentiality, Web Banking, Urgent 88, migration reason, separation note.

7. **Overview**
   - Use only after it becomes an operations briefing.

8. **Login**
   - Optional title/brand frame.

### Do not use as primary PPT evidence

- Current full Overview capture.
- Current full Queue capture.
- System Health.
- Full-width Quantum inventory.
- Full Evaluation page.
- Any incomplete/black-shell baseline.
- Any view showing “production” beside localhost.

### Recommended live demo sequence

Target duration: 3 minutes 15 seconds to 3 minutes 45 seconds.

**Required preflight before 0:00**

1. Perform the atomic deterministic reset.
2. Run all three showcase scenarios.
3. Verify the exact scenario IDs, scores, severities, recommended actions, and transaction states.
4. Warm both showcase investigations and Evaluation and confirm that no first-entry error remains.
5. Confirm that environment/API-origin labels agree and that no route shows a contradictory state.
6. Begin the narrated sequence only after the route-ready checks pass.
7. After the one live workflow mutation, do not reset before showing Queue; the mutation is part of
   the persisted-operations proof.

1. **0:00–0:10 — Premise**
   - Begin authenticated or use the login identity as a static intro.
   - Do not type credentials live.

2. **0:10–0:30 — Three deterministic journeys**
   - Show Simulator.
   - Establish Normal, unusual-but-legitimate, and Account Takeover.

3. **0:30–1:15 — Proportionate restraint**
   - Open Legitimate New Device.
   - Show Cyber 40, Transaction 10, Bonus 0, Fused 23, Guarded, permitted, no hold/step-up.

4. **1:15–2:25 — Decisive intervention**
   - Open Account Takeover.
   - Show held payment, cyber rail, transaction rail, three interaction rules, 89, Critical.
   - Perform one workflow action, such as Mark in Review or one analyst note.

5. **2:25–2:50 — Persisted operations**
   - Show Queue with both cases.

6. **2:50–3:10 — Quantum separation**
   - Show the urgent legacy asset and explicitly state that it is migration readiness, not fraud
     scoring or active attack detection.

7. **3:10–3:35 — Evaluation honesty**
   - Show 60+ and the bounded statement.
   - State that benchmark-v1 does not establish universal false-positive reduction.

8. **3:35–3:45 — Close**
   - Return to the three-state Simulator or Account-Takeover decision.

## 16. Backend-work decision

### Clear decision: **limited additive backend work is recommended; broad backend redesign is not**

The visual and structural redesign is overwhelmingly frontend work. Existing APIs already expose:

- incident amount;
- correlation bonus;
- transaction state;
- case state;
- cyber/transaction/fused scores;
- raw fused value;
- contributions and source references;
- timeline;
- customer/account context;
- scenario outcomes;
- quantum assets;
- benchmark results.

No scoring rule, weight, threshold, anomaly behavior, scenario score, benchmark fixture, label, or
interaction bonus should change.

### Additive backend work required for full specification compliance

**Authenticated deterministic integrity/context projection**

UI_SYSTEM.md requires seed manifest version, simulation epoch/seeds, scenario state, benchmark fixture
version, latest reset, and audit-event status. The current route does not expose all of these. Add a
read-only, authenticated, admin-only projection or extend an existing health response. The same
authoritative projection must supply the shell's environment, simulation time/epoch, and dataset or
scenario state; the frontend build mode must not invent them.

**Structured weighted fusion projection**

The full weighted Decision Weave requires backend-authored cyber weight/term, transaction weight/term,
eligible bonus, raw fused value, and rounded fused value. If this projection is deferred, the frontend
must omit explicit percentages and weighted terms rather than hard-code 0.45.

**Incident transaction-status filter**

Full `UI_SYSTEM.md` queue-filter compliance requires an additive, typed `transaction_status` filter
on `GET /api/incidents` with contract and integration coverage.

### Additive backend work recommended for strongest explanation

1. **Server-owned mitigating evidence**
   - grounded reasons why intervention was avoided;
   - especially successful verification, familiar beneficiary, ordinary amount, normal velocity,
     and no eligible interaction in Scenario B.

2. **Richer deterministic event descriptions**
   - facts rather than label repetition;
   - masked device/location/network/MFA/beneficiary/amount/velocity details.

These additions must be projections of existing persisted facts and engine output. They must not
introduce a second scoring system or browser-owned causality.

## 17. Milestone 7A exit state

- Milestone 6 checkpoint exists at 5c06cfd5ea78b7a827952898c06a019459f55c9e.
- The audit inspected every requested route and baseline.
- All twelve expert roles contributed independent findings.
- Conflicting recommendations were reconciled.
- The current visual maturity is 6.7 / 10.
- The target visual maturity is 9.2 / 10.
- Decision Weave is the approved audit recommendation, not yet an implemented component.
- No application code, style, component, data, screenshot, test, or product behavior was modified.
- No dependency was installed.
- No Milestone 6 visual baseline was overwritten.
- No Milestone 7A commit was created.
- Implementation must not begin until the audit is approved.
