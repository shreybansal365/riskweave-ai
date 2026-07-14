# RiskWeave AI — Deterministic Data, Scenarios, and Benchmark

## Global simulation contract

- Simulation epoch: `2026-07-14T09:00:00Z`.
- Generator seed: `26026`.
- Isolation Forest random seed: `26026`.
- Seeded and scenario-generated identifiers use `uuid5(NAMESPACE_URL, "https://riskweave.ai/demo/v1/{entity_type}/{stable_key}")`.
- All timestamps are offsets from the simulation epoch, never the wall clock.
- Scenario execution is idempotent and atomic.
- Backend rounding is half-up and happens once after clamping.
- No scenario depends on an external API or non-deterministic output.

## Shared fusion formula

```text
fused_score = round_half_up(clamp(
    0.45 × cyber_score
  + 0.45 × transaction_score
  + correlation_bonus,
  0,
  100
))
```

Correlation bonus is capped at 18. When a weak and strong correlation rule represent the same signal pairing, only the strongest eligible rule contributes.

## Scenario A — Normal activity

**Key:** `normal_activity`

Known device, familiar city, normal login time, successful MFA, established beneficiary, typical amount, and normal velocity.

Deterministic result:

- cyber score: 10;
- transaction score: 10;
- correlation bonus: 0;
- unrounded fused score: 9.0;
- fused score: 9;
- severity: `low`;
- action: `allow`;
- transaction status: `permitted`.

## Scenario B — Unusual but legitimate

**Key:** `legitimate_new_device`

A legitimate customer signs in from a new device in the usual city at a mildly unusual time. MFA succeeds. There is no risky IP, proxy, endpoint alert, impossible travel, or session-token anomaly. The customer transfers a normal amount to an established beneficiary at normal velocity.

### Cyber score

Rule contributions:

- new device: +12;
- first-seen fingerprint: +8;
- device posture not yet trusted: +6;
- login outside personal time baseline: +4.

Isolation Forest anomaly contribution:

- device/session behaviour deviation: +10.

Deterministic cyber score: 40.

### Transaction score

- ordinary baseline transaction exposure: +10.

Deterministic transaction score: 10.

### Correlation bonus

- no documented cross-domain interaction rule is satisfied: +0.

The new-device signal is already represented in the cyber stream. A normal transaction to an established beneficiary does not create a genuine cross-domain interaction, so no correlation bonus is awarded merely to reach a preferred fused score.

### Result

```text
0.45 × 40 + 0.45 × 10 + 0 = 22.5
round_half_up(22.5) = 23
```

- raw fused score: 22.5;
- fused score: 23;
- severity: `guarded`;
- action: `allow_and_monitor`;
- transaction status: `permitted`;
- no hold;
- no step-up authentication.

Purpose: demonstrate that a cyber-only view would escalate the activity, while normal transaction context keeps the fused decision proportionate.

## Scenario C — Account takeover

**Key:** `account_takeover`

### Cyber score

Rule contributions:

- new device: +12;
- failed MFA: +14;
- risky IP or proxy: +10;
- unusual location: +8;
- endpoint alert: +18;
- unusual login time: +6.

Rule subtotal: 68.

Isolation Forest anomaly contribution:

- combined session-behaviour deviation: +10.

Deterministic cyber score: 78.

### Transaction score

Rule contributions:

- new beneficiary: +15;
- amount above 5× normal: +18;
- velocity spike: +14;
- unusual destination: +10;
- historical deviation: +12.

Rule subtotal: 69.

Isolation Forest anomaly contribution:

- transaction-behaviour deviation: +10.

Deterministic transaction score: 79.

### Correlation bonus

- new device + new beneficiary: +6;
- failed MFA + high amount: +6;
- endpoint alert + velocity spike: +6.

Deterministic correlation bonus: 18. Each bonus is backed by a documented cross-domain interaction rule, and the global cap prevents the total from exceeding 18.

### Result

```text
0.45 × 78 + 0.45 × 79 + 18 = 88.65
round_half_up(88.65) = 89
```

- fused score: 89;
- severity: `critical`;
- action: `hold_and_open_critical_incident`;
- transaction status: `held`;
- critical incident opened;
- complete correlated timeline displayed.

## Fourteen-day background dataset

The deterministic baseline spans the half-open interval `[2026-06-30T09:00:00Z, 2026-07-14T09:00:00Z)`, exactly 14 days ending at the simulation epoch.

Atomic reset restores exactly:

- 12 synthetic customers;
- 12 accounts;
- 16 devices;
- 180 background transactions;
- 240 background cyber events;
- 15 background incidents;
- three showcase scenarios in `not_run` state.

The background incidents include a deliberate mix of low, guarded, elevated, high, and critical severities. They provide meaningful overview metrics and trends without obscuring the three showcase scenarios.

Running each showcase scenario creates one clearly labeled scenario-owned record. After all three run, the queue contains exactly 18 visible records.

## Atomic reset

Reset must:

1. execute in one database transaction;
2. remove analyst actions and scenario-owned derived records;
3. restore all baseline rows, statuses, scores, counts, and scenario states;
4. restore the same UUIDs and timestamps;
5. complete within 5 seconds locally;
6. leave no partially reset state if an error occurs.

## Labeled synthetic benchmark

The versioned benchmark contains exactly 48 cases:

- 18 normal legitimate cases;
- 12 unusual-but-legitimate cases;
- 18 account-takeover attack cases.

Each case has a fixed label, fixed identifiers, deterministic features, and a documented reason for the label.

Labels and fixtures are fixed independently of the observed comparison results. They must not be constructed, relabeled, or adjusted to guarantee that the fused contextual method wins.

### Compared decision modes

1. **Isolated cyber rules:** deterministic cyber-rule points without transaction context.
2. **Isolated transaction rules:** deterministic transaction-rule points without cyber context.
3. **Fused contextual decision:** full cyber and transaction streams, capped anomaly contributions, and eligible correlation bonuses.

For benchmark comparison, a case is treated as an escalation when the applicable score is 40 or above, corresponding to step-up verification or a stronger response.

### Required output

For each decision mode, compute rather than hard-code:

- true positives;
- false positives;
- true negatives;
- false negatives;
- precision where defined;
- recall where defined;
- number of permitted, monitored, stepped-up, and held decisions.

Every benchmark surface must display:

> Prototype evaluation on deterministic synthetic data; not evidence of real-world banking accuracy.

Benchmark results must be identical for the same repository version, dependency lockfiles, seed, and fixtures. The actual deterministic results must be reported even if an isolated method equals or outperforms the fused method on one or more measures.
