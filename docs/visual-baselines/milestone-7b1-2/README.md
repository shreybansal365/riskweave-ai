# Milestone 7B.1.2 — Concept A geometry fidelity evidence

This directory records the additive visual evidence for the full-size Concept A geometry
reconstruction. It does not replace the Milestone 7B, 7B.1, or 7B.1.1 baselines.

## Reference boundaries

- `original-reference-source.png` controls the full-size mark silhouette, amplitude, curvature,
  crossover placement, decision tail, endpoint scale, and internal proportions.
- `previous-light-lockup-source.png` and the Milestone 7B.1.1 light lockup control the approved light
  colours, vector-outlined wordmark, spacing expectations, and horizontal production composition.
- The original concept-sheet stack does **not** control application layout. Production remains a
  horizontal `Concept A mark + RiskWeave AI` lockup.

The pre-change measurements, normalized anchors, and exact previous production paths are preserved
in `GEOMETRY_NOTES.md`.

## Previous versus corrected geometry

| Property | Original raster estimate | Previous production | Corrected production |
|---|---:|---:|---:|
| Painted aspect ratio | `3.19:1` | `3.94:1` | `3.25:1` |
| Stroke / painted height | `7.6%` | `10.3%` | `7.6%` |
| Endpoint / stroke | `3.25×` | `2.75×` | `3.125×` |
| First weave | near `(0.40, 0.51)` | too shallow and early | near `(0.40, 0.44)` with a long descent |
| Lower weave | near `(0.53, 0.91)` | compressed near the right side | restored through the lower third |
| Endpoint centre | near `(0.96, 0.52)` | too high in the silhouette | near `(0.96, 0.51)` |

The corrected mark uses a `700×240` viewBox, rounded 16-unit strokes, and a solid endpoint at
`(666,120)` with radius `25`. It restores the long upper cyan start, distinct rising cyan arc,
lower amber start, broad amber rise, pronounced first crossover, substantial lower weave, longer
decision convergence, and larger endpoint. Bézier centrelines intentionally omit raster blur,
fringing, and screenshot antialiasing.

Light and dark full-size marks have identical coordinates. Only the decision colour changes from
navy `#0B1A2D` on light surfaces to inverse slate `#98A4B3` on the `#08111F` application rail. The
inverse pair remains approximately `7.47:1` contrast, with no halo, target ring, or outlined
endpoint.

Small favicon and app-icon geometry remains an explicitly optimized optical variant. Browser icon
declarations, fallbacks, manifest assets, and the previously verified real Brave activation are
unchanged by this geometry-only pass.

## Evidence inventory

- `original-vs-corrected-equal-height.png` — source raster and corrected vector at equal painted
  height.
- `previous-vs-corrected-equal-height.png` — compressed and corrected production marks at equal
  painted height.
- `geometry-overlay.png` — restrained silhouette and anchor alignment comparison.
- `corrected-light-lockup.png` — approved horizontal light lockup with corrected full-size mark.
- `corrected-dark-lockup.png` — inverse horizontal dark lockup with corrected full-size mark.
- `login-1440x900.png` — corrected mark in the existing login composition.
- `authenticated-sidebar-1440x900.png` — corrected mark in the desktop rail.
- `authenticated-compact-shell-1024x768.png` — corrected mark at the approved compact viewport.
- `favicon-assets-16-32-64-light-dark.png` — unchanged optical favicon variants on both browser
  surfaces.
- `login-direct-1440x900.png`, `login-reload-1440x900.png`, and
  `login-direct-vs-reload.png` — route-focus regression evidence.

The screenshots are deterministic review evidence, not final presentation assets.
