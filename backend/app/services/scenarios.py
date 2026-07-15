from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from app.db.session import SessionFactory
from app.models.domain import (
    Account,
    BehaviourBaseline,
    Beneficiary,
    Customer,
    CyberEvent,
    Device,
    Incident,
    RiskContribution,
    ScenarioRun,
    Transaction,
    TransactionChannel,
)
from app.models.domain import (
    Session as BankingSession,
)
from app.models.enums import (
    AuditEventType,
    CyberEventType,
    DevicePosture,
    DeviceType,
    EventSeverity,
    IncidentStatus,
    RiskLevel,
    ScenarioKey,
    ScenarioRunStatus,
    SessionStatus,
    TransactionChannelCode,
    TransactionStatus,
)
from app.schemas.events import validate_event_attributes
from app.services.audit import AuditRecorder
from app.services.demo_data import SIMULATION_EPOCH, SIMULATION_SEED
from app.synthetic.identity import deterministic_uuid
from risk_engine.anomaly import MODEL_VERSION
from risk_engine.correlation import correlate_events, evaluate_interactions
from risk_engine.explainability import build_explanation
from risk_engine.fusion import ENGINE_VERSION, fuse_scores
from risk_engine.rules import CyberRiskEngine, TransactionRiskEngine
from risk_engine.types import (
    CorrelatableEvent,
    CyberFeatures,
    FusionResult,
    TransactionCorrelationContext,
    TransactionFeatures,
)


class DatasetNotSeededError(RuntimeError):
    """Raised when a showcase scenario is run before the deterministic reset."""


@dataclass(frozen=True, slots=True)
class ScenarioResult:
    scenario_key: ScenarioKey
    incident_id: UUID
    cyber_score: int
    transaction_score: int
    correlation_bonus: int
    raw_fused_score: Decimal
    fused_score: int
    severity: str
    recommended_action: str
    transaction_status: str


@dataclass(frozen=True, slots=True)
class _ScenarioEntities:
    customer: Customer
    account: Account
    baseline: BehaviourBaseline
    device: Device
    session: BankingSession
    beneficiary: Beneficiary
    transaction: Transaction
    events: tuple[CyberEvent, ...]
    cyber_features: CyberFeatures
    transaction_features: TransactionFeatures


_EXPECTED = {
    ScenarioKey.NORMAL_ACTIVITY: (10, 10, 0, Decimal("9.00"), 9),
    ScenarioKey.LEGITIMATE_NEW_DEVICE: (40, 10, 0, Decimal("22.50"), 23),
    ScenarioKey.ACCOUNT_TAKEOVER: (78, 79, 18, Decimal("88.65"), 89),
}


def expected_showcase_fusion(scenario_key: ScenarioKey) -> FusionResult:
    """Return backend-authoritative display expectations for a showcase scenario."""

    cyber_score, transaction_score, correlation_bonus, raw_score, fused_score = _EXPECTED[
        scenario_key
    ]
    result = fuse_scores(cyber_score, transaction_score, correlation_bonus)
    if result.raw_fused_score != raw_score or result.fused_score != fused_score:
        raise RuntimeError(f"locked expectation is inconsistent for {scenario_key.value}")
    return result


_EventSpec = tuple[CyberEventType, int, EventSeverity, dict[str, object]]
_CyberSettings = tuple[bool, bool, bool, Decimal, tuple[str, ...]]
_TransactionSettings = tuple[
    bool,
    Decimal,
    Decimal,
    Decimal,
    RiskLevel,
    bool,
    Decimal,
    tuple[str, ...],
]


class ScenarioService:
    """Run one deterministic showcase scenario inside a database transaction."""

    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def run(
        self,
        scenario_key: ScenarioKey,
        *,
        actor_user_id: UUID | None = None,
        request_id: str | None = None,
    ) -> ScenarioResult:
        request_identifier = request_id or f"scenario-{scenario_key.value}"
        try:
            with self._session_factory.begin() as session:
                run = session.scalar(
                    select(ScenarioRun)
                    .where(ScenarioRun.scenario_key == scenario_key)
                    .with_for_update()
                )
                if run is None:
                    raise DatasetNotSeededError("run the deterministic reset before scenarios")
                if run.status == ScenarioRunStatus.COMPLETED and run.result_incident_id:
                    incident = session.get(Incident, run.result_incident_id)
                    if incident is not None:
                        return _result_from_incident(incident)

                run.status = ScenarioRunStatus.RUNNING
                run.started_at = _scenario_time(scenario_key) - timedelta(minutes=30)
                run.completed_at = None
                AuditRecorder().record(
                    session,
                    event_type=AuditEventType.SCENARIO_STARTED,
                    entity_type="scenario",
                    entity_id=scenario_key.value,
                    request_id=request_identifier,
                    actor_user_id=actor_user_id,
                    details={"seed": SIMULATION_SEED},
                )

                entities = _create_entities(session, scenario_key)
                session.flush()
                eligible_events = correlate_events(
                    TransactionCorrelationContext(
                        transaction_id=entities.transaction.transaction_id,
                        transaction_time=entities.transaction.created_at,
                        customer_id=entities.transaction.customer_id,
                        account_id=entities.transaction.account_id,
                        session_id=entities.transaction.session_id,
                        device_id=entities.device.device_id,
                    ),
                    tuple(
                        CorrelatableEvent(
                            event_id=event.cyber_event_id,
                            event_type=event.event_type,
                            event_time=event.event_time,
                            customer_id=event.customer_id,
                            account_id=event.account_id,
                            session_id=event.session_id,
                            device_id=event.device_id,
                        )
                        for event in entities.events
                    ),
                )
                if len(eligible_events) != len(entities.events):
                    raise RuntimeError("showcase fixture contains an ineligible correlation event")

                cyber = CyberRiskEngine().evaluate(entities.cyber_features)
                transaction = TransactionRiskEngine().evaluate(entities.transaction_features)
                interactions = evaluate_interactions(
                    cyber.contributions,
                    transaction.contributions,
                    transaction_id=entities.transaction.transaction_id,
                )
                fusion = fuse_scores(cyber.score, transaction.score, interactions.bonus)
                _assert_locked_result(scenario_key, fusion)
                contributions = (
                    *cyber.contributions,
                    *transaction.contributions,
                    *interactions.contributions,
                )
                explanation = build_explanation(fusion, contributions)
                incident_id = deterministic_uuid("incident", f"scenario-{scenario_key.value}")
                entities.transaction.status = fusion.transaction_status
                incident = Incident(
                    incident_id=incident_id,
                    customer_id=entities.customer.customer_id,
                    account_id=entities.account.account_id,
                    session_id=entities.session.session_id,
                    transaction_id=entities.transaction.transaction_id,
                    scenario_key=scenario_key,
                    cyber_score=fusion.cyber_score,
                    transaction_score=fusion.transaction_score,
                    correlation_bonus=fusion.correlation_bonus,
                    raw_fused_score=fusion.raw_fused_score,
                    fused_score=fusion.fused_score,
                    severity=fusion.severity,
                    recommended_action=fusion.recommended_action,
                    status=IncidentStatus.OPEN,
                    summary=explanation.summary,
                    signal_narrative=list(explanation.signal_narrative),
                    decision_explanation=explanation.decision_explanation,
                    action_explanation=explanation.action_explanation,
                    engine_version=ENGINE_VERSION,
                    model_version=MODEL_VERSION,
                    created_at=entities.transaction.created_at,
                    updated_at=entities.transaction.created_at,
                )
                session.add(incident)
                for order, contribution in enumerate(contributions):
                    session.add(
                        RiskContribution(
                            contribution_id=deterministic_uuid(
                                "risk-contribution",
                                f"scenario-{scenario_key.value}/{contribution.code}",
                            ),
                            incident_id=incident_id,
                            category=contribution.category,
                            code=contribution.code,
                            label=contribution.label,
                            points=contribution.points,
                            explanation=contribution.explanation,
                            source_event_id=contribution.source_event_id,
                            source_transaction_id=contribution.source_transaction_id,
                            source_baseline_id=contribution.source_baseline_id,
                            display_order=order,
                        )
                    )

                run.status = ScenarioRunStatus.COMPLETED
                run.result_incident_id = incident_id
                run.completed_at = entities.transaction.created_at + timedelta(seconds=1)
                _audit_result(
                    session,
                    scenario_key=scenario_key,
                    incident_id=incident_id,
                    fusion=fusion,
                    request_id=request_identifier,
                    actor_user_id=actor_user_id,
                )
                session.flush()
                return _result_from_incident(incident)
        except Exception:
            self._record_failure(
                scenario_key,
                actor_user_id=actor_user_id,
                request_id=request_identifier,
            )
            raise

    def _record_failure(
        self,
        scenario_key: ScenarioKey,
        *,
        actor_user_id: UUID | None,
        request_id: str,
    ) -> None:
        with self._session_factory.begin() as session:
            run = session.scalar(
                select(ScenarioRun).where(ScenarioRun.scenario_key == scenario_key)
            )
            if run is None:
                return
            run.status = ScenarioRunStatus.FAILED
            run.completed_at = _scenario_time(scenario_key)
            AuditRecorder().record(
                session,
                event_type=AuditEventType.SCENARIO_FAILED,
                entity_type="scenario",
                entity_id=scenario_key.value,
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": "scenario transaction rolled back"},
            )


def _create_entities(session: OrmSession, scenario_key: ScenarioKey) -> _ScenarioEntities:
    customer_number = {
        ScenarioKey.NORMAL_ACTIVITY: 1,
        ScenarioKey.LEGITIMATE_NEW_DEVICE: 2,
        ScenarioKey.ACCOUNT_TAKEOVER: 3,
    }[scenario_key]
    customer_key = f"customer-{customer_number:02d}"
    customer = session.get(Customer, deterministic_uuid("customer", customer_key))
    account = session.get(Account, deterministic_uuid("account", customer_key))
    baseline = session.scalar(
        select(BehaviourBaseline).where(
            BehaviourBaseline.customer_id == deterministic_uuid("customer", customer_key)
        )
    )
    channel = session.scalar(
        select(TransactionChannel).where(
            TransactionChannel.channel_code == TransactionChannelCode.WEB_BANKING
        )
    )
    if customer is None or account is None or baseline is None or channel is None:
        raise DatasetNotSeededError("deterministic baseline entities are missing")

    scenario_time = _scenario_time(scenario_key)
    events_spec: tuple[_EventSpec, ...]
    cyber_settings: _CyberSettings
    transaction_settings: _TransactionSettings
    if scenario_key == ScenarioKey.NORMAL_ACTIVITY:
        device = session.get(Device, deterministic_uuid("device", f"{customer_key}-1"))
        beneficiary = session.get(
            Beneficiary,
            deterministic_uuid("beneficiary", f"{customer_key}-beneficiary-1"),
        )
        if device is None or beneficiary is None:
            raise DatasetNotSeededError("normal scenario context is missing")
        events_spec = (
            (
                CyberEventType.LOGIN_SUCCESS,
                -12,
                EventSeverity.INFORMATIONAL,
                {
                    "authentication_method": "password_mfa",
                    "browser_fingerprint": device.fingerprint,
                },
            ),
            (CyberEventType.MFA_SUCCESS, -10, EventSeverity.INFORMATIONAL, {"method": "totp"}),
        )
        cyber_settings = (True, True, True, Decimal("0"), ())
        transaction_settings = (
            True,
            Decimal("120"),
            Decimal("1"),
            Decimal("1"),
            RiskLevel.LOW,
            True,
            Decimal("0"),
            (),
        )
    elif scenario_key == ScenarioKey.LEGITIMATE_NEW_DEVICE:
        device = Device(
            device_id=deterministic_uuid("device", "scenario-legitimate-new-device"),
            customer_id=customer.customer_id,
            fingerprint="rw-scenario-legitimate-first-seen",
            device_type=DeviceType.MOBILE,
            operating_system="SyntheticOS 2.0",
            trusted=False,
            posture=DevicePosture.UNKNOWN,
            first_seen_at=scenario_time - timedelta(minutes=20),
            last_seen_at=scenario_time,
        )
        session.add(device)
        beneficiary = session.get(
            Beneficiary,
            deterministic_uuid("beneficiary", f"{customer_key}-beneficiary-1"),
        )
        if beneficiary is None:
            raise DatasetNotSeededError("legitimate scenario beneficiary is missing")
        events_spec = (
            (
                CyberEventType.NEW_DEVICE,
                -20,
                EventSeverity.MEDIUM,
                {"first_seen_fingerprint": True, "device_posture": "unknown"},
            ),
            (CyberEventType.UNUSUAL_LOGIN_TIME, -15, EventSeverity.LOW, {"deviation_hours": 1.5}),
            (CyberEventType.MFA_SUCCESS, -10, EventSeverity.INFORMATIONAL, {"method": "push"}),
        )
        cyber_settings = (
            False,
            False,
            False,
            Decimal("1.5"),
            (
                "device was not previously observed in this customer's behavioural history",
                "browser fingerprint had not appeared before",
                "device posture was not trusted",
                "login time was outside the personal baseline",
                "device and session combination differed from prior sessions",
            ),
        )
        transaction_settings = (
            True,
            Decimal("120"),
            Decimal("1"),
            Decimal("1"),
            RiskLevel.LOW,
            True,
            Decimal("0"),
            (),
        )
    else:
        device = Device(
            device_id=deterministic_uuid("device", "scenario-account-takeover-device"),
            customer_id=customer.customer_id,
            fingerprint="rw-scenario-attacker-known-fleet-fingerprint",
            device_type=DeviceType.DESKTOP,
            operating_system="SyntheticOS 0.9",
            trusted=True,
            posture=DevicePosture.TRUSTED,
            first_seen_at=SIMULATION_EPOCH - timedelta(days=2),
            last_seen_at=scenario_time,
        )
        beneficiary = Beneficiary(
            beneficiary_id=deterministic_uuid(
                "beneficiary", "scenario-account-takeover-beneficiary"
            ),
            customer_id=customer.customer_id,
            display_name="Synthetic New High-Risk Beneficiary",
            bank_code="SYNATO1",
            created_at=scenario_time - timedelta(minutes=5),
            risk_level=RiskLevel.HIGH,
        )
        session.add_all([device, beneficiary])
        events_spec = (
            (
                CyberEventType.NEW_DEVICE,
                -25,
                EventSeverity.MEDIUM,
                {"first_seen_fingerprint": False, "device_posture": "trusted"},
            ),
            (CyberEventType.MFA_FAILED, -22, EventSeverity.HIGH, {"attempts": 2}),
            (
                CyberEventType.RISKY_IP,
                -18,
                EventSeverity.HIGH,
                {"risk_source": "reputation_fixture"},
            ),
            (
                CyberEventType.UNUSUAL_LOCATION,
                -17,
                EventSeverity.HIGH,
                {"previous_city": customer.home_city, "distance_km": 4200},
            ),
            (
                CyberEventType.ENDPOINT_ALERT,
                -12,
                EventSeverity.CRITICAL,
                {"alert_code": "synthetic_malware_indicator"},
            ),
            (CyberEventType.UNUSUAL_LOGIN_TIME, -10, EventSeverity.MEDIUM, {"deviation_hours": 4}),
        )
        cyber_settings = (
            False,
            True,
            True,
            Decimal("4"),
            (
                "device had a trusted organizational posture but was absent from this "
                "customer's behavioural history",
                "MFA outcome differed from normal successful authentication",
                "network reputation differed from normal sessions",
                "location behaviour differed from customer history",
                "endpoint posture differed from normal sessions",
                "login time was outside the personal baseline",
            ),
        )
        transaction_settings = (
            False,
            Decimal("0"),
            Decimal("6"),
            Decimal("4"),
            RiskLevel.HIGH,
            True,
            Decimal("6"),
            (
                "beneficiary was absent from transaction history",
                "amount exceeded the normal transaction range",
                "transaction velocity exceeded the baseline",
                "destination risk differed from customer history",
                "amount deviated materially from historical dispersion",
            ),
        )

    # New showcase devices/beneficiaries must exist before the composite
    # session identity is written. Existing entities make this a harmless
    # no-op, while PostgreSQL can enforce the same ordering for every scenario.
    session.flush()

    session_id = deterministic_uuid("session", f"scenario-{scenario_key.value}")
    banking_session = BankingSession(
        session_id=session_id,
        customer_id=customer.customer_id,
        account_id=account.account_id,
        device_id=device.device_id,
        ip_address="198.51.100.42"
        if scenario_key == ScenarioKey.ACCOUNT_TAKEOVER
        else "203.0.113.24",
        city="Remote Test City"
        if scenario_key == ScenarioKey.ACCOUNT_TAKEOVER
        else customer.home_city,
        country="SG" if scenario_key == ScenarioKey.ACCOUNT_TAKEOVER else "IN",
        started_at=scenario_time - timedelta(minutes=28),
        ended_at=scenario_time + timedelta(minutes=2),
        status=SessionStatus.ENDED,
    )
    transaction_id = deterministic_uuid("transaction", f"scenario-{scenario_key.value}")
    amount_ratio = transaction_settings[2]
    transaction = Transaction(
        transaction_id=transaction_id,
        session_id=session_id,
        customer_id=customer.customer_id,
        account_id=account.account_id,
        beneficiary_id=beneficiary.beneficiary_id,
        channel_id=channel.channel_id,
        amount_minor=int(Decimal(baseline.median_transaction_amount_minor) * amount_ratio),
        currency="INR",
        created_at=scenario_time,
        status=TransactionStatus.PENDING,
        destination_risk=transaction_settings[4],
    )
    session.add(banking_session)
    session.flush()
    session.add(transaction)
    events = tuple(
        CyberEvent(
            cyber_event_id=deterministic_uuid(
                "cyber-event", f"scenario-{scenario_key.value}-{event_type.value}"
            ),
            session_id=session_id,
            customer_id=customer.customer_id,
            account_id=account.account_id,
            device_id=device.device_id,
            event_type=event_type,
            event_time=scenario_time + timedelta(minutes=minute_offset),
            severity=severity,
            attributes=validate_event_attributes(event_type, attributes),
        )
        for event_type, minute_offset, severity, attributes in events_spec
    )
    session.add_all(events)
    event_ids = {event.event_type: event.cyber_event_id for event in events}
    event_times = {event.event_type: event.event_time for event in events}
    event_types = frozenset(event_ids)
    cyber_features = CyberFeatures.create(
        event_types=event_types,
        event_ids=event_ids,
        event_times=event_times,
        baseline_id=baseline.baseline_id,
        device_known=cyber_settings[0],
        fingerprint_known=cyber_settings[1],
        device_trusted=cyber_settings[2],
        unusual_login_time_hours=cyber_settings[3],
        location_distance_km=Decimal("4200")
        if scenario_key == ScenarioKey.ACCOUNT_TAKEOVER
        else Decimal("0"),
        anomaly_deviations=cyber_settings[4],
    )
    transaction_features = TransactionFeatures(
        transaction_id=transaction_id,
        baseline_id=baseline.baseline_id,
        beneficiary_known=transaction_settings[0],
        beneficiary_age_days=transaction_settings[1],
        amount_ratio=amount_ratio,
        velocity_ratio=transaction_settings[3],
        destination_risk=transaction_settings[4],
        channel_known=transaction_settings[5],
        historical_deviation_mad=transaction_settings[6],
        occurred_at=scenario_time,
        anomaly_deviations=transaction_settings[7],
    )
    return _ScenarioEntities(
        customer=customer,
        account=account,
        baseline=baseline,
        device=device,
        session=banking_session,
        beneficiary=beneficiary,
        transaction=transaction,
        events=events,
        cyber_features=cyber_features,
        transaction_features=transaction_features,
    )


def _scenario_time(scenario_key: ScenarioKey) -> datetime:
    offsets = {
        ScenarioKey.NORMAL_ACTIVITY: 5,
        ScenarioKey.LEGITIMATE_NEW_DEVICE: 15,
        ScenarioKey.ACCOUNT_TAKEOVER: 30,
    }
    return SIMULATION_EPOCH + timedelta(minutes=offsets[scenario_key])


def _assert_locked_result(scenario_key: ScenarioKey, fusion: FusionResult) -> None:
    expected = _EXPECTED[scenario_key]
    observed = (
        fusion.cyber_score,
        fusion.transaction_score,
        fusion.correlation_bonus,
        fusion.raw_fused_score,
        fusion.fused_score,
    )
    if observed != expected:
        raise RuntimeError(
            f"locked scenario result changed for {scenario_key.value}: {observed} != {expected}"
        )


def _audit_result(
    session: OrmSession,
    *,
    scenario_key: ScenarioKey,
    incident_id: UUID,
    fusion: FusionResult,
    request_id: str,
    actor_user_id: UUID | None,
) -> None:
    recorder = AuditRecorder()
    shared = {
        "scenario_key": scenario_key.value,
        "cyber_score": fusion.cyber_score,
        "transaction_score": fusion.transaction_score,
        "correlation_bonus": fusion.correlation_bonus,
        "raw_fused_score": str(fusion.raw_fused_score),
        "fused_score": fusion.fused_score,
    }
    for event_type, details in (
        (AuditEventType.INCIDENT_CREATED, {"scenario_key": scenario_key.value}),
        (AuditEventType.SCORE_GENERATED, shared),
        (
            AuditEventType.RECOMMENDATION_GENERATED,
            {
                "scenario_key": scenario_key.value,
                "recommended_action": fusion.recommended_action.value,
                "transaction_status": fusion.transaction_status.value,
            },
        ),
        (AuditEventType.SCENARIO_COMPLETED, shared),
    ):
        recorder.record(
            session,
            event_type=event_type,
            entity_type="incident"
            if event_type != AuditEventType.SCENARIO_COMPLETED
            else "scenario",
            entity_id=str(incident_id)
            if event_type != AuditEventType.SCENARIO_COMPLETED
            else scenario_key.value,
            request_id=request_id,
            actor_user_id=actor_user_id,
            details=details,
        )


def _result_from_incident(incident: Incident) -> ScenarioResult:
    if incident.scenario_key is None:
        raise ValueError("scenario result requires a scenario-owned incident")
    return ScenarioResult(
        scenario_key=incident.scenario_key,
        incident_id=incident.incident_id,
        cyber_score=incident.cyber_score,
        transaction_score=incident.transaction_score,
        correlation_bonus=incident.correlation_bonus,
        raw_fused_score=incident.raw_fused_score,
        fused_score=incident.fused_score,
        severity=incident.severity.value,
        recommended_action=incident.recommended_action.value,
        transaction_status=incident.transaction.status.value,
    )
