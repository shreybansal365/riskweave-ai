# Milestone 7B.1.2 geometry reconstruction notes

This record was created before replacing the Milestone 7B.1.1 production paths. The attached
original raster controls full-size mark geometry only. The existing light lockup controls production
colour, wordmark treatment, and the horizontal application composition.

## Measurement method

- Original reference raster: 854×488 pixels. Geometry was measured within the icon region above the
  wordmark. Approximate outer painted bounds are `x=65..739`, `y=32..243`.
- Previous production source: `viewBox="0 0 320 112"`, `stroke-width=8`, with approximate outer
  painted bounds `x=8..315`, `y=20..98` after round caps and the endpoint are included.
- Normalized coordinates below use each mark's outer painted bounds, with `(0,0)` at the top-left and
  `(1,1)` at the bottom-right. Raster measurements intentionally ignore antialiasing softness and
  colour fringing.

## Original-versus-previous diagnosis

| Property | Original reference | Previous production mark |
|---|---:|---:|
| Approximate painted aspect ratio | `674 / 211 = 3.19` | `307 / 78 = 3.94` |
| Centreline vertical amplitude | about `194 px` | about `70 source units` |
| Stroke width relative to painted height | about `16 / 211 = 7.6%` | `8 / 78 = 10.3%` |
| Endpoint diameter relative to stroke | about `52 / 16 = 3.25×` | `22 / 8 = 2.75×` |
| Endpoint diameter relative to painted height | about `24.6%` | about `28.2%` |
| First crossover start | approximately `(0.40, 0.51)` | approximately `(0.35, 0.38)` |
| Lower weave/decision start | approximately `(0.53, 0.91)` | approximately `(0.64, 0.86)` |
| Endpoint centre | approximately `(0.96, 0.52)` | approximately `(0.96, 0.41)` |

The previous mark therefore occupies a substantially wider, shallower silhouette. Its first weave
arrives too early vertically, the lower sweep has insufficient travel, the separate upper cyan arc
is compressed into a compact wave, and the endpoint sits too high. The previous stroke is also heavy
relative to its shallow painted height, which further suppresses the reference's expressive motion.

## Approximate original anchors

| Feature | Raster coordinate | Normalized coordinate |
|---|---:|---:|
| Long cyan start | `(65, 40)` | `(0.00, 0.04)` |
| End of cyan starting sweep | `(165, 40)` | `(0.15, 0.04)` |
| First dark crossover begins | `(333, 139)` | `(0.40, 0.51)` |
| First dark crossover ends | `(373, 170)` | `(0.46, 0.65)` |
| Descending cyan reaches lower sweep | `(437, 216)` | `(0.55, 0.87)` |
| Lower decision trough | `(492, 235)` | `(0.63, 0.96)` |
| Amber start | `(65, 234)` | `(0.00, 0.96)` |
| Amber rise ends before upper arc | `(315, 133)` | `(0.37, 0.48)` |
| Separate cyan arc begins | `(332, 99)` | `(0.40, 0.32)` |
| Separate cyan arc apex | `(472, 44)` | `(0.60, 0.06)` |
| Separate cyan arc ends | `(660, 125)` | `(0.88, 0.44)` |
| Signal convergence | `(686, 142)` | `(0.92, 0.52)` |
| Endpoint centre | `(713, 141)` | `(0.96, 0.52)` |

The original centreline visibly contains a long horizontal cyan start, a large descending cyan
curve, a distinct rising cyan arc, a long lower amber start, a broad amber convergence, a dark first
crossing, a substantial dark lower weave, and one terminal decision endpoint. The endpoint is about
52 pixels in diameter against a roughly 16-pixel strand.

## Previous production paths preserved for comparison

```text
viewBox: 0 0 320 112
stroke width: 8

transaction: M12 88H48C74 88 95 72 115 50
cyber arc:   M115 50C139 28 166 19 191 24C218 29 236 48 257 56
cyber sweep: M12 25H46C78 25 101 39 125 64C148 88 175 94 204 87
decision:    M204 87C220 84 231 77 241 69
transaction: M241 69C251 62 259 56 270 52
decision:    M257 56C262 55 266 53 270 52M270 52H293
endpoint:    cx=304 cy=52 r=11
```

Previous horizontal public-lockup placement:

```text
mark transform: translate(0 23) scale(.46)
outlined wordmark begins at x≈163.98
painted mark right edge: x≈145
optical mark-to-wordmark gap: ≈19 output units
```

## Reconstruction target

The corrected full-size source uses a `700×240` coordinate system, a 16-unit rounded stroke, and a
25-unit endpoint radius. The target painted bounds are approximately `x=8..691`, `y=12..222`, giving
an aspect ratio of `3.25`, a stroke-to-height ratio of `7.6%`, and an endpoint-to-stroke ratio of
`3.125×`. These values materially approach the reference while keeping clean intentional Bézier
geometry.

The public lockup will uniformly scale the corrected mark with `translate(0 31) scale(.21)`. This
keeps the painted right edge near `145`, retains the existing approximately 19-unit wordmark gap, and
increases visible mark height from roughly 36 to 44 output units without stacking or changing the
approved horizontal wordmark.
