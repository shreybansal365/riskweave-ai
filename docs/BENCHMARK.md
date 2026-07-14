# RiskWeave AI — benchmark-v1

## Identity

**benchmark-v1 — mixed synthetic security benchmark**

The immutable fixture contains 48 deterministic, reviewable cases:

- 18 identifiers in the `normal-*` group;
- 12 identifiers in the `unusual-legitimate-*` group;
- 18 fixed attack labels.

Engine-derived signal cohorts contain seven normal legitimate, 13 legitimate unusual cyber, 10
legitimate unusual transaction, 11 cross-domain attack, three cyber-only attack, and four
transaction-only attack cases. Labels are stored with the fixture and are not modified by the
evaluator.

## Comparators

- **Isolated cyber rule score:** deterministic cyber rule points without anomaly or transaction context.
- **Isolated transaction rule score:** deterministic transaction rule points without anomaly or cyber context.
- **Fused hybrid contextual score:** complete cyber and transaction streams, capped anomaly support, and eligible cross-domain bonuses.

These score scales are not calibrated identically. The comparison therefore describes the fixed
prototype behavior; it is not a controlled causal estimate of the value of correlation alone.

## Operating points

- **40+ escalation or step-up:** Elevated, High, and Critical outcomes are positive.
- **60+ operational hold/intervention:** High and Critical outcomes are positive. Use this as the primary metric only when describing holds or operational intervention.
- **80+ critical-only:** only Critical outcomes are positive.

## Computed benchmark-v1 results

| Operating point | Comparator | TP | FP | TN | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 40+ escalation | Isolated cyber rule score | 10 | 0 | 30 | 8 | 1.0000 | 0.5556 | 0.7143 |
|  | Isolated transaction rule score | 10 | 0 | 30 | 8 | 1.0000 | 0.5556 | 0.7143 |
|  | Fused hybrid contextual score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
| 60+ intervention | Isolated cyber rule score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
|  | Isolated transaction rule score | 8 | 0 | 30 | 10 | 1.0000 | 0.4444 | 0.6154 |
|  | Fused hybrid contextual score | 6 | 0 | 30 | 12 | 1.0000 | 0.3333 | 0.5000 |
| 80+ critical-only | Isolated cyber rule score | 0 | 0 | 30 | 18 | undefined | 0.0000 | undefined |
|  | Isolated transaction rule score | 0 | 0 | 30 | 18 | undefined | 0.0000 | undefined |
|  | Fused hybrid contextual score | 6 | 0 | 30 | 12 | 1.0000 | 0.3333 | 0.5000 |

Decision distributions:

| Comparator | Permitted | Monitored | Stepped up | Held |
|---|---:|---:|---:|---:|
| Isolated cyber rule score | 29 | 9 | 2 | 8 |
| Isolated transaction rule score | 35 | 3 | 2 | 8 |
| Fused hybrid contextual score | 24 | 16 | 2 | 6 |

The exact unfavorable 60+ result is retained: on the complete mixed fixture, fused recall is 0.3333
versus 0.4444 for each isolated rule comparator.

## Cohort results

At 60+:

| Cohort | Cases | Isolated cyber TP/FN | Isolated transaction TP/FN | Fused TP/FN |
|---|---:|---:|---:|---:|
| Cross-domain attacks | 11 | 7/4 | 6/5 | 6/5 |
| Cyber-only attacks | 3 | 1/2 | 0/3 | 0/3 |
| Transaction-only attacks | 4 | 0/4 | 2/2 | 0/4 |

All 30 legitimate cases are true negatives for every comparator at 40+, 60+, and 80+. This does not
establish broad false-positive reduction because no legitimate case contains unusual evidence in both
domains and no legitimate case activates a documented correlation interaction.

At 80+, only the fused hybrid score detects attacks: the same six strong cross-domain cases score 89.
Neither isolated rule score reaches 80 in this fixture. This calibration effect must not be represented
as universal fused superiority.

## Approved claim and limitations

> RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.

Known limitations:

- no legitimate case has unusual evidence in both domains;
- seven attacks are single-domain cases outside RiskWeave's primary product use case;
- isolated and fused score scales are not calibrated identically;
- benchmark-v1 does not demonstrate universal false-positive reduction;
- fused underperforms both isolated methods at 60+ on the complete mixed fixture;
- the fixture is small, synthetic, deterministic, and not representative of real banking prevalence or cost.

> Prototype evaluation on deterministic synthetic data; not evidence of real-world banking accuracy.

## Future benchmark-v2

`benchmark-v2` is a separately versioned future item. It must be designed prospectively before
evaluation and should include realistic cross-domain account-takeover cases, difficult legitimate
cross-domain combinations, matched operating points, and separate intervention and Critical outcomes.
It must not replace or alter benchmark-v1 and is not created during Milestone 4.

## Run

With Docker:

```bash
docker compose exec backend python -m app.cli.run_benchmark
```

Or locally:

```bash
make benchmark
```

The command validates the fixed 48-case distribution, evaluates every comparator once per case, and
prints calculated aggregate, operating-point, cohort, limitation, and disclaimer data.
