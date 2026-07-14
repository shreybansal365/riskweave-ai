# Milestone 6 visual-review baselines

These nine PNGs are deterministic functional-review evidence captured at `1440×900` from the local
Docker application after the fixed dataset was reset and all three showcase scenarios were run.

- `login-1440x900.png`
- `overview-1440x900.png`
- `incident-queue-1440x900.png`
- `account-takeover-investigation-1440x900.png`
- `legitimate-new-device-investigation-1440x900.png`
- `simulator-1440x900.png`
- `quantum-readiness-1440x900.png`
- `system-health-1440x900.png`
- `evaluation-1440x900.png`

Capture with `cd frontend && npm run test:e2e:visual`. The capture test requires exact routes,
route-specific persisted content, loaded fonts, reduced motion, and scroll position zero. These are not
pixel-diff golden files and are not the final PPT screenshots; they are the review input for Milestone
7's visual audit.

