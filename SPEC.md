# RiskWeave AI — Product and Engineering Specification

## 1. Summary

RiskWeave AI is an explainable cyber-transaction intelligence platform for banking fraud and security analysts. It correlates login, MFA, device, IP, endpoint, location, and session telemetry with beneficiary, amount, destination, velocity, channel, and customer-behaviour signals.

Its focused purpose is to identify and explain account-takeover fraud by combining cyber and transaction context. Proportionate treatment of unusual activity is demonstrated only through the locked showcase scenarios and qualified synthetic benchmark results.

## 2. Primary user

A banking fraud or security analyst who needs to understand:

- what happened;
- why it is risky;
- which cyber and transaction signals contributed;
- how the signals were correlated;
- what action is recommended;
- what action has been simulated or taken.

## 3. Primary use case

An attacker gains access to a customer’s digital-banking account and attempts a fraudulent transfer. RiskWeave links the relevant session, cyber events, beneficiary, and transaction into one explainable incident.

The prototype simulates decisions and transaction states. It does not connect to a real bank or move real money.

## 4. Functional requirements

### 4.1 Cyber telemetry

- login success or failure;
- MFA success or failure;
- known or new device;
- first-seen browser or device fingerprint;
- device-trust posture;
- IP and risky-network flag;
- familiar or unusual location;
- impossible travel;
- unusual login time;
- compromised-device or endpoint alert;
- session-token anomaly.

### 4.2 Transaction signals

- transaction amount;
- known or new beneficiary;
- beneficiary age;
- transaction velocity;
- destination risk;
- transaction channel;
- deviation from normal customer behaviour.

### 4.3 Correlation

Required correlation identifiers:

- `customer_id`;
- `account_id`;
- `session_id`;
- `device_id` where applicable;
- `transaction_id`.

For a transaction at `transaction_time`, only cyber events in this inclusive window are eligible:

```text
transaction_time - 30 minutes <= event_time <= transaction_time
```

An eligible event must match the transaction’s customer, account, and session. Future events, mismatched identifiers, and events outside the window are excluded.

### 4.4 Risk intelligence

RiskWeave calculates:

- cyber-risk score, 0–100;
- transaction-risk score, 0–100;
- correlation bonus, 0–18;
- fused contextual-risk score, 0–100;
- severity;
- recommended action;
- human-readable contributions and reasons.

The fused score is calculated exactly as specified in `ARCHITECTURE.md`. Scoring occurs only on the backend.

The risk engine is hybrid:

1. deterministic and explainable rules provide the primary score;
2. a fixed-seed Isolation Forest evaluates deterministic synthetic historical behaviour;
3. the anomaly model may contribute at most 10 points to each individual risk stream;
4. the anomaly component cannot independently cause a hold;
5. explanations describe observable deviations rather than model probability or confidence.

### 4.5 Analyst workflow

Analysts can:

- view and filter incidents;
- open a direct investigation URL;
- inspect customer, account, device, session, beneficiary, transaction, and channel context;
- inspect cyber, transaction, correlation, and anomaly contributions;
- inspect the combined chronological timeline;
- mark confirmed fraud, legitimate, or needs review;
- add plain-text notes;
- simulate permitted, held, released, or declined transaction outcomes where authorized.

Admins can additionally reset scenarios, inspect system health and audit events, and manage demo configuration.

### 4.6 Scenario simulator

Deterministic controls must run:

1. normal activity;
2. unusual but legitimate activity;
3. account-takeover attack.

Scenario execution is idempotent. Atomic reset restores the exact baseline dataset, scenario state, incident state, and counters.

### 4.7 Background dataset

The fixed 14-day background dataset contains:

- 12 synthetic customers;
- 12 synthetic accounts;
- 16 devices;
- 180 transactions;
- 240 cyber events;
- 15 background incidents.

Running the three showcase scenarios adds one clearly labeled decision record per scenario, producing 18 visible incidents. All counts and identifiers are restored by reset.

### 4.8 Synthetic benchmark

`benchmark-v1 — mixed synthetic security benchmark` is a deterministic 48-case labeled fixture containing:

- 18 normal legitimate cases;
- 12 unusual-but-legitimate cases;
- 18 attack cases.

It compares these precisely named score modes:

- isolated cyber rule score;
- isolated transaction rule score;
- fused hybrid contextual score.

It reports confusion matrices and derived metrics at three separately labeled operating points:

- 40+: escalation or step-up;
- 60+: operational hold or intervention;
- 80+: critical-only.

The 60+ operating point is primary only when discussing held transactions or operational intervention. Results are also separated into normal-legitimate, legitimate-unusual-cyber, legitimate-unusual-transaction, cross-domain-attack, cyber-only-attack, and transaction-only-attack cohorts.

Outputs are computed from versioned fixtures and the same scoring code used by the application; results are never hard-coded into the UI. All results are prototype outcomes on deterministic synthetic data. `benchmark-v1` contains no legitimate case with unusual evidence in both domains, includes seven single-domain attacks outside the primary use case, and does not establish universal false-positive reduction. The isolated and fused score scales are not calibrated identically.

### 4.9 Quantum-readiness assessment

Transaction channels reference cryptographic assets. A separate readiness module assesses:

- current algorithm family;
- data sensitivity;
- confidentiality lifetime;
- post-quantum readiness;
- migration status and priority.

Quantum readiness does not alter cyber, transaction, correlation, or fused fraud-risk scores. It is described as readiness and exposure assessment, not active quantum-attack detection.

## 5. Determinism requirements

- fixed simulation epoch;
- fixed generator and model seeds;
- deterministic UUIDv5 identifiers for seeded and scenario-generated entities;
- deterministic training data and pinned model dependencies;
- idempotent scenario execution;
- atomic reset;
- no dependency on an external API or wall-clock time;
- one backend rounding operation;
- frontend values copied directly from API responses.

## 6. Out of scope

- real banking integration;
- real customer data;
- AML;
- card-network fraud;
- facial recognition;
- employee profiling;
- deep-learning training;
- real-money transaction blocking;
- production certification;
- mobile application;
- multi-bank tenancy;
- active quantum-attack detection.

## 7. Prototype success criteria

- all three scenarios are deterministic;
- Scenario B produces cyber score 40, transaction score 10, correlation bonus 0, raw fused score 22.5, and backend half-up rounded fused score 23, with guarded severity and `allow_and_monitor` without a hold or step-up;
- the attack scenario produces critical risk and a held transaction;
- every major score has visible, understandable reasons;
- anomaly contribution never exceeds 10 points per stream;
- values remain consistent across pages;
- PostgreSQL migrations, seed, scenario execution, and reset work;
- local Docker run works;
- free-tier deployment works or has a documented fallback;
- benchmark outputs are computed and clearly labeled synthetic, and fixture labels are never altered to guarantee a preferred winner;
- benchmark-v1 reports all three operating points, approved cohorts, exact unfavorable results, comparator definitions, and limitations;
- README, architecture, screenshots, demo, security notes, and limitations are complete;
- UI satisfies `UI_SYSTEM.md`.

## 8. Product copy

**One-line description:**
RiskWeave AI correlates cybersecurity telemetry with transaction behaviour to identify account-takeover fraud and explain each prototype risk decision.

**Qualified scenario statement:**
RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the deterministic legitimate-new-device scenario. Broader false-positive reduction has not yet been established by benchmark-v1.

**Public wording:**
Built and maintained by Shrey Bansal. Developed for the FinSpark’26 Hackathon.
