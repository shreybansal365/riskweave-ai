# Milestone 7B.1.1 visual evidence

Captured on 15 July 2026 from the local Docker application. This directory is additive evidence and
does not replace or overwrite the Milestone 7B or Milestone 7B.1 baselines.

## Evidence inventory

- `corrected-dark-lockup.png` — inverse-slate decision path and solid endpoint on `#08111F`;
- `unchanged-light-lockup.png` — approved light Concept A treatment;
- `login-1440x900.png` — settled login composition;
- `authenticated-sidebar-1440x900.png` — dark lockup in the full application rail;
- `authenticated-compact-shell-1024x768.png` — required compact workspace viewport;
- `favicon-assets-16-32-64-light-dark.png` — raster favicon fallbacks on both browser-chrome
  surface families;
- `manual-brave-tab-favicon.png` — real Brave browser chrome with the Concept A tab favicon;
- `login-direct-1440x900.png` — direct navigation with semantic route-heading focus;
- `login-reload-1440x900.png` — reload with semantic route-heading focus;
- `login-direct-vs-reload.png` — side-by-side comparison of the two clean focus states.

## Real browser-tab verification

- Browser: Brave Browser `150.1.92.139` on macOS.
- Route: `http://localhost:4173/login?favicon-proof=20260715-1230`.
- Cache procedure: a fresh browser tab was opened; the route received a unique query parameter and
  every document favicon declaration uses the independent artwork revision query `v=20260715`.
- Observed result: Brave displayed the navy-tile Concept A favicon beside the route-specific title
  `Sign in · RiskWeave AI`; it did not display the generic globe or a Vite/default icon.
- The manual screenshot includes real browser chrome. Playwright page captures were not treated as
  proof of tab-icon activation.

Safari was not needed for acceptance because the requested real Chrome-or-Brave verification was
completed in Brave and the document also provides SVG, PNG, ICO, Apple-touch, and manifest fallbacks.

## Manual review

- Full-size light and dark variants retain identical Concept A path geometry.
- The dark decision path remains clearly visible without a halo, backing keyline, ring, or tile.
- The endpoint is one solid inverse-slate decision endpoint.
- The approved light decision path and endpoint remain navy.
- The exported wordmark reads exactly `RiskWeave AI`; `AI` is teal and full cap height.
- Direct entry and reload are visually equivalent and contain no route-heading focus rectangle.
- Authentication controls retain visible keyboard focus.
- No navigation, clipping, raster-logo, or page-layout regression was observed.
