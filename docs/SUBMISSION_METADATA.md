# FinSpark’26 confirmed submission metadata

These facts were confirmed by the registered participant and are authoritative for the final
submission package.

- Submission deadline: **16 July 2026, 11:59 PM India Standard Time (Asia/Kolkata)**.
- Registered team name: **CyberForge**.
- Selected problem: **Problem Statement 2 — AI-driven correlation of cybersecurity telemetry and
  transactional behaviour.**
- Required submission artefacts:
  - prototype presentation;
  - video prototype link;
  - public GitHub repository link;
  - deployed web application link.
- Organizer clarification for the portal field **“How does your solution leverage the mandatory
  toolkit?”**:

  > If you are using any APIs, SDKs, cloud services, etc., give a brief about the same.

RiskWeave therefore describes only APIs, SDKs, and cloud services that are actually present in the
verified release. It does not claim that the organizers supplied or required a proprietary toolkit.

## Identity and credit

- Product architecture, implementation, repository ownership, and maintenance: **Shrey Bansal**.
- Public project credit: **Built and maintained by Shrey Bansal.**
- Registered FinSpark’26 submission members: **Shrey Bansal, Anureet Kaur, Aryaman Saraswat, and
  Anushka Dutta.**

The registered-team list records submission membership only; it does not invent Git authorship or
technical contributions.

## Verified release services

- Public repository: <https://github.com/shreybansal365/riskweave-ai>
- Deployed application: <https://riskweave-ai-shreybansal365.vercel.app>
- Frontend hosting: Vercel.
- Backend hosting: Render Free Docker web service.
- Runtime database: Render Free PostgreSQL 17.
- Backend API: FastAPI with Pydantic, SQLAlchemy and Alembic.
- Bounded anomaly SDK: scikit-learn Isolation Forest with fixed seed `26026`.

Supabase is not part of the verified release and must not be named in the final portal response as an
actually used provider.
