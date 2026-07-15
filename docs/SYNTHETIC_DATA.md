# RiskWeave AI — Deterministic Synthetic Data

Milestone 3 uses synthetic records only. No real customer, account, device, beneficiary, transaction,
network, or banking data is included.

## Reproducibility contract

- seed: `26026`;
- model seed: `26026`;
- simulation epoch: `2026-07-14T09:00:00Z`;
- history window: `[2026-06-30T09:00:00Z, 2026-07-14T09:00:00Z)`;
- timezone: UTC;
- identifiers: UUIDv5 under the RiskWeave demo namespace;
- manifest: `backend/data/seeds/baseline_manifest.json`.

Atomic reset recreates 12 customers, 12 accounts, 16 devices, 36 beneficiaries, 180 sessions and
transactions, 240 cyber events, 12 behavioural baselines, two transaction channels, two linked crypto
assets, 15 visible background incidents, and three `not_run` scenario states. Analyst/admin identities
and append-oriented security audit history are not silently replaced by a data reset.

## History construction

Each synthetic customer has 15 background transfers distributed across the fixed 14-day interval.
Amounts, times, device choices, beneficiaries, channels, locations, session identifiers, and event
identifiers are deterministic functions of stable fixture keys. Documentation-reserved IP ranges are
used. The 240 events are 180 successful logins plus 60 successful MFA events.

The 15 background incidents are deliberately spread across low, guarded, elevated, high, and critical
contexts so later trend and overview surfaces have credible deterministic history. They are explicitly
fixture context, not claims that a trained model discovered 15 real incidents.

## Persisted behavioural baselines

Baselines are derived from persisted synthetic sessions, events, transactions, devices, beneficiaries,
and channels—not copied into UI constants. Each baseline records:

- previously observed customer device identifiers;
- usual login cities and login-hour range;
- known beneficiary identifiers and typical beneficiary age;
- median amount and median absolute deviation;
- average daily transaction count and typical 30-minute velocity;
- known channel usage;
- usual destination-risk levels;
- exact sample window and model version.

Device security posture and customer familiarity are independent. `Device.trusted` and
`Device.posture` describe technical or organizational posture. A device is familiar to a customer
only when its ID appears in that customer's persisted baseline `known_device_ids`. Device
`first_seen_at` is technical inventory history and is not evidence of prior customer use.

## Scenario and reset semantics

Each showcase scenario owns deterministic UUIDv5 records and one persisted `ScenarioRun`. A completed
scenario rerun returns its existing result and does not duplicate records. After all three scenarios,
the incident count is exactly 18.

Reset runs in a database transaction, clears demo-domain records in dependency order, rebuilds the
baseline, verifies its manifest counts, and commits only when the complete state is valid. A forced
failure integration test proves rollback leaves the prior dataset unchanged. Repeated reset produces
the same dataset fingerprint and completes below the five-second local target.

## Quantum-readiness linkage

Two deterministic crypto assets are linked to mobile and web transaction channels. The relationship is
queryable and covered by PostgreSQL integration tests. Quantum readiness is separate contextual data;
it never contributes to fraud scoring and does not claim active quantum-attack detection.
