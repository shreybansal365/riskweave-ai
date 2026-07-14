# RiskWeave AI — Quantum-Readiness Service

## Boundary

RiskWeave inventories synthetic cryptographic assets linked to transaction channels and calculates a
transparent migration priority. This service does not detect an active quantum attack and never
changes cyber, transaction, correlation, or fused fraud-risk scores.

## Deterministic priority calculation

The service adds the following explainable components and clamps the result to 0–100.

### Algorithm family

| Family | Points |
|---|---:|
| RSA | 30 |
| ECC | 30 |
| Other/unclassified | 20 |
| Symmetric | 8 |
| Hybrid | 8 |
| ML-KEM | 0 |
| ML-DSA | 0 |

### Synthetic data sensitivity

| Sensitivity | Points |
|---|---:|
| Low | 0 |
| Moderate | 8 |
| High | 15 |
| Critical | 25 |

### Confidentiality horizon

The service adds one point for each required confidentiality year, capped at 20 points.

### Readiness and migration

- not marked post-quantum ready: +15;
- marked post-quantum ready: −8;
- migration not assessed: +12;
- migration planned: +6;
- migration in progress: +3;
- post-quantum ready migration state: +0.

### Priority levels

| Score | Level |
|---:|---|
| 0–24 | Low |
| 25–49 | Medium |
| 50–74 | High |
| 75–100 | Urgent |

Every asset response lists the five component reasons, linked transaction channels, assessment time,
and explicit fraud-risk separation notice. Seeded values reconcile exactly: the synthetic legacy RSA
gateway scores 88/urgent and the hybrid mobile gateway scores 22/low.

## Limitations

This is a prototype prioritization rubric over synthetic assets, not a cryptographic certification,
compliance assessment, algorithm implementation, vulnerability scanner, or active-attack detector. A
real migration program requires a governed inventory, cryptographic discovery, data-lifetime analysis,
vendor coordination, standards review, key-management planning, and independent security validation.

