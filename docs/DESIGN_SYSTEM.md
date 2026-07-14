# RiskWeave implemented design system

## Character

The Milestone 5 interface is a premium banking command centre: calm, exact, purposeful, and compact.
It avoids template-dashboard composition and makes the investigation workspace the visual centre of
the product.

## Foundations

Semantic tokens live in `frontend/src/styles/tokens.css`. They define deep navy structure, clean white
work surfaces, slate text and borders, teal/cyan correlation accents, amber escalation, critical red,
and verified green. Raw colors are centralized rather than chosen ad hoc by page components.

The spacing scale follows 4, 8, 12, 16, 20, 24, 32, and 40 pixels. Controls use restrained radii;
pill treatment is reserved for compact status badges. Borders and surface contrast provide most
hierarchy. Shadows are limited to dialogs, toasts, and sticky layers.

## Reusable components

Implemented primitives include:

- application shell and role-aware navigation item;
- page and panel headers;
- risk and status badges with text labels;
- authoritative score display;
- metric card;
- enterprise table wrapper;
- filter bar composition;
- contribution groups;
- incident timeline and event items;
- analyst action panel and note form;
- confirmation dialog;
- loading, empty, degraded, and error states;
- service-status indicator;
- accessible tooltip;
- accessible toast notification.

No complete dashboard theme or component-library skin is used. Recharts supplies chart geometry, but
RiskWeave owns the chart questions, surrounding copy, palette, density, and interaction treatment.

## Evidence convergence

The investigation workspace visually moves from the cyber stream, transaction stream, and genuine
interaction bonus toward the backend's fused decision. It displays persisted raw and rounded values
without recalculating them. Chronology, grouped contributions, customer baseline, analyst history,
transaction state, and secondary crypto-readiness context remain in the same investigation flow.

## Accessibility and interaction

- semantic headings, landmarks, forms, and tables;
- visible focus on links, controls, rows, and tooltips;
- text plus color for severity and state;
- keyboard-openable queue rows;
- explicit labels for filters and notes;
- modal semantics, Escape handling, initial focus, focus trapping/restoration, and disabled busy
  states;
- polite status announcements for toasts;
- reduced-motion support;
- textual summaries adjacent to charts;
- no optimistic final workflow state before backend confirmation.

Milestone 5 includes keyboard-flow coverage and serious/critical axe-core checks on both the login and
authenticated investigation surfaces. Milestone 6 retains the broader multi-screen visual
accessibility critique rather than basic dialog correctness.

## Responsive boundary

The primary target is 1440×900. The layout remains usable at 1280×720 through a narrower rail,
denser filters, bounded tables, and stacked secondary grids. Below tablet widths, navigation becomes a
horizontal product strip and multi-column investigation sections stack safely. A dedicated mobile
application is outside scope.

## Explicitly rejected patterns

The UI contains no marketing gradient, glass card field, neon hacker styling, glowing shield, fake
map, random AI badge, giant rounded card, decorative metric, or generic admin-dashboard theme.
