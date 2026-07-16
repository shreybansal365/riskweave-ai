# Final release acceptance

## Release identity

- Product: RiskWeave AI
- Repository owner and maintainer: Shrey Bansal
- FinSpark’26 team: CyberForge
- Problem: Problem Statement 2 — AI-driven correlation of cybersecurity telemetry and transactional
  behaviour
- Release baseline before this pass: `6fa9dfabfc4446829fa86a04f88ef50cabe5b61b`

## Publication and legal boundary

- Source code and documentation use Apache License 2.0.
- `NOTICE` records copyright, maintenance credit and the CyberForge submission context.
- The RiskWeave AI name, Concept A logo, wordmark and associated brand assets are reserved and are
  not licensed for independent reuse under Apache-2.0.
- Public SVG wordmarks use deterministic Inter outlines. Inter 5.2.8 is licensed under SIL OFL 1.1
  and is recorded in `THIRD_PARTY_NOTICES.md`.
- The Concept A paths, colours, inverse treatment, full-height teal `AI`, favicon and application
  integration remain unchanged.

## Reproducibility and deployment configuration

- `vercel.json` builds the Vite SPA from `frontend/`, retains deep links and applies bounded security
  headers.
- `render.yaml` defines the FastAPI Docker service, `/health` check, guarded initial bootstrap and
  complete secret/environment inventory.
- `python -m app.cli.bootstrap_release` migrates, initializes an empty database, verifies the exact
  deterministic manifest and refuses partial or unexpected state.
- Baseline manifest fingerprint:
  `2ac2c997d21246cc7380ce1f53e121bb58c79891ea98229e47e6f2ec998ef0ca`.
- The package manager is pinned to npm 11.6.2 in the frontend package, Docker images and CI.
- GitHub Actions are pinned to reviewed full commit SHAs with version comments.
- Firefox and WebKit execute sequentially in the clean Playwright container because both suites
  intentionally reset one shared deterministic demo database.

## Deterministic verification

Locked values remain intact:

| Scenario | Cyber | Transaction | Bonus | Raw fused | Rounded | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Normal Activity | 10 | 10 | 0 | 9.00 | 9 | Allowed |
| Legitimate New Device | 40 | 10 | 0 | 22.50 | 23 | Guarded; allow and monitor |
| Account Takeover | 78 | 79 | 18 | 88.65 | 89 | Critical; held |

- Atomic reset restores 15 baseline incidents.
- All showcase scenarios produce 18 visible incidents.
- Scenario execution, reset fingerprint, provenance, benchmark-v1 and exact score regressions pass.
- benchmark-v1 remains a mixed deterministic synthetic benchmark with its documented unfavorable
  results and limitations; it is not evidence of real-world banking accuracy.

## Final local verification

### Backend

- Ruff format: pass (95 files)
- Ruff lint: pass
- mypy: pass (91 source files)
- pytest: 106 passed
- coverage: 94.20%
- Alembic drift: none
- OpenAPI: 3.1.0, 20 paths
- Python dependency audit: no known vulnerabilities

### Frontend

- Prettier: pass
- ESLint: pass with zero warnings
- strict TypeScript: pass
- Vitest: 41 passed across 7 files
- coverage: 86.47% statements, 73.66% branches, 83.79% functions, 87.70% lines
- production build: pass
- npm audit: 0 vulnerabilities
- emitted local Inter asset: `inter-latin-wght-normal-Dx4kXJAl.woff2` (48.25 kB)
- remote font request/URL scan: none

### Browser and accessibility

- Chromium: 40 applicable tests passed; 6 opt-in visual captures skipped
- Firefox: 24 applicable tests passed; 21 opt-in/Chromium-only captures skipped; one configured retry,
  followed by a clean focused rerun
- WebKit: 24 applicable tests passed; 21 opt-in/Chromium-only captures skipped; one configured retry,
  followed by a clean focused rerun
- Principal-route axe checks: no serious or critical violations
- Supported 1440×900, 1280×720 and 1024×768 checks: pass
- Direct entry, reload, route focus, keyboard focus, deep links and role journeys: pass

### Docker and endpoints

- Base and browser-overlay Compose validation: pass
- PostgreSQL: healthy
- FastAPI backend: healthy
- production Nginx frontend: healthy
- browser-test Nginx frontend: healthy
- `/login`: HTTP 200
- `/health`: HTTP 200
- `/ready`: HTTP 200; database reachable, migrations current at `0003_intelligence_support`

## Publication hygiene

- No tracked `.env`, private key, cache, test-output or transient file.
- No GitHub, Supabase, cloud access-token or private-key signature found in the publication scan.
- No personal absolute workspace path found in publishable text files.
- Demo credentials remain environment-supplied and are not embedded in the frontend bundle.

## Evidence

- [`visual-baselines/final-release/inter-wordmark-lockups.png`](visual-baselines/final-release/inter-wordmark-lockups.png)

## Hosted release status

GitHub publication and hosted provider verification are completed after this local checkpoint. The
final public URLs, CI result, bootstrap result and hosted smoke results must be recorded here before
the release tag is created.

## Current verdict

**CONDITIONAL PASS** — the local release candidate passes; public GitHub publication and hosted
frontend/backend/database verification remain to be completed in this pass.
