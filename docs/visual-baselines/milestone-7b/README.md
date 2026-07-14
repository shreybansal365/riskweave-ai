# Milestone 7B visual review baselines

**Captured:** 15 July 2026  
**Source:** local Docker application at `http://localhost:4173`  
**State:** deterministic showcase dataset; synthetic administrator identity; reduced motion  
**Count:** 27 PNGs — nine routes at three required viewports

These images are post-redesign review evidence. They are not the final PPT or demo-video frames.
The historical files in `../milestone-6/` remain unchanged.

## Matrix

| Route composition | Visual purpose | 1440 × 900 | 1280 × 720 | 1024 × 768 | Status |
|---|---|---|---|---|---|
| Login | Product-specific protected-workspace entry | `login-1440x900.png` | `login-1280x720.png` | `login-1024x768.png` | Reviewed |
| Operational overview | Urgent workload and controlled-outcome hierarchy | `overview-1440x900.png` | `overview-1280x720.png` | `overview-1024x768.png` | Reviewed |
| Incident queue | Amount, C/T/bonus/fused comparison and transaction state | `incident-queue-1440x900.png` | `incident-queue-1280x720.png` | `incident-queue-1024x768.png` | Reviewed |
| Account-takeover investigation | Critical held-payment context and correlated Decision Weave | `account-takeover-investigation-1440x900.png` | `account-takeover-investigation-1280x720.png` | `account-takeover-investigation-1024x768.png` | Reviewed |
| Legitimate-new-device investigation | Guarded permitted treatment and intervention-avoided rationale | `legitimate-new-device-investigation-1440x900.png` | `legitimate-new-device-investigation-1280x720.png` | `legitimate-new-device-investigation-1024x768.png` | Reviewed |
| Scenario simulator | Progressive normal/guarded/critical decision story | `simulator-1440x900.png` | `simulator-1280x720.png` | `simulator-1024x768.png` | Reviewed |
| Quantum readiness | Separate migration-priority control plane | `quantum-readiness-1440x900.png` | `quantum-readiness-1280x720.png` | `quantum-readiness-1024x768.png` | Reviewed |
| System health | Truthful service, environment, and deterministic-integrity state | `system-health-1440x900.png` | `system-health-1280x720.png` | `system-health-1024x768.png` | Reviewed |
| Evaluation | Bounded benchmark conclusion and retained limitations | `evaluation-1440x900.png` | `evaluation-1280x720.png` | `evaluation-1024x768.png` | Reviewed |

## Reproduction

From `frontend/` with the local composed stack healthy:

```bash
npm run test:e2e:visual
```

The capture test restores the deterministic showcase state, gives every authenticated route a fresh
direct-link page/compositor surface, waits for route-specific persisted content and local fonts,
disables motion, clears active focus, normalizes page/sidebar/table scroll, and verifies that the
authenticated shell is complete before writing each file. Capture-only sticky-position and
backdrop-filter overrides prevent macOS headless-browser compositor seams without changing
application CSS.

The command passed as one explicit Chromium visual test. Every image was reviewed for complete shell
state, unclipped primary decisions, Scenario B's permitted treatment, benchmark qualification,
quantum/fraud separation, and absence of secrets or debug overlays.
