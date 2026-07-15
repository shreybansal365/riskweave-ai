# RiskWeave AI brand guidelines

## Approved primary identity

Concept A is the definitive RiskWeave AI brand mark. It shows two signal strands—cyber and
transaction—woven into one authoritative decision. The production artwork is a maintainable SVG
reconstruction of the approved raster reference, not a crop or embedded copy of the concept sheet.

The public wordmark is exactly **RiskWeave AI**:

- `RiskWeave` is one word with that capitalization;
- one space separates `RiskWeave` and `AI`;
- `AI` is teal and uses the same visual cap height as `RiskWeave`;
- `AI` is never superscript, microtype, or materially smaller.

## Meaning and colour

| Element | Meaning | Production colour |
|---|---|---|
| Cyan/teal strand | Cyber signal | `#1F9E9D` |
| Amber strand | Transaction signal | `#DF9417` |
| Navy weave and endpoint | Authoritative decision | `#0B1A2D` |
| Inverse decision path and endpoint | Authoritative decision on `#08111F` dark surfaces | `#98A4B3` |
| Light-surface wordmark | Product authority | `#0B1A2D` |
| Dark-surface wordmark | High-contrast product name | `#F7F9FB` |

The crossover is structural: the strands exchange visual precedence before they converge. The final
decision segment and single endpoint represent one decision, not a third data source. On light
surfaces, the decision remains navy. On the application rail and login surface (`#08111F`), the
exact same geometry uses the existing muted slate neutral `#98A4B3`. Its WCAG contrast ratio is
**7.47:1** against the application background. This is an inverse-surface treatment, not a new
semantic colour.

## Full-size Concept A geometry

The definitive full-size geometry is reconstructed from the original Concept A raster—not from the
shallower Milestone 7B.1 production mark. It uses a normalized `700×240` coordinate system with:

- a long upper cyber start from `(16,20)` through the first weave at `(284,104)`;
- a separate cyber arc beginning at `(282,88)`, peaking near `(422,23)`, and ending at `(610,105)`;
- a lower transaction start at `(16,214)` rising broadly toward `(264,107)`;
- a first decision-colour crossover from `(284,104)` to `(335,163)`;
- a lower cyber continuation ending at `(397,203)`;
- a substantial lower decision weave ending at `(491,207)`;
- an amber convergence ending at `(626,124)`;
- one final decision convergence and tail ending at `(641,120)`;
- one solid endpoint at `(666,120)` with radius `25`;
- a rounded 16-unit strand stroke.

Approximate painted bounds are `683×210`, or a `3.25:1` aspect ratio, compared with approximately
`3.19:1` in the raster reference. The 16-unit stroke is about 7.6% of painted height, matching the
reference estimate. The raster is used to reconstruct intentional centrelines only; screenshot blur,
fringing, accidental outlines, and antialiasing softness are not reproduced. The complete original,
previous, normalized-anchor, and path comparison is recorded in
`docs/visual-baselines/milestone-7b1-2/GEOMETRY_NOTES.md`.

The application keeps the horizontal composition `Concept A mark + RiskWeave AI`. The original
concept-sheet stack does not control production layout. Uniform scaling is allowed, but full-size
path geometry must not be compressed or non-uniformly stretched to fit a lockup.

## Production assets

Assets live in `frontend/public/brand/`:

- `riskweave-lockup-light.svg` — horizontal lockup for light surfaces;
- `riskweave-lockup-dark.svg` — horizontal lockup for dark surfaces;
- `riskweave-concept-a-mark.svg` — standalone Concept A icon;
- `riskweave-favicon.svg` — simplified small-size browser mark;
- `riskweave-favicon-16.png`, `riskweave-favicon-32.png`, and
  `riskweave-favicon-64.png` — raster browser fallbacks;
- `riskweave-apple-touch-icon.png` — 180×180 Apple touch icon;
- `riskweave-app-icon.svg`, `riskweave-app-icon-192.png`, and
  `riskweave-app-icon-512.png` — manifest-compatible app-icon treatments;
- `frontend/public/favicon.ico` — multi-size 16/32/48/64 fallback.

The public horizontal SVG lockups contain deterministic vector outlines for the visible Avenir Next
wordmark. They do not contain SVG `<text>` elements and do not embed or distribute a font file. The
accessible `<title>` remains `RiskWeave AI`. The React Brand component intentionally keeps semantic
HTML text, while the exported artwork renders consistently in README, slide, and browser contexts.

`frontend/src/components/Brand.tsx` is the reusable application component. It supports full lockup
and icon-only variants, light and dark surfaces, three sizes, accessible product naming, and an
explicit decorative mode when nearby text already supplies the name.

## Size and clear space

- Full horizontal lockup: do not render below 120 CSS pixels wide in ordinary product use.
- Standalone mark: do not render below 28 CSS pixels wide; use the favicon variant below that size.
- Favicon: the optimized SVG is intended for 16–64 pixel browser contexts.
- Clear space: keep at least one final-endpoint diameter free around the mark or lockup.
- Do not crop the endpoint, compress the weave vertically, or allow nearby rules to appear connected
  to either signal strand.

The dark lockup uses one solid inverse-slate decision path and one solid endpoint. It has no halo,
keyline, outlined ring, target treatment, or light backing tile. Light and dark lockups use identical
full-size path geometry and differ only in intentional surface-specific colour treatment.

The favicon uses a navy rounded tile only at app-icon scale so the weave remains visible against both
light and dark browser chrome. This is a documented small-size simplification; never place the
primary horizontal logo on a tile or card to avoid adapting it to a dark surface. Browser metadata
declares SVG, 32×32 PNG, 16×16 PNG, ICO, Apple touch, and web-manifest fallbacks. The cache-busting
query on document favicon declarations is updated only when the icon artwork changes.

The favicon and manifest app icons intentionally retain their proven small-size optical geometry.
They remain derived from Concept A through cyan and amber strands, one visible convergence, and one
decision endpoint; they are not treated as the full-size geometric master.

## Tagline

The optional tagline is:

> Cyber intelligence. Financial confidence.

It is a selective brand asset for the README, presentation, spacious brand preview, or future demo
introduction. It is not repeated in compact navigation, ordinary page headers, or every logo
instance. It remains separate from both the login hero headline, **One incident. Every relevant
signal.**, and the product explanation.

## Prohibited modifications

Do not:

- replace Concept A with the Concept B branch merger or Concept C node network;
- turn the mark into a shield, lettermark, pipeline, generic waveform, or unrelated cyber icon;
- redraw the primary weave merely to avoid associations with waves, DNA, infinity, or oscillation;
- swap the cyber and transaction colours;
- create multiple decision endpoints;
- put `AI` in superscript, microtype, or a separate badge;
- use `Risk Wave`, `Riskwave`, or `RiskWeaveAI`;
- rasterize the primary production mark when SVG is supported;
- animate the strands decoratively in the analyst workspace.
- add a translucent halo or outlined target ring around the dark-surface decision endpoint;
- change full-size Concept A geometry between light and dark variants.

## Brand mark versus Decision Weave

The logo is a compact identity symbol. It never presents case evidence, scores, weights, or a live
decision. The operational Decision Weave is a separate investigation visualization backed by API
data. It may share the two-signal-to-one-decision idea, but it must retain evidence labels,
interaction provenance, weighted terms, accessible reading order, and the authoritative case
outcome. Logo geometry must never replace operational evidence.
