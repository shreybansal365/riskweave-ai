from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from enum import Enum
from time import perf_counter
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.session import SessionFactory
from app.models.domain import (
    Account,
    AnalystAction,
    BehaviourBaseline,
    Beneficiary,
    CryptoAsset,
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
    AccountStatus,
    AccountType,
    AlgorithmFamily,
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
    RiskLevel,
    RiskSegment,
    ScenarioKey,
    ScenarioRunStatus,
    SessionStatus,
    TransactionChannelCode,
    TransactionStatus,
)
from app.schemas.events import validate_event_attributes
from app.services.audit import AuditRecorder
from app.services.baselines import generate_behavioural_baselines
from app.synthetic.identity import deterministic_uuid
from risk_engine.anomaly import MODEL_VERSION
from risk_engine.explainability import build_explanation
from risk_engine.fusion import ENGINE_VERSION, fuse_scores
from risk_engine.types import Contribution

SIMULATION_SEED = 26026
SIMULATION_EPOCH = datetime(2026, 7, 14, 9, 0, tzinfo=UTC)
WINDOW_START = datetime(2026, 6, 30, 9, 0, tzinfo=UTC)
DATASET_VERSION = "baseline-v1"

EXPECTED_BASELINE_COUNTS = {
    "customers": 12,
    "accounts": 12,
    "devices": 16,
    "transactions": 180,
    "cyber_events": 240,
    "incidents": 15,
    "scenario_runs": 3,
}


@dataclass(frozen=True, slots=True)
class DatasetSnapshot:
    counts: dict[str, int]
    fingerprint: str
    elapsed_seconds: float


class ForcedResetFailure(RuntimeError):
    """Test-only failure injected after destructive reset work has begun."""


class DemoDataService:
    """Own atomic reset of the deterministic synthetic banking dataset."""

    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory

    def reset(
        self,
        *,
        actor_user_id: UUID | None = None,
        request_id: str = "system-demo-reset",
        fail_after_delete: bool = False,
    ) -> DatasetSnapshot:
        started = perf_counter()
        with self._session_factory.begin() as session:
            _clear_demo_domain(session)
            if fail_after_delete:
                raise ForcedResetFailure("forced reset failure after domain deletion")
            _populate_background_dataset(session)
            session.flush()
            counts = baseline_counts(session)
            if counts != EXPECTED_BASELINE_COUNTS:
                raise RuntimeError(f"baseline manifest mismatch: {counts}")
            fingerprint = dataset_fingerprint(session)
            AuditRecorder().record(
                session,
                event_type=AuditEventType.SCENARIO_RESET,
                entity_type="synthetic_dataset",
                entity_id=DATASET_VERSION,
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "seed": SIMULATION_SEED,
                    "simulation_epoch": SIMULATION_EPOCH.isoformat(),
                    "fingerprint": fingerprint,
                    "counts": counts,
                },
            )
        return DatasetSnapshot(
            counts=counts,
            fingerprint=fingerprint,
            elapsed_seconds=perf_counter() - started,
        )


def _clear_demo_domain(session: Session) -> None:
    for model in (
        AnalystAction,
        ScenarioRun,
        RiskContribution,
        Incident,
        CyberEvent,
        Transaction,
        BankingSession,
        BehaviourBaseline,
        Beneficiary,
        Device,
        Account,
        Customer,
        TransactionChannel,
        CryptoAsset,
    ):
        session.execute(delete(model))
    session.flush()


def _populate_background_dataset(session: Session) -> None:
    assets, channels = _seed_crypto_and_channels(session)
    _ = assets
    customers, accounts, devices, beneficiaries = _seed_identity_context(session)
    session.flush()
    transactions, events = _seed_activity(
        session,
        customers=customers,
        accounts=accounts,
        devices=devices,
        beneficiaries=beneficiaries,
        channels=channels,
    )
    session.flush()
    baselines = generate_behavioural_baselines(
        session,
        window_start=WINDOW_START,
        window_end=SIMULATION_EPOCH,
    )
    baseline_by_customer = {item.customer_id: item for item in baselines}
    _seed_background_incidents(
        session,
        transactions=transactions,
        events=events,
        baselines=baseline_by_customer,
    )
    _seed_scenario_state(session)


def _seed_crypto_and_channels(
    session: Session,
) -> tuple[tuple[CryptoAsset, ...], tuple[TransactionChannel, ...]]:
    assets = (
        CryptoAsset(
            crypto_asset_id=deterministic_uuid("crypto-asset", "legacy-rsa-gateway"),
            name="Synthetic Legacy RSA Gateway",
            algorithm_family=AlgorithmFamily.RSA,
            data_sensitivity=DataSensitivity.CRITICAL,
            confidentiality_years=12,
            pqc_ready=False,
            migration_status=MigrationStatus.PLANNED,
            priority_score=88,
            priority_level=QuantumPriority.URGENT,
            assessment_reason=(
                "Long-lived synthetic transaction metadata uses a legacy public-key channel."
            ),
            assessed_at=SIMULATION_EPOCH,
        ),
        CryptoAsset(
            crypto_asset_id=deterministic_uuid("crypto-asset", "hybrid-mobile-gateway"),
            name="Synthetic Hybrid Mobile Gateway",
            algorithm_family=AlgorithmFamily.HYBRID,
            data_sensitivity=DataSensitivity.HIGH,
            confidentiality_years=7,
            pqc_ready=True,
            migration_status=MigrationStatus.PQC_READY,
            priority_score=22,
            priority_level=QuantumPriority.LOW,
            assessment_reason="The synthetic mobile channel is marked hybrid and migration-ready.",
            assessed_at=SIMULATION_EPOCH,
        ),
    )
    channels = (
        TransactionChannel(
            channel_id=deterministic_uuid("transaction-channel", "web-banking"),
            channel_code=TransactionChannelCode.WEB_BANKING,
            display_name="Web Banking",
            crypto_asset_id=assets[0].crypto_asset_id,
            active=True,
        ),
        TransactionChannel(
            channel_id=deterministic_uuid("transaction-channel", "mobile-banking"),
            channel_code=TransactionChannelCode.MOBILE_BANKING,
            display_name="Mobile Banking",
            crypto_asset_id=assets[1].crypto_asset_id,
            active=True,
        ),
    )
    session.add_all([*assets, *channels])
    return assets, channels


def _seed_identity_context(
    session: Session,
) -> tuple[
    tuple[Customer, ...],
    tuple[Account, ...],
    dict[UUID, tuple[Device, ...]],
    dict[UUID, tuple[Beneficiary, ...]],
]:
    cities = (
        "Pune",
        "Jaipur",
        "Bengaluru",
        "Mumbai",
        "Delhi",
        "Chennai",
        "Hyderabad",
        "Kolkata",
        "Ahmedabad",
        "Lucknow",
        "Kochi",
        "Indore",
    )
    customers: list[Customer] = []
    accounts: list[Account] = []
    devices: dict[UUID, tuple[Device, ...]] = {}
    beneficiaries: dict[UUID, tuple[Beneficiary, ...]] = {}
    for index, city in enumerate(cities, start=1):
        key = f"customer-{index:02d}"
        customer = Customer(
            customer_id=deterministic_uuid("customer", key),
            display_name=f"Synthetic Customer {index:02d}",
            home_city=city,
            home_country="IN",
            risk_segment=RiskSegment.HEIGHTENED if index in {3, 9} else RiskSegment.STANDARD,
            created_at=WINDOW_START - timedelta(days=730 + index),
        )
        account = Account(
            account_id=deterministic_uuid("account", key),
            customer_id=customer.customer_id,
            account_type=AccountType.CURRENT if index % 4 == 0 else AccountType.SAVINGS,
            currency="INR",
            status=AccountStatus.ACTIVE,
            typical_transaction_min_minor=40_000,
            typical_transaction_max_minor=110_000,
            average_daily_transaction_count=Decimal("1.07"),
            created_at=customer.created_at + timedelta(days=7),
        )
        device_count = 2 if index <= 4 else 1
        customer_devices = tuple(
            Device(
                device_id=deterministic_uuid("device", f"{key}-{position}"),
                customer_id=customer.customer_id,
                fingerprint=f"rw-{key}-fingerprint-{position}",
                device_type=DeviceType.MOBILE if position % 2 else DeviceType.DESKTOP,
                operating_system="SyntheticOS 1.0",
                trusted=True,
                posture=DevicePosture.TRUSTED,
                first_seen_at=WINDOW_START - timedelta(days=180 - position),
                last_seen_at=SIMULATION_EPOCH - timedelta(minutes=index + position),
            )
            for position in range(1, device_count + 1)
        )
        customer_beneficiaries = tuple(
            Beneficiary(
                beneficiary_id=deterministic_uuid("beneficiary", f"{key}-beneficiary-{position}"),
                customer_id=customer.customer_id,
                display_name=f"Synthetic Beneficiary {index:02d}-{position}",
                bank_code=f"SYN{index:02d}{position}",
                created_at=WINDOW_START - timedelta(days=30 * (position + 1)),
                risk_level=RiskLevel.LOW,
            )
            for position in range(1, 4)
        )
        customers.append(customer)
        accounts.append(account)
        devices[customer.customer_id] = customer_devices
        beneficiaries[customer.customer_id] = customer_beneficiaries
        session.add_all([customer, account, *customer_devices, *customer_beneficiaries])
    return tuple(customers), tuple(accounts), devices, beneficiaries


def _seed_activity(
    session: Session,
    *,
    customers: tuple[Customer, ...],
    accounts: tuple[Account, ...],
    devices: dict[UUID, tuple[Device, ...]],
    beneficiaries: dict[UUID, tuple[Beneficiary, ...]],
    channels: tuple[TransactionChannel, ...],
) -> tuple[tuple[Transaction, ...], tuple[CyberEvent, ...]]:
    banking_sessions: list[BankingSession] = []
    transactions: list[Transaction] = []
    events: list[CyberEvent] = []
    global_index = 0
    for customer_index, (customer, account) in enumerate(zip(customers, accounts, strict=True)):
        for local_index in range(15):
            day_offset = local_index % 14
            hour = 9 + ((customer_index + local_index) % 8)
            minute = (customer_index * 7 + local_index * 11) % 50
            transaction_time = WINDOW_START + timedelta(
                days=day_offset,
                hours=hour,
                minutes=minute,
            )
            device = devices[customer.customer_id][local_index % len(devices[customer.customer_id])]
            stable_key = f"background-{global_index:03d}"
            banking_session = BankingSession(
                session_id=deterministic_uuid("session", stable_key),
                customer_id=customer.customer_id,
                account_id=account.account_id,
                device_id=device.device_id,
                ip_address=f"192.0.2.{(global_index % 250) + 1}",
                city=customer.home_city,
                country="IN",
                started_at=transaction_time - timedelta(minutes=12),
                ended_at=transaction_time + timedelta(minutes=3),
                status=SessionStatus.ENDED,
            )
            transaction = Transaction(
                transaction_id=deterministic_uuid("transaction", stable_key),
                session_id=banking_session.session_id,
                customer_id=customer.customer_id,
                account_id=account.account_id,
                beneficiary_id=beneficiaries[customer.customer_id][local_index % 3].beneficiary_id,
                channel_id=channels[local_index % 2].channel_id,
                amount_minor=50_000 + ((customer_index * 11 + local_index * 7) % 10) * 5_000,
                currency="INR",
                created_at=transaction_time,
                status=TransactionStatus.PERMITTED,
                destination_risk=RiskLevel.LOW,
            )
            login_event = CyberEvent(
                cyber_event_id=deterministic_uuid("cyber-event", f"{stable_key}-login"),
                session_id=banking_session.session_id,
                customer_id=customer.customer_id,
                account_id=account.account_id,
                device_id=device.device_id,
                event_type=CyberEventType.LOGIN_SUCCESS,
                event_time=banking_session.started_at,
                severity=EventSeverity.INFORMATIONAL,
                attributes=validate_event_attributes(
                    CyberEventType.LOGIN_SUCCESS,
                    {
                        "authentication_method": "password_mfa",
                        "browser_fingerprint": device.fingerprint,
                    },
                ),
            )
            banking_sessions.append(banking_session)
            transactions.append(transaction)
            events.append(login_event)
            if global_index < 60:
                mfa_event = CyberEvent(
                    cyber_event_id=deterministic_uuid("cyber-event", f"{stable_key}-mfa"),
                    session_id=banking_session.session_id,
                    customer_id=customer.customer_id,
                    account_id=account.account_id,
                    device_id=device.device_id,
                    event_type=CyberEventType.MFA_SUCCESS,
                    event_time=banking_session.started_at + timedelta(minutes=2),
                    severity=EventSeverity.INFORMATIONAL,
                    attributes=validate_event_attributes(
                        CyberEventType.MFA_SUCCESS, {"method": "totp"}
                    ),
                )
                events.append(mfa_event)
            global_index += 1

    # The cyber-event schema deliberately uses a composite session-identity
    # foreign key. Persist the parent session identities before inserting the
    # dependent transactions and events so PostgreSQL validates that invariant
    # deterministically, independent of ORM unit-of-work ordering.
    session.add_all(banking_sessions)
    session.flush()
    session.add_all([*transactions, *events])
    return tuple(transactions), tuple(events)


def _seed_background_incidents(
    session: Session,
    *,
    transactions: tuple[Transaction, ...],
    events: tuple[CyberEvent, ...],
    baselines: dict[UUID, BehaviourBaseline],
) -> None:
    ordered_transactions = sorted(
        transactions, key=lambda item: (item.created_at, str(item.transaction_id))
    )
    incident_transactions = tuple(ordered_transactions[index * 12] for index in range(15))
    event_by_session = {
        event.session_id: event
        for event in events
        if event.event_type == CyberEventType.LOGIN_SUCCESS
    }
    profiles = (
        (10, 10, 0, "Ordinary background context"),
        (30, 30, 0, "Minor synthetic device and payment variations"),
        (50, 45, 0, "Elevated synthetic authentication and payment deviations"),
        (75, 70, 0, "High synthetic multi-signal context"),
        (85, 80, 12, "Critical synthetic cross-domain context"),
    )
    for index, transaction in enumerate(incident_transactions):
        cyber_score, transaction_score, bonus, label = profiles[index % len(profiles)]
        fusion = fuse_scores(cyber_score, transaction_score, bonus)
        baseline = baselines[transaction.customer_id]
        source_event = event_by_session[transaction.session_id]
        incident_id = deterministic_uuid("incident", f"background-{index:02d}")
        contributions = [
            Contribution(
                category=ContributionCategory.CYBER_RULE,
                code=f"background.cyber_context.{index:02d}",
                label=label,
                points=cyber_score,
                explanation=(
                    "Curated deterministic cyber context for a background trend incident."
                ),
                source_event_id=source_event.cyber_event_id,
                source_baseline_id=baseline.baseline_id,
                occurred_at=source_event.event_time,
            ),
            Contribution(
                category=ContributionCategory.TRANSACTION_RULE,
                code=f"background.transaction_context.{index:02d}",
                label="Synthetic transaction context",
                points=transaction_score,
                explanation=(
                    "Curated deterministic transaction context for a background trend incident."
                ),
                source_transaction_id=transaction.transaction_id,
                source_baseline_id=baseline.baseline_id,
                occurred_at=transaction.created_at,
            ),
        ]
        if bonus:
            contributions.append(
                Contribution(
                    category=ContributionCategory.CORRELATION,
                    code=f"background.correlation_context.{index:02d}",
                    label="Synthetic cross-domain interaction",
                    points=bonus,
                    explanation=(
                        "Documented fixture signals interact across cyber and transaction context."
                    ),
                    source_event_id=source_event.cyber_event_id,
                    source_transaction_id=transaction.transaction_id,
                    source_baseline_id=baseline.baseline_id,
                    occurred_at=transaction.created_at,
                )
            )
        explanation = build_explanation(fusion, tuple(contributions))
        transaction.status = fusion.transaction_status
        incident = Incident(
            incident_id=incident_id,
            customer_id=transaction.customer_id,
            account_id=transaction.account_id,
            session_id=transaction.session_id,
            transaction_id=transaction.transaction_id,
            scenario_key=None,
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
            created_at=transaction.created_at,
            updated_at=transaction.created_at,
        )
        session.add(incident)
        for order, contribution in enumerate(contributions):
            session.add(
                RiskContribution(
                    contribution_id=deterministic_uuid(
                        "risk-contribution", f"background-{index:02d}/{contribution.code}"
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


def _seed_scenario_state(session: Session) -> None:
    for index, scenario_key in enumerate(ScenarioKey):
        session.add(
            ScenarioRun(
                scenario_run_id=deterministic_uuid("scenario-run", scenario_key.value),
                scenario_key=scenario_key,
                status=ScenarioRunStatus.NOT_RUN,
                seed=SIMULATION_SEED,
                simulation_epoch=SIMULATION_EPOCH,
                run_fingerprint=_scenario_fingerprint(scenario_key),
                result_incident_id=None,
                started_at=SIMULATION_EPOCH + timedelta(minutes=index),
                completed_at=None,
            )
        )


def _scenario_fingerprint(scenario_key: ScenarioKey) -> str:
    payload = (
        f"{DATASET_VERSION}:{SIMULATION_SEED}:{SIMULATION_EPOCH.isoformat()}:{scenario_key.value}"
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def baseline_counts(session: Session) -> dict[str, int]:
    mappings = {
        "customers": Customer,
        "accounts": Account,
        "devices": Device,
        "transactions": Transaction,
        "cyber_events": CyberEvent,
        "incidents": Incident,
        "scenario_runs": ScenarioRun,
    }
    return {
        name: int(session.scalar(select(func.count()).select_from(model)) or 0)
        for name, model in mappings.items()
    }


_FINGERPRINT_MODELS = (
    CryptoAsset,
    TransactionChannel,
    Customer,
    Account,
    Device,
    Beneficiary,
    BankingSession,
    CyberEvent,
    Transaction,
    BehaviourBaseline,
    Incident,
    RiskContribution,
    AnalystAction,
    ScenarioRun,
)


def dataset_fingerprint(session: Session) -> str:
    """Fingerprint all reset-owned state while excluding users and append-only audits."""

    payload: dict[str, list[dict[str, object]]] = {}
    for model in _FINGERPRINT_MODELS:
        primary_key = model.__mapper__.primary_key[0]
        rows = session.scalars(select(model).order_by(primary_key)).all()
        payload[model.__tablename__] = [
            {
                column.name: _normalize(getattr(row, column.name))
                for column in model.__table__.columns
            }
            for row in rows
        ]
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode()).hexdigest()


def _normalize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _normalize(item) for key, item in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [_normalize(item) for item in value]
    return str(value) if value.__class__.__module__ == "ipaddress" else value
