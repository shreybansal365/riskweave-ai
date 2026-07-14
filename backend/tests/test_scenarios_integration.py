from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.db.session import SessionFactory
from app.models.domain import AuditEvent, Incident, RiskContribution, ScenarioRun, Transaction
from app.models.enums import AuditEventType, ScenarioKey, ScenarioRunStatus, TransactionStatus
from app.services.demo_data import DemoDataService, dataset_fingerprint
from app.services.scenarios import ScenarioService


@pytest.mark.integration
def test_showcase_scenarios_match_locked_scores_and_persist_explanations(
    postgres_session_factory: SessionFactory,
) -> None:
    baseline = DemoDataService(postgres_session_factory).reset(
        request_id="scenario-integration-reset"
    )
    service = ScenarioService(postgres_session_factory)
    normal = service.run(ScenarioKey.NORMAL_ACTIVITY, request_id="scenario-normal")
    legitimate = service.run(
        ScenarioKey.LEGITIMATE_NEW_DEVICE,
        request_id="scenario-legitimate",
    )
    takeover = service.run(ScenarioKey.ACCOUNT_TAKEOVER, request_id="scenario-takeover")

    assert (
        normal.cyber_score,
        normal.transaction_score,
        normal.correlation_bonus,
        normal.raw_fused_score,
        normal.fused_score,
        normal.severity,
        normal.recommended_action,
        normal.transaction_status,
    ) == (10, 10, 0, Decimal("9.00"), 9, "low", "allow", "permitted")
    assert (
        legitimate.cyber_score,
        legitimate.transaction_score,
        legitimate.correlation_bonus,
        legitimate.raw_fused_score,
        legitimate.fused_score,
        legitimate.severity,
        legitimate.recommended_action,
        legitimate.transaction_status,
    ) == (
        40,
        10,
        0,
        Decimal("22.50"),
        23,
        "guarded",
        "allow_and_monitor",
        "permitted",
    )
    assert (
        takeover.cyber_score,
        takeover.transaction_score,
        takeover.correlation_bonus,
        takeover.raw_fused_score,
        takeover.fused_score,
        takeover.severity,
        takeover.recommended_action,
        takeover.transaction_status,
    ) == (
        78,
        79,
        18,
        Decimal("88.65"),
        89,
        "critical",
        "hold_and_open_critical_incident",
        "held",
    )

    with postgres_session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Incident)) == 18
        incident = session.get(Incident, takeover.incident_id)
        assert incident is not None
        assert incident.transaction.status == TransactionStatus.HELD
        assert "ROUND_HALF_UP" in incident.decision_explanation
        assert incident.summary
        assert incident.signal_narrative
        contributions = session.scalars(
            select(RiskContribution)
            .where(RiskContribution.incident_id == takeover.incident_id)
            .order_by(RiskContribution.display_order)
        ).all()
        assert (
            sum(item.points for item in contributions if item.category.value == "correlation") == 18
        )
        assert all(item.code and item.label and item.explanation for item in contributions)
        assert all(item.source_event_id or item.source_transaction_id for item in contributions)
        assert dataset_fingerprint(session) != baseline.fingerprint


@pytest.mark.integration
def test_scenario_execution_is_idempotent_and_reset_restores_exact_baseline(
    postgres_session_factory: SessionFactory,
) -> None:
    data_service = DemoDataService(postgres_session_factory)
    baseline = data_service.reset(request_id="scenario-idempotency-reset")
    scenario_service = ScenarioService(postgres_session_factory)
    first = scenario_service.run(
        ScenarioKey.LEGITIMATE_NEW_DEVICE,
        request_id="scenario-idempotency-first",
    )
    second = scenario_service.run(
        ScenarioKey.LEGITIMATE_NEW_DEVICE,
        request_id="scenario-idempotency-second",
    )
    assert first == second
    with postgres_session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Incident)) == 16
        assert session.scalar(select(func.count()).select_from(Transaction)) == 181

    restored = data_service.reset(request_id="scenario-idempotency-restore")
    assert restored.fingerprint == baseline.fingerprint
    assert restored.elapsed_seconds < 5
    with postgres_session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Incident)) == 15
        runs = session.scalars(select(ScenarioRun)).all()
        assert all(item.status == ScenarioRunStatus.NOT_RUN for item in runs)
        assert all(item.result_incident_id is None for item in runs)


@pytest.mark.integration
def test_scenario_score_recommendation_and_lifecycle_are_audited(
    postgres_session_factory: SessionFactory,
) -> None:
    DemoDataService(postgres_session_factory).reset(request_id="scenario-audit-reset")
    ScenarioService(postgres_session_factory).run(
        ScenarioKey.ACCOUNT_TAKEOVER,
        request_id="scenario-audit-run",
    )
    with postgres_session_factory() as session:
        events = session.scalars(
            select(AuditEvent).where(AuditEvent.request_id == "scenario-audit-run")
        ).all()
        assert {item.event_type for item in events} == {
            AuditEventType.SCENARIO_STARTED,
            AuditEventType.INCIDENT_CREATED,
            AuditEventType.SCORE_GENERATED,
            AuditEventType.RECOMMENDATION_GENERATED,
            AuditEventType.SCENARIO_COMPLETED,
        }
        score_event = next(
            item for item in events if item.event_type == AuditEventType.SCORE_GENERATED
        )
        assert score_event.details["fused_score"] == 89
        assert "probability" not in str(score_event.details).lower()
