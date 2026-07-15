# Milestone 7B.1 brand and route-focus evidence

This directory is reserved for the focused Concept A and login route-focus review. It does not
replace or overwrite the broader Milestone 7B visual matrix.

Captured evidence (15 July 2026):

- `login-direct-1440x900.png` — direct route entry while the hero heading is semantically focused;
- `login-reload-1440x900.png` — hard reload with the same clean route-focus treatment;
- `login-direct-1024x768.png` — narrower approved composition;
- `authenticated-shell-1440x900.png` — desktop lockup placement;
- `authenticated-shell-1024x768.png` — compact icon placement;
- `logo-lockup-light.png` — primary light-background horizontal lockup;
- `logo-lockup-dark.png` — dark-background horizontal lockup;
- `favicon-and-small-size-preview.png` — favicon, app icon, and standalone mark.

Run the explicit capture from `frontend/`:

```bash
npm run test:e2e:brand-visual
```

The login captures intentionally preserve focus on the noninteractive route heading. The expected
clean appearance proves that the dedicated route-focus treatment removes the visual artifact without
removing semantic focus.

Manual review confirmed that direct entry and reload retain the complete login composition without a
headline focus rectangle; the Concept A curves, cyan and amber strands, dark decision endpoint, exact
wordmark, and light/dark contrast variants remain legible at the captured sizes. The application-shell
captures show no navigation, clipping, or page-hierarchy regression at either approved viewport.
