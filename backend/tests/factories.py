from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from app.core.security import PasswordService
from app.models.domain import (
    Account,
    AnalystAction,
    AuditEvent,
    BehaviourBaseline,
    Beneficiary,
    CryptoAsset,
    Customer,
    CyberEvent,
    Device,
    Incident,
    RiskContribution,
    ScenarioRun,
    Session,
    Transaction,
    TransactionChannel,
    User,
)
from app.models.enums import (
    AccountStatus,
    AccountType,
    AlgorithmFamily,
    AnalystActionType,
    AuditEventType,
    ContributionCategory,
    CyberEventType,
    DataSensitivity,
    DevicePosture,
    DeviceType,
    EventSeverity,
    IncidentStatus,
    MigrationStatus,
    QuantumPriority,
    RecommendedAction,
    RiskLevel,
    RiskSegment,
    ScenarioKey,
    ScenarioRunStatus,
    SessionStatus,
    Severity,
    TransactionChannelCode,
    TransactionStatus,
    UserRole,
)


@dataclass(frozen=True, slots=True)
class DomainGraph:
    customer: Customer
    account: Account
    device: Device
    session: Session
    cyber_event: CyberEvent
    beneficiary: Beneficiary
    crypto_asset: CryptoAsset
    channel: TransactionChannel
    transaction: Transaction
    incident: Incident
    contribution: RiskContribution
    analyst: User
    analyst_action: AnalystAction
    scenario_run: ScenarioRun
    audit_event: AuditEvent


def create_domain_graph(session: OrmSession, password_service: PasswordService) -> DomainGraph:
    now = datetime.now(UTC)
    customer = Customer(
        display_name=f"Synthetic Customer {uuid4().hex[:8]}",
        home_city="Pune",
        home_country="IN",
        risk_segment=RiskSegment.STANDARD,
    )
    session.add(customer)
    session.flush()

    account = Account(
        customer_id=customer.customer_id,
        account_type=AccountType.SAVINGS,
        currency="INR",
        status=AccountStatus.ACTIVE,
        typical_transaction_min_minor=10_000,
        typical_transaction_max_minor=500_000,
        average_daily_transaction_count=Decimal("2.50"),
    )
    device = Device(
        customer_id=customer.customer_id,
        fingerprint=f"device-{uuid4()}",
        device_type=DeviceType.MOBILE,
        operating_system="SyntheticOS 1",
        trusted=True,
        posture=DevicePosture.TRUSTED,
        first_seen_at=now - timedelta(days=30),
        last_seen_at=now,
    )
    baseline = BehaviourBaseline(
        customer_id=customer.customer_id,
        sample_started_at=now - timedelta(days=14),
        sample_ended_at=now,
        typical_login_start_hour=8,
        typical_login_end_hour=22,
        usual_cities=["Pune"],
        known_channels=[TransactionChannelCode.MOBILE_BANKING.value],
        median_transaction_amount_minor=75_000,
        transaction_amount_mad_minor=10_000,
        average_daily_transaction_count=Decimal("2.50"),
        typical_beneficiary_age_days=Decimal("180.00"),
        model_version="schema-test-v1",
    )
    beneficiary = Beneficiary(
        customer_id=customer.customer_id,
        display_name="Synthetic Beneficiary",
        bank_code="SYNTH001",
        risk_level=RiskLevel.LOW,
    )
    existing_channel = session.scalar(
        select(TransactionChannel).where(
            TransactionChannel.channel_code == TransactionChannelCode.MOBILE_BANKING
        )
    )
    crypto_asset = (
        existing_channel.crypto_asset
        if existing_channel is not None
        else CryptoAsset(
            name=f"Synthetic TLS Asset {uuid4()}",
            algorithm_family=AlgorithmFamily.RSA,
            data_sensitivity=DataSensitivity.HIGH,
            confidentiality_years=7,
            pqc_ready=False,
            migration_status=MigrationStatus.PLANNED,
            priority_score=70,
            priority_level=QuantumPriority.HIGH,
            assessment_reason="Synthetic schema relationship test",
            assessed_at=now,
        )
    )
    analyst = User(
        email=f"analyst-{uuid4().hex}@riskweave.demo",
        display_name="Synthetic Schema Analyst",
        password_hash=password_service.hash_password("Schema-Test-Password-2026!"),
        role=UserRole.ANALYST,
        active=True,
    )
    session.add_all([account, device, baseline, beneficiary, crypto_asset, analyst])
    session.flush()

    channel = existing_channel or TransactionChannel(
        channel_code=TransactionChannelCode.MOBILE_BANKING,
        display_name="Synthetic Mobile Channel",
        crypto_asset_id=crypto_asset.crypto_asset_id,
        active=True,
    )
    banking_session = Session(
        customer_id=customer.customer_id,
        account_id=account.account_id,
        device_id=device.device_id,
        ip_address="192.0.2.10",
        city="Pune",
        country="IN",
        started_at=now - timedelta(minutes=10),
        status=SessionStatus.ACTIVE,
    )
    session.add_all([channel, banking_session])
    session.flush()

    cyber_event = CyberEvent(
        session_id=banking_session.session_id,
        customer_id=customer.customer_id,
        account_id=account.account_id,
        device_id=device.device_id,
        event_type=CyberEventType.LOGIN_SUCCESS,
        event_time=now - timedelta(minutes=9),
        severity=EventSeverity.INFORMATIONAL,
        attributes={"synthetic": True},
    )
    transaction = Transaction(
        session_id=banking_session.session_id,
        customer_id=customer.customer_id,
        account_id=account.account_id,
        beneficiary_id=beneficiary.beneficiary_id,
        channel_id=channel.channel_id,
        amount_minor=80_000,
        currency="INR",
        created_at=now,
        status=TransactionStatus.PERMITTED,
        destination_risk=RiskLevel.LOW,
    )
    session.add_all([cyber_event, transaction])
    session.flush()

    incident = Incident(
        customer_id=customer.customer_id,
        account_id=account.account_id,
        session_id=banking_session.session_id,
        transaction_id=transaction.transaction_id,
        scenario_key=None,
        cyber_score=10,
        transaction_score=10,
        correlation_bonus=0,
        fused_score=9,
        severity=Severity.LOW,
        recommended_action=RecommendedAction.ALLOW,
        status=IncidentStatus.OPEN,
    )
    session.add(incident)
    session.flush()

    contribution = RiskContribution(
        incident_id=incident.incident_id,
        category=ContributionCategory.CYBER_RULE,
        code="schema_login_success",
        label="Successful login",
        points=10,
        explanation="Synthetic known-device login for persistence testing.",
        source_event_id=cyber_event.cyber_event_id,
        display_order=0,
    )
    analyst_action = AnalystAction(
        incident_id=incident.incident_id,
        analyst_id=analyst.user_id,
        action_type=AnalystActionType.ADD_NOTE,
        note="Synthetic persistence test note",
        previous_incident_status=IncidentStatus.OPEN,
        new_incident_status=IncidentStatus.OPEN,
        previous_transaction_status=TransactionStatus.PERMITTED,
        new_transaction_status=TransactionStatus.PERMITTED,
    )
    scenario_run = session.scalar(
        select(ScenarioRun).where(ScenarioRun.scenario_key == ScenarioKey.NORMAL_ACTIVITY)
    ) or ScenarioRun(
        scenario_key=ScenarioKey.NORMAL_ACTIVITY,
        status=ScenarioRunStatus.COMPLETED,
        seed=26026,
        simulation_epoch=now,
        run_fingerprint=f"schema-{uuid4()}",
        result_incident_id=incident.incident_id,
        started_at=now - timedelta(seconds=1),
        completed_at=now,
    )
    session.add_all([contribution, analyst_action, scenario_run])
    session.flush()
    audit_event = AuditEvent(
        actor_user_id=analyst.user_id,
        event_type=AuditEventType.ANALYST_ACTION_RECORDED,
        entity_type="analyst_action",
        entity_id=str(analyst_action.analyst_action_id),
        request_id=f"schema-{uuid4()}",
        details={"synthetic": True},
    )
    session.add(audit_event)
    session.flush()

    return DomainGraph(
        customer=customer,
        account=account,
        device=device,
        session=banking_session,
        cyber_event=cyber_event,
        beneficiary=beneficiary,
        crypto_asset=crypto_asset,
        channel=channel,
        transaction=transaction,
        incident=incident,
        contribution=contribution,
        analyst=analyst,
        analyst_action=analyst_action,
        scenario_run=scenario_run,
        audit_event=audit_event,
    )
