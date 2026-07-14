# RiskWeave AI — Risk Scoring Implementation

This document describes the Milestone 3 implementation. The authoritative product constraints remain
the root specification files. All scores are calculated on the backend; a future frontend must display
stored results and must never reproduce this arithmetic.

## Cyber rules

| Stable code | Trigger | Points |
|---|---|---:|
| `cyber.new_device` | Device is absent from trusted history | 12 |
| `cyber.first_seen_fingerprint` | Browser/device fingerprint has not appeared before | 8 |
| `cyber.untrusted_device_posture` | Device posture is not trusted | 6 |
| `cyber.failed_mfa` | Correlated session contains failed MFA | 14 |
| `cyber.risky_network` | Correlated session contains a risky-IP or proxy event | 10 |
| `cyber.unusual_location` | Login city falls outside the baseline | 8 |
| `cyber.impossible_travel` | Time and distance make travel implausible | 16 |
| `cyber.endpoint_alert` | Endpoint telemetry reports compromise indicators | 18 |
| `cyber.unusual_login_time` | Login is outside the personal window | 4 or 6 |
| `cyber.session_token_anomaly` | Token behavior differs from normal rotation | 16 |

An otherwise ordinary session receives a transparent 10-point baseline exposure contribution. Rule
contributions retain stable codes, labels, explanations, baseline references, and source-event
references where an event caused the contribution.

## Transaction rules

| Stable code | Trigger | Points |
|---|---|---:|
| `transaction.new_beneficiary` | Unknown beneficiary created no more than one day earlier | 15 |
| `transaction.recent_beneficiary` | Beneficiary age is under seven days | 8 |
| `transaction.high_amount` | Amount is at least 5× the customer median | 18 |
| `transaction.amount_deviation` | Amount is at least 3× the customer median | 10 |
| `transaction.velocity_spike` | 30-minute velocity is at least 3× baseline | 14 |
| `transaction.velocity_spike` | 30-minute velocity is at least 2× baseline | 8 |
| `transaction.destination_risk` | Destination is high risk | 10 |
| `transaction.destination_risk` | Destination is medium risk | 5 |
| `transaction.unusual_channel` | Channel is absent from baseline history | 8 |
| `transaction.historical_deviation` | Amount is at least 5 median absolute deviations away | 12 |
| `transaction.historical_deviation` | Amount is at least 3 median absolute deviations away | 7 |

An otherwise ordinary transfer receives a transparent 10-point baseline exposure contribution. Every
transaction contribution references the transaction and persisted behavioural baseline.

## Deterministic anomaly support

Two Isolation Forest models use `random_state=26026`, 96 estimators, a fixed synthetic training matrix,
and single-threaded evaluation. Cyber features cover known/trusted device state, MFA, risky network,
location, time deviation, endpoint state, and token state. Transaction features cover amount ratio,
velocity ratio, beneficiary age, destination risk, channel familiarity, and historical deviation.

The model is only an outlier gate. If the vector is an outlier and concrete feature deviations exist,
the engine adds two points per unique described deviation, capped at 10 points for that stream. It
returns no public probability or confidence value. The visible contribution lists understandable
feature deviations and source context. Rules remain primary, and an anomaly contribution alone cannot
produce a hold because its maximum is below the 60-point hold threshold.

Limitations: the model is trained only on deterministic synthetic history, is not calibrated to real
banking populations, and does not establish real-world detection performance.

## Correlation and interactions

An event is eligible only when all identity fields match and:

```text
transaction_time - 30 minutes <= event_time <= transaction_time
```

Customer, account, and session must match exactly. Device also matches when both sides provide one.
Future, out-of-window, and mismatched events are excluded.

| Stable code | Required cyber + transaction signals | Bonus |
|---|---|---:|
| `correlation.new_device_new_beneficiary` | New device + new beneficiary | 6 |
| `correlation.failed_mfa_high_amount` | Failed MFA + amount at least 5× median | 6 |
| `correlation.endpoint_velocity_spike` | Endpoint alert + velocity spike | 6 |
| `correlation.risky_network_new_beneficiary` | Risky network + new beneficiary | 4 |
| `correlation.impossible_travel_high_amount` | Impossible travel + high amount | 6 |

The risky-network/new-beneficiary rule is suppressed when the stronger new-device/new-beneficiary rule
already represents that beneficiary interaction. Eligible bonuses are accepted deterministically up to
the 18-point global cap. No bonus is added merely to obtain a preferred decision.

## Fusion and action

```text
raw_fused_score =
    0.45 × cyber_score
  + 0.45 × transaction_score
  + correlation_bonus
```

Inputs and output are clamped to 0–100. Python `Decimal` arithmetic is used and `ROUND_HALF_UP` is
performed exactly once after clamping.

| Rounded score | Severity | Action | Transaction status |
|---:|---|---|---|
| 0–19 | Low | Allow | `permitted` |
| 20–39 | Guarded | Allow and monitor | `permitted` |
| 40–59 | Elevated | Step-up verification | `pending` |
| 60–79 | High | Hold for analyst review | `held` |
| 80–100 | Critical | Hold and open critical incident | `held` |

## Explainability

The explanation service is deterministic and template-based. It stores a concise summary, a stable
chronological signal narrative, every cyber/transaction/interaction contribution, the exact fusion and
rounding description, and the recommended-action rationale. It does not call an LLM or invent reasons
that are absent from persisted contributions.
