# Milestone 6 acceptance report

Date: 14 July 2026  
Milestone 5 checkpoint: `62c492f7e329739a5f792634726633759735cb38`

## Result

Milestone 6 verifies the composed RiskWeave product without changing the locked risk engine,
benchmark fixtures, scenario outcomes, or business thresholds. The browser is still a display and
workflow client; all business-critical values are reconciled to authenticated API responses.

## Browser and journey evidence

- Chromium: 31 applicable tests passed; the explicit visual-capture test is separate.
- Firefox: 20 applicable tests passed in the official Playwright Linux image; 12 Chromium-only
  destructive/accessibility/responsive/performance checks were intentionally skipped.
- WebKit: 20 applicable tests passed; the same 12 Chromium-only checks were intentionally skipped.
- Nine deterministic 1440×900 review captures were generated and visually inspected.

The native macOS Firefox binary failed before test execution because its headless SWGL renderer could
not map a framebuffer. Running the same pinned engine inside the official Linux image passed. No
RiskWeave behavior was relaxed to accommodate the host limitation.

## Verified locked outcomes

| Scenario | Cyber | Transaction | Bonus | Raw fused | Rounded | Decision |
|---|---:|---:|---:|---:|---:|---|
| Normal activity | 10 | 10 | 0 | 9.00 | 9 | Low; permitted |
| Legitimate new device | 40 | 10 | 0 | 22.50 | 23 | Guarded; allow and monitor; permitted |
| Account takeover | 78 | 79 | 18 | 88.65 | 89 | Critical; held; critical incident |

The legitimate-new-device investigation explicitly shows no hold and no step-up authentication. The
account-takeover investigation reconciles every persisted cyber, transaction, and interaction
contribution and keeps quantum readiness in a separate control plane.

## Functional hardening completed

- fixed authenticated deep-link restoration, including query parameters;
- added explicit queue label/control relationships and corrected supported-search language;
- added a valid source-backed empty overview state;
- improved text contrast and 1024px health/source layout behavior;
- added semantic chart summaries and stable data attributes for source reconciliation;
- clear the password field after every failed authentication attempt and assert that synthetic test
  credentials do not persist in storage, rendered markup, console output, or request URLs;
- isolate the real rate-limiter exercise per test process so repeated local suites cannot contaminate
  one another while leaving deterministic banking data untouched;
- normalized only intentional engine-specific request cancellation while preserving all genuine
  console, network, HTTP, and third-party-call failures;
- made visual capture wait for route-specific persisted content and exact top alignment;
- excluded Playwright reports and failure artifacts from the Docker build context so Tailwind source
  discovery cannot inflate the production stylesheet with test-report classes.

## Security, consistency, and accessibility

- JWT remains memory-only; local and session storage are empty after login/logout journeys.
- Analyst/admin restrictions are enforced by both rendered capability and server responses.
- Two simultaneous browser contexts reproduce a stale action and receive `409` without overwriting.
- Overview, queue, investigation, scenario, quantum, and benchmark values are compared to APIs.
- No serious or critical axe violations remain on required surfaces.
- Required keyboard, dialog-focus, reduced-motion, and viewport checks pass.
- Principal workflows produce no unexpected console errors, uncaught exceptions, failed requests,
  HTTP errors, secret leakage, or third-party network calls.

## Practical local performance observation

With the composed stack already healthy and the browser authenticated, one Chromium measurement
recorded route transitions of 23 ms (overview), 15 ms (queue), 44 ms (account-takeover detail), 69 ms
(simulator), 11 ms (quantum readiness), 804 ms (system health), and 801 ms (evaluation). Dashboard
summary was requested twice and trends once across the full route sequence, within the test's bounded
API-churn contract. These are local sanity observations, not production latency claims.

## Verification gates

- backend: 85 tests passed with 94.63% total coverage; Ruff format/lint, strict mypy over 84
  source files, Alembic drift detection, and the PostgreSQL integration suite passed;
- frontend: 25 Vitest tests passed with 83.96% statements, 69.58% branches, 81.57% functions,
  and 85.90% lines; Prettier, ESLint, strict TypeScript, and the production build passed;
- dependency audits: `pip-audit` and `npm audit --audit-level=high` reported no known
  vulnerabilities;
- Compose configuration, final service health, `/health`, and database-backed `/ready` passed.

The production build contains a 326.85 kB base JavaScript chunk (103.03 kB gzip) and a route-lazy
404.54 kB overview/chart chunk (114.47 kB gzip). Recharts is the material contributor to the latter;
route loading remained responsive in the practical local check, so replacing the charting layer is
not justified during functional hardening.

After a clean `npm ci`, npm 11 on Darwin reports four hoisted WASI fallback packages as extraneous
when running `npm ls`: `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, and
`tslib`. They originate from optional cross-platform Tailwind/Rolldown bindings; `npm ci`, the build,
the browser matrix, and the vulnerability audit all pass. No application dependency or security gate
was weakened to hide this package-manager metadata issue.

## Remaining boundary

- Milestone 7 owns broad visual critique, brand refinement, final responsive/animation polish, and
  presentation-grade screenshot selection.
- Cloud deployment, final PPT, demo video, and public GitHub presentation treatment remain deferred.
- benchmark-v2 remains prospective and is not created.
- Timings and bundle sizes are practical local observations, not production-performance claims.
