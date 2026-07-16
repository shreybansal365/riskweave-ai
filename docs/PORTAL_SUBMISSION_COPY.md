# FinSpark’26 portal submission copy

## Prototype title

**RiskWeave AI — Explainable Cross-Domain Banking Risk Correlation**

## Problem statement

**Problem Statement 2 — AI-driven correlation of cybersecurity telemetry and transactional
behaviour.**

## Brief solution explanation

RiskWeave AI correlates cybersecurity telemetry with transaction behaviour to detect and explain an
account takeover followed by a fraudulent transfer. It combines transparent cyber rules,
transaction rules, bounded deterministic anomaly support, and documented cross-domain interactions
into one backend-authoritative risk decision. Analysts receive the evidence chronology, exact score
contributions, source provenance, customer context, transaction status, and a proportionate response
workflow. Three deterministic synthetic scenarios demonstrate normal activity, a legitimate new
device that is monitored but permitted, and a critical account-takeover transfer that is held. All
prototype and benchmark results are explicitly limited to synthetic data.

## APIs, SDKs, and cloud-services explanation

RiskWeave uses a React and TypeScript frontend hosted on Vercel, which calls a typed FastAPI REST API
hosted on Render. The backend uses Pydantic, SQLAlchemy and Alembic with Render PostgreSQL to persist
deterministic synthetic cybersecurity and transaction data. A fixed-seed scikit-learn Isolation
Forest provides bounded anomaly support alongside the primary transparent rule engine. Docker
Compose reproduces the full stack locally, and GitHub Actions runs the automated quality gates. No
paid AI API or proprietary organizer toolkit is used.

## Public GitHub repository

<https://github.com/shreybansal365/riskweave-ai>

## Deployed web application

<https://riskweave-ai-shreybansal365.vercel.app>

## Video prototype

**TO BE ADDED AFTER RECORDING**
