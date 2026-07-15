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

The synthetic device has a known fleet fingerprint and trusted organizational security posture, but
its device ID is absent from this customer's persisted behavioural baseline. RiskWeave therefore
reports two separate facts: `Device posture: Trusted` and `Customer familiarity: New to behavioural
history`. Technical posture does not establish prior customer use. The device record's
`first_seen_at` represents technical inventory history, not proof of a customer baseline session.

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

## benchmark-v1 — mixed synthetic security benchmark

The immutable `benchmark-v1` fixture contains exactly 48 cases:

- 18 cases whose identifiers begin with `normal-`;
- 12 cases whose identifiers begin with `unusual-legitimate-`;
- 18 labeled attacks.

Engine-derived cohort reporting further separates the cases into seven normal legitimate, 13
legitimate unusual cyber, 10 legitimate unusual transaction, 11 cross-domain attack, three cyber-only
attack, and four transaction-only attack cases.

Each case has a fixed label, fixed identifiers, deterministic features, and a documented reason for
the label. Labels and fixtures are fixed independently of observed results and must not be constructed,
relabeled, or adjusted to guarantee that the fused method wins.

### Comparators

1. **Isolated cyber rule score:** deterministic cyber-rule points without anomaly or transaction context.
2. **Isolated transaction rule score:** deterministic transaction-rule points without anomaly or cyber context.
3. **Fused hybrid contextual score:** full cyber and transaction streams, capped anomaly contributions, and eligible correlation bonuses.

The isolated and fused score scales are not identically calibrated. Reporting must disclose this
difference rather than describing the comparison as a controlled measurement of correlation alone.

### Operating points

- **40+: escalation or step-up.** Elevated, High, and Critical decisions are positive.
- **60+: operational hold/intervention.** High and Critical decisions are positive. This is the primary metric only when discussing held transactions or operational intervention.
- **80+: critical-only.** Only Critical decisions are positive.

For each operating point and comparator, compute rather than hard-code true positives, false
positives, true negatives, false negatives, precision, recall, F1 where defined, and decision counts.
Every benchmark surface must display:

> Prototype evaluation on deterministic synthetic data; not evidence of real-world banking accuracy.

### Complete mixed-fixture results

| Operating point | Comparator | TP | FP | TN | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 40+ escalation | Isolated cyber rule score | 10 | 0 | 30 | 8 | 1.0000 | 0.5556 | 0.7143 |
|  | Isolated transaction rule score | 10 | 0 | 30 | 8 | 1.0000 | 0.5556 | 0.7143 |
|  | Fused hybrid contextual score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
| 60+ operational intervention | Isolated cyber rule score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
|  | Isolated transaction rule score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
|  | Fused hybrid contextual score | 6 | 0 | 30 | 12 | 1.0000 | 0.3333 | 0.5000 |
| 80+ critical-only | Isolated cyber rule score | 0 | 0 | 30 | 18 | undefined | 0.0000 | undefined |
|  | Isolated transaction rule score | 0 | 0 | 30 | 18 | undefined | 0.0000 | undefined |
|  | Fused hybrid contextual score | 6 | 0 | 30 | 12 | 1.0000 | 0.3333 | 0.5000 |

Decision distributions are score-owned and therefore independent of the reporting operating point:

| Comparator | Permitted | Monitored | Stepped up | Held |
|---|---:|---:|---:|---:|
| Isolated cyber rule score | 29 | 9 | 2 | 8 |
| Isolated transaction rule score | 35 | 3 | 2 | 8 |
| Fused hybrid contextual score | 24 | 16 | 2 | 6 |

### Cohort interpretation

At 60+, the fused hybrid contextual score detects six of 11 cross-domain attacks, no cyber-only
attacks, and no transaction-only attacks. The isolated cyber rule score detects seven cross-domain and
one cyber-only attack. The isolated transaction rule score detects six cross-domain and two
transaction-only attacks. All three comparators produce zero false positives in the 30 legitimate cases.

At 80+, the fused hybrid contextual score detects the same six strong cross-domain attacks. Neither
isolated rule score reaches the Critical boundary in this fixture. This reflects score-scale calibration
and must not be presented as universal fused superiority.

### Known limitations

- No legitimate `benchmark-v1` case contains unusual evidence in both domains.
- Seven labeled attacks are single-domain cases outside RiskWeave's primary cross-domain use case.
- The isolated and fused score scales are not calibrated identically.
- The fixture does not demonstrate universal false-positive reduction.
- The fused method underperforms both isolated methods at 60+ on the complete mixed fixture.
- All outcomes apply only to deterministic synthetic data.

Approved claim:

> RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.

### Future benchmark-v2

`benchmark-v2` is a future, separately versioned fixture. It must be designed prospectively before
evaluation and should test realistic cross-domain account-takeover cases, difficult legitimate
cross-domain combinations, matched operating points, and intervention and Critical outcomes
separately. It must not rewrite `benchmark-v1` and is not part of Milestone 3 or Milestone 4.
