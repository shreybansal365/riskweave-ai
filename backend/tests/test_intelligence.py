from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from app.models.enums import ContributionCategory, CyberEventType, RiskLevel
from risk_engine.anomaly import IsolationForestSupport
from risk_engine.correlation import correlate_events, evaluate_interactions
from risk_engine.explainability import build_explanation
from risk_engine.fusion import decision_for_score, fuse_scores
from risk_engine.rules import (
    CYBER_ENDPOINT_ALERT,
    CYBER_FAILED_MFA,
    CYBER_IMPOSSIBLE_TRAVEL,
    CYBER_NEW_DEVICE,
    CYBER_RISKY_NETWORK,
    CYBER_SESSION_TOKEN_ANOMALY,
    CYBER_UNUSUAL_LOCATION,
    CYBER_UNUSUAL_LOGIN_TIME,
    TRANSACTION_DESTINATION_RISK,
    TRANSACTION_HIGH_AMOUNT,
    TRANSACTION_HISTORICAL_DEVIATION,
    TRANSACTION_NEW_BENEFICIARY,
    TRANSACTION_UNUSUAL_CHANNEL,
    TRANSACTION_VELOCITY_SPIKE,
    CyberRiskEngine,
    TransactionRiskEngine,
)
from risk_engine.types import (
    Contribution,
    CorrelatableEvent,
    CyberFeatures,
    TransactionCorrelationContext,
    TransactionFeatures,
)

NOW = datetime(2026, 7, 14, 9, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("event_type", "expected_code", "expected_points", "hours"),
    [
        (CyberEventType.NEW_DEVICE, CYBER_NEW_DEVICE, 12, Decimal("0")),
        (CyberEventType.MFA_FAILED, CYBER_FAILED_MFA, 14, Decimal("0")),
        (CyberEventType.RISKY_IP, CYBER_RISKY_NETWORK, 10, Decimal("0")),
        (CyberEventType.PROXY_DETECTED, CYBER_RISKY_NETWORK, 10, Decimal("0")),
        (CyberEventType.UNUSUAL_LOCATION, CYBER_UNUSUAL_LOCATION, 8, Decimal("0")),
        (CyberEventType.IMPOSSIBLE_TRAVEL, CYBER_IMPOSSIBLE_TRAVEL, 16, Decimal("0")),
        (CyberEventType.ENDPOINT_ALERT, CYBER_ENDPOINT_ALERT, 18, Decimal("0")),
        (CyberEventType.UNUSUAL_LOGIN_TIME, CYBER_UNUSUAL_LOGIN_TIME, 6, Decimal("4")),
        (
            CyberEventType.SESSION_TOKEN_ANOMALY,
            CYBER_SESSION_TOKEN_ANOMALY,
            16,
            Decimal("0"),
        ),
    ],
)
def test_every_cyber_rule_is_stable_and_explainable(
    event_type: CyberEventType,
    expected_code: str,
    expected_points: int,
    hours: Decimal,
) -> None:
    event_id = uuid4()
    result = CyberRiskEngine().evaluate(
        CyberFeatures.create(
            event_types=frozenset({event_type}),
            event_ids={event_type: event_id},
            event_times={event_type: NOW},
            unusual_login_time_hours=hours,
        )
    )
    contribution = next(item for item in result.contributions if item.code == expected_code)
    assert contribution.points == expected_points
    assert contribution.source_event_id == event_id
    assert contribution.label
    assert contribution.explanation


def test_device_context_rules_and_mild_login_time_match_scenario_b() -> None:
    event_id = uuid4()
    result = CyberRiskEngine().evaluate(
        CyberFeatures.create(
            event_types=frozenset({CyberEventType.NEW_DEVICE, CyberEventType.UNUSUAL_LOGIN_TIME}),
            event_ids={
                CyberEventType.NEW_DEVICE: event_id,
                CyberEventType.UNUSUAL_LOGIN_TIME: uuid4(),
            },
            event_times={
                CyberEventType.NEW_DEVICE: NOW - timedelta(minutes=5),
                CyberEventType.UNUSUAL_LOGIN_TIME: NOW,
            },
            device_known=False,
            fingerprint_known=False,
            device_trusted=False,
            unusual_login_time_hours=Decimal("1.5"),
        )
    )
    assert result.rule_points == 30
    assert {item.points for item in result.contributions} == {4, 6, 8, 12}


@pytest.mark.parametrize(
    ("changes", "expected_code", "expected_points"),
    [
        (
            {"beneficiary_known": False, "beneficiary_age_days": Decimal("0")},
            TRANSACTION_NEW_BENEFICIARY,
            15,
        ),
        ({"amount_ratio": Decimal("5")}, TRANSACTION_HIGH_AMOUNT, 18),
        ({"velocity_ratio": Decimal("3")}, TRANSACTION_VELOCITY_SPIKE, 14),
        ({"destination_risk": RiskLevel.HIGH}, TRANSACTION_DESTINATION_RISK, 10),
        ({"channel_known": False}, TRANSACTION_UNUSUAL_CHANNEL, 8),
        (
            {"historical_deviation_mad": Decimal("5")},
            TRANSACTION_HISTORICAL_DEVIATION,
            12,
        ),
    ],
)
def test_every_transaction_rule_is_stable_and_explainable(
    changes: dict[str, object],
    expected_code: str,
    expected_points: int,
) -> None:
    transaction_id = uuid4()
    values: dict[str, object] = {
        "transaction_id": transaction_id,
        "baseline_id": uuid4(),
        "occurred_at": NOW,
    }
    values.update(changes)
    result = TransactionRiskEngine().evaluate(TransactionFeatures(**values))  # type: ignore[arg-type]
    contribution = next(item for item in result.contributions if item.code == expected_code)
    assert contribution.points == expected_points
    assert contribution.source_transaction_id == transaction_id
    assert contribution.explanation


def test_isolation_forest_is_deterministic_capped_and_concrete() -> None:
    support = IsolationForestSupport()
    vector = (0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 5.0, 1.0, 1.0)
    deviations = (
        "device was unseen",
        "fingerprint was unseen",
        "device posture was untrusted",
        "MFA failed",
        "endpoint posture changed",
        "login time changed",
    )
    first = support.points("cyber", vector, deviations)
    second = support.points("cyber", vector, deviations)
    assert first == second == 10

    result = CyberRiskEngine(support).evaluate(
        CyberFeatures.create(
            event_types=frozenset(
                {
                    CyberEventType.NEW_DEVICE,
                    CyberEventType.MFA_FAILED,
                    CyberEventType.RISKY_IP,
                    CyberEventType.UNUSUAL_LOCATION,
                    CyberEventType.ENDPOINT_ALERT,
                    CyberEventType.UNUSUAL_LOGIN_TIME,
                    CyberEventType.SESSION_TOKEN_ANOMALY,
                }
            ),
            device_known=False,
            fingerprint_known=False,
            device_trusted=False,
            unusual_login_time_hours=Decimal("5"),
            anomaly_deviations=deviations,
        )
    )
    anomaly = next(
        item for item in result.contributions if item.category == ContributionCategory.CYBER_ANOMALY
    )
    assert anomaly.points <= 10
    assert all(term not in anomaly.explanation.lower() for term in ("probability", "confidence"))
    assert decision_for_score(20)[1].value == "allow_and_monitor"


def test_correlation_window_is_inclusive_and_excludes_every_mismatch() -> None:
    customer_id, account_id, session_id, device_id = (uuid4() for _ in range(4))
    transaction = TransactionCorrelationContext(
        transaction_id=uuid4(),
        transaction_time=NOW,
        customer_id=customer_id,
        account_id=account_id,
        session_id=session_id,
        device_id=device_id,
    )

    def event(
        key: str,
        event_time: datetime,
        *,
        customer: object = customer_id,
        account: object = account_id,
        banking_session: object = session_id,
        device: object = device_id,
    ) -> CorrelatableEvent:
        assert isinstance(customer, type(customer_id))
        assert isinstance(account, type(account_id))
        assert isinstance(banking_session, type(session_id))
        assert isinstance(device, type(device_id))
        return CorrelatableEvent(
            event_id=uuid4(),
            event_type=CyberEventType.NEW_DEVICE,
            event_time=event_time,
            customer_id=customer,
            account_id=account,
            session_id=banking_session,
            device_id=device,
        )

    included_start = event("start", NOW - timedelta(minutes=30))
    included_end = event("end", NOW)
    candidates = (
        included_end,
        event("future", NOW + timedelta(microseconds=1)),
        event("old", NOW - timedelta(minutes=30, microseconds=1)),
        event("customer", NOW - timedelta(minutes=1), customer=uuid4()),
        event("account", NOW - timedelta(minutes=1), account=uuid4()),
        event("session", NOW - timedelta(minutes=1), banking_session=uuid4()),
        event("device", NOW - timedelta(minutes=1), device=uuid4()),
        included_start,
    )
    assert correlate_events(transaction, candidates) == (included_start, included_end)


def test_interactions_require_both_domains_suppress_overlap_and_cap_at_18() -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    cyber = tuple(
        Contribution(
            category=ContributionCategory.CYBER_RULE,
            code=code,
            label=code,
            points=1,
            explanation="grounded",
            source_event_id=event_id,
        )
        for code in (
            CYBER_NEW_DEVICE,
            CYBER_FAILED_MFA,
            CYBER_ENDPOINT_ALERT,
            CYBER_RISKY_NETWORK,
            CYBER_IMPOSSIBLE_TRAVEL,
        )
    )
    transaction = tuple(
        Contribution(
            category=ContributionCategory.TRANSACTION_RULE,
            code=code,
            label=code,
            points=1,
            explanation="grounded",
            source_transaction_id=transaction_id,
        )
        for code in (
            TRANSACTION_NEW_BENEFICIARY,
            TRANSACTION_HIGH_AMOUNT,
            TRANSACTION_VELOCITY_SPIKE,
        )
    )
    result = evaluate_interactions(cyber, transaction, transaction_id=transaction_id)
    assert result.bonus == 18
    assert [item.points for item in result.contributions] == [6, 6, 6]
    assert "correlation.risky_network_new_beneficiary" not in {
        item.code for item in result.contributions
    }
    assert evaluate_interactions(cyber, (), transaction_id=transaction_id).bonus == 0


@pytest.mark.parametrize(
    ("score", "severity", "action", "status"),
    [
        (19, "low", "allow", "permitted"),
        (20, "guarded", "allow_and_monitor", "permitted"),
        (39, "guarded", "allow_and_monitor", "permitted"),
        (40, "elevated", "step_up_authentication", "pending"),
        (59, "elevated", "step_up_authentication", "pending"),
        (60, "high", "hold_for_review", "held"),
        (79, "high", "hold_for_review", "held"),
        (80, "critical", "hold_and_open_critical_incident", "held"),
        (100, "critical", "hold_and_open_critical_incident", "held"),
    ],
)
def test_decision_threshold_boundaries(score: int, severity: str, action: str, status: str) -> None:
    observed = decision_for_score(score)
    assert tuple(item.value for item in observed) == (severity, action, status)


def test_fusion_uses_decimal_half_up_once_and_explanations_are_grounded() -> None:
    guarded = fuse_scores(40, 10, 0)
    assert guarded.raw_fused_score == Decimal("22.50")
    assert guarded.fused_score == 23
    assert guarded.severity.value == "guarded"
    critical = fuse_scores(78, 79, 18)
    assert critical.raw_fused_score == Decimal("88.65")
    assert critical.fused_score == 89

    contribution = Contribution(
        category=ContributionCategory.CYBER_RULE,
        code="cyber.new_device",
        label="New device",
        points=12,
        explanation="Device was absent from history.",
        occurred_at=NOW,
    )
    explanation = build_explanation(guarded, (contribution,))
    assert explanation.signal_narrative[0]["code"] == contribution.code
    assert "22.50" in explanation.decision_explanation
    assert "no hold or step-up" in explanation.action_explanation
