from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
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


def _enum_values(enum_class: type[Any]) -> list[str]:
    return [member.value for member in enum_class]


def _enum(enum_class: type[Any], name: str) -> PGEnum:
    return PGEnum(
        enum_class,
        name=name,
        values_callable=_enum_values,
        validate_strings=True,
    )


USER_ROLE = _enum(UserRole, "user_role")
RISK_SEGMENT = _enum(RiskSegment, "risk_segment")
ACCOUNT_TYPE = _enum(AccountType, "account_type")
ACCOUNT_STATUS = _enum(AccountStatus, "account_status")
DEVICE_TYPE = _enum(DeviceType, "device_type")
DEVICE_POSTURE = _enum(DevicePosture, "device_posture")
SESSION_STATUS = _enum(SessionStatus, "session_status")
CYBER_EVENT_TYPE = _enum(CyberEventType, "cyber_event_type")
EVENT_SEVERITY = _enum(EventSeverity, "event_severity")
RISK_LEVEL = _enum(RiskLevel, "risk_level")
TRANSACTION_CHANNEL_CODE = _enum(TransactionChannelCode, "transaction_channel_code")
TRANSACTION_STATUS = _enum(TransactionStatus, "transaction_status")
INCIDENT_STATUS = _enum(IncidentStatus, "incident_status")
SEVERITY = _enum(Severity, "severity")
RECOMMENDED_ACTION = _enum(RecommendedAction, "recommended_action")
CONTRIBUTION_CATEGORY = _enum(ContributionCategory, "contribution_category")
ANALYST_ACTION_TYPE = _enum(AnalystActionType, "analyst_action_type")
SCENARIO_KEY = _enum(ScenarioKey, "scenario_key")
SCENARIO_RUN_STATUS = _enum(ScenarioRunStatus, "scenario_run_status")
ALGORITHM_FAMILY = _enum(AlgorithmFamily, "algorithm_family")
DATA_SENSITIVITY = _enum(DataSensitivity, "data_sensitivity")
MIGRATION_STATUS = _enum(MigrationStatus, "migration_status")
QUANTUM_PRIORITY = _enum(QuantumPriority, "quantum_priority")
AUDIT_EVENT_TYPE = _enum(AuditEventType, "audit_event_type")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(btrim(email))", name="email_normalized"),
        CheckConstraint("length(btrim(display_name)) > 0", name="display_name_not_blank"),
        CheckConstraint("password_hash LIKE '$argon2id$%'", name="password_hash_argon2id"),
    )

    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(USER_ROLE, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    analyst_actions: Mapped[list[AnalystAction]] = relationship(back_populates="analyst")
    audit_events: Mapped[list[AuditEvent]] = relationship(back_populates="actor")


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("length(btrim(display_name)) > 0", name="display_name_not_blank"),
        CheckConstraint("length(btrim(home_country)) = 2", name="home_country_iso2"),
    )

    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    home_city: Mapped[str] = mapped_column(String(100), nullable=False)
    home_country: Mapped[str] = mapped_column(String(2), nullable=False)
    risk_segment: Mapped[RiskSegment] = mapped_column(RISK_SEGMENT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    accounts: Mapped[list[Account]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    devices: Mapped[list[Device]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    baselines: Mapped[list[BehaviourBaseline]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    beneficiaries: Mapped[list[Beneficiary]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("account_id", "customer_id", name="uq_accounts_id_customer"),
        CheckConstraint("currency = 'INR'", name="currency_inr"),
        CheckConstraint("typical_transaction_min_minor >= 0", name="typical_min_nonnegative"),
        CheckConstraint("typical_transaction_max_minor >= 0", name="typical_max_nonnegative"),
        CheckConstraint(
            "typical_transaction_max_minor >= typical_transaction_min_minor",
            name="typical_range_ordered",
        ),
        CheckConstraint("average_daily_transaction_count >= 0", name="daily_count_nonnegative"),
    )

    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.customer_id", ondelete="CASCADE"),
        nullable=False,
    )
    account_type: Mapped[AccountType] = mapped_column(ACCOUNT_TYPE, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'INR'"))
    status: Mapped[AccountStatus] = mapped_column(ACCOUNT_STATUS, nullable=False)
    typical_transaction_min_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    typical_transaction_max_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    average_daily_transaction_count: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    customer: Mapped[Customer] = relationship(back_populates="accounts")


class BehaviourBaseline(Base):
    __tablename__ = "behavioural_baselines"
    __table_args__ = (
        CheckConstraint("sample_ended_at >= sample_started_at", name="sample_window_ordered"),
        CheckConstraint("typical_login_start_hour BETWEEN 0 AND 23", name="login_start_hour_range"),
        CheckConstraint("typical_login_end_hour BETWEEN 0 AND 23", name="login_end_hour_range"),
        CheckConstraint("median_transaction_amount_minor >= 0", name="median_amount_nonnegative"),
        CheckConstraint("transaction_amount_mad_minor >= 0", name="mad_nonnegative"),
        CheckConstraint("average_daily_transaction_count >= 0", name="daily_count_nonnegative"),
        CheckConstraint("typical_beneficiary_age_days >= 0", name="beneficiary_age_nonnegative"),
    )

    baseline_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.customer_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sample_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sample_ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    typical_login_start_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    typical_login_end_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    usual_cities: Mapped[list[str]] = mapped_column(
        ARRAY(String(100)), nullable=False, server_default=text("'{}'::varchar[]")
    )
    known_channels: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), nullable=False, server_default=text("'{}'::varchar[]")
    )
    median_transaction_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_amount_mad_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    average_daily_transaction_count: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    typical_beneficiary_age_days: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[Customer] = relationship(back_populates="baselines")


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("device_id", "customer_id", name="uq_devices_id_customer"),
        UniqueConstraint("customer_id", "fingerprint", name="uq_devices_customer_fingerprint"),
        CheckConstraint("last_seen_at >= first_seen_at", name="seen_window_ordered"),
    )

    device_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.customer_id", ondelete="CASCADE"),
        nullable=False,
    )
    fingerprint: Mapped[str] = mapped_column(String(128), nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(DEVICE_TYPE, nullable=False)
    operating_system: Mapped[str] = mapped_column(String(120), nullable=False)
    trusted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    posture: Mapped[DevicePosture] = mapped_column(DEVICE_POSTURE, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="devices")


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        UniqueConstraint("session_id", "customer_id", "account_id", name="uq_sessions_identity"),
        UniqueConstraint(
            "session_id",
            "customer_id",
            "account_id",
            "device_id",
            name="uq_sessions_device_identity",
        ),
        ForeignKeyConstraint(
            ["account_id", "customer_id"],
            ["accounts.account_id", "accounts.customer_id"],
            name="fk_sessions_account_customer",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["device_id", "customer_id"],
            ["devices.device_id", "devices.customer_id"],
            name="fk_sessions_device_customer",
            ondelete="CASCADE",
        ),
        CheckConstraint("ended_at IS NULL OR ended_at >= started_at", name="time_window_ordered"),
    )

    session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    device_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    ip_address: Mapped[str] = mapped_column(INET, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[SessionStatus] = mapped_column(SESSION_STATUS, nullable=False)

    account: Mapped[Account] = relationship(viewonly=True)
    device: Mapped[Device] = relationship(viewonly=True)


class CyberEvent(Base):
    __tablename__ = "cyber_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["session_id", "customer_id", "account_id", "device_id"],
            [
                "sessions.session_id",
                "sessions.customer_id",
                "sessions.account_id",
                "sessions.device_id",
            ],
            name="fk_cyber_events_session_identity",
            ondelete="CASCADE",
        ),
        Index("ix_cyber_events_session_event_time", "session_id", "event_time"),
    )

    cyber_event_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    device_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    event_type: Mapped[CyberEventType] = mapped_column(CYBER_EVENT_TYPE, nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    severity: Mapped[EventSeverity] = mapped_column(EVENT_SEVERITY, nullable=False)
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    session: Mapped[Session] = relationship(viewonly=True)


class Beneficiary(Base):
    __tablename__ = "beneficiaries"
    __table_args__ = (
        UniqueConstraint("beneficiary_id", "customer_id", name="uq_beneficiaries_id_customer"),
        CheckConstraint("length(btrim(display_name)) > 0", name="display_name_not_blank"),
    )

    beneficiary_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.customer_id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    bank_code: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    risk_level: Mapped[RiskLevel] = mapped_column(RISK_LEVEL, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="beneficiaries")


class CryptoAsset(Base):
    __tablename__ = "crypto_assets"
    __table_args__ = (
        CheckConstraint("confidentiality_years >= 0", name="confidentiality_years_nonnegative"),
        CheckConstraint("priority_score BETWEEN 0 AND 100", name="priority_score_range"),
        CheckConstraint("length(btrim(name)) > 0", name="name_not_blank"),
    )

    crypto_asset_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    algorithm_family: Mapped[AlgorithmFamily] = mapped_column(ALGORITHM_FAMILY, nullable=False)
    data_sensitivity: Mapped[DataSensitivity] = mapped_column(DATA_SENSITIVITY, nullable=False)
    confidentiality_years: Mapped[int] = mapped_column(Integer, nullable=False)
    pqc_ready: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    migration_status: Mapped[MigrationStatus] = mapped_column(MIGRATION_STATUS, nullable=False)
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False)
    priority_level: Mapped[QuantumPriority] = mapped_column(QUANTUM_PRIORITY, nullable=False)
    assessment_reason: Mapped[str] = mapped_column(Text, nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    channels: Mapped[list[TransactionChannel]] = relationship(back_populates="crypto_asset")


class TransactionChannel(Base):
    __tablename__ = "transaction_channels"
    __table_args__ = (CheckConstraint("length(btrim(display_name)) > 0", name="name_not_blank"),)

    channel_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    channel_code: Mapped[TransactionChannelCode] = mapped_column(
        TRANSACTION_CHANNEL_CODE, nullable=False, unique=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    crypto_asset_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("crypto_assets.crypto_asset_id", ondelete="RESTRICT"),
        nullable=False,
    )
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    crypto_asset: Mapped[CryptoAsset] = relationship(back_populates="channels")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "transaction_id",
            "customer_id",
            "account_id",
            "session_id",
            name="uq_transactions_identity",
        ),
        ForeignKeyConstraint(
            ["session_id", "customer_id", "account_id"],
            ["sessions.session_id", "sessions.customer_id", "sessions.account_id"],
            name="fk_transactions_session_identity",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["beneficiary_id", "customer_id"],
            ["beneficiaries.beneficiary_id", "beneficiaries.customer_id"],
            name="fk_transactions_beneficiary_customer",
            ondelete="RESTRICT",
        ),
        CheckConstraint("amount_minor >= 0", name="amount_nonnegative"),
        CheckConstraint("currency = 'INR'", name="currency_inr"),
        Index("ix_transactions_account_created_at", "account_id", "created_at"),
    )

    transaction_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    beneficiary_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    channel_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("transaction_channels.channel_id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'INR'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(TRANSACTION_STATUS, nullable=False)
    destination_risk: Mapped[RiskLevel] = mapped_column(RISK_LEVEL, nullable=False)

    session: Mapped[Session] = relationship(viewonly=True)
    beneficiary: Mapped[Beneficiary] = relationship(viewonly=True)
    channel: Mapped[TransactionChannel] = relationship()


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        ForeignKeyConstraint(
            ["transaction_id", "customer_id", "account_id", "session_id"],
            [
                "transactions.transaction_id",
                "transactions.customer_id",
                "transactions.account_id",
                "transactions.session_id",
            ],
            name="fk_incidents_transaction_identity",
            ondelete="CASCADE",
        ),
        CheckConstraint("cyber_score BETWEEN 0 AND 100", name="cyber_score_range"),
        CheckConstraint("transaction_score BETWEEN 0 AND 100", name="transaction_score_range"),
        CheckConstraint("correlation_bonus BETWEEN 0 AND 18", name="correlation_bonus_range"),
        CheckConstraint("fused_score BETWEEN 0 AND 100", name="fused_score_range"),
        CheckConstraint("updated_at >= created_at", name="update_time_ordered"),
        Index("ix_incidents_severity_created_at", "severity", "created_at"),
        Index("ix_incidents_status_created_at", "status", "created_at"),
        Index("ix_incidents_customer_created_at", "customer_id", "created_at"),
        Index("ix_incidents_transaction", "transaction_id"),
        Index(
            "uq_incidents_scenario_key",
            "scenario_key",
            unique=True,
            postgresql_where=text("scenario_key IS NOT NULL"),
        ),
    )

    incident_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    account_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    session_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    transaction_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    scenario_key: Mapped[ScenarioKey | None] = mapped_column(SCENARIO_KEY)
    cyber_score: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_score: Mapped[int] = mapped_column(Integer, nullable=False)
    correlation_bonus: Mapped[int] = mapped_column(Integer, nullable=False)
    fused_score: Mapped[int] = mapped_column(Integer, nullable=False)
    severity: Mapped[Severity] = mapped_column(SEVERITY, nullable=False)
    recommended_action: Mapped[RecommendedAction] = mapped_column(
        RECOMMENDED_ACTION, nullable=False
    )
    status: Mapped[IncidentStatus] = mapped_column(INCIDENT_STATUS, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    transaction: Mapped[Transaction] = relationship(viewonly=True)
    contributions: Mapped[list[RiskContribution]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )
    analyst_actions: Mapped[list[AnalystAction]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )


class RiskContribution(Base):
    __tablename__ = "risk_contributions"
    __table_args__ = (
        CheckConstraint("points BETWEEN 0 AND 100", name="points_range"),
        CheckConstraint(
            "category NOT IN ('cyber_anomaly', 'transaction_anomaly') OR points <= 10",
            name="anomaly_points_cap",
        ),
        CheckConstraint("category <> 'correlation' OR points <= 18", name="correlation_points_cap"),
        CheckConstraint("display_order >= 0", name="display_order_nonnegative"),
        UniqueConstraint("incident_id", "code", name="uq_contributions_incident_code"),
    )

    contribution_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    incident_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("incidents.incident_id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[ContributionCategory] = mapped_column(CONTRIBUTION_CATEGORY, nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    source_event_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("cyber_events.cyber_event_id", ondelete="SET NULL")
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    incident: Mapped[Incident] = relationship(back_populates="contributions")


class AnalystAction(Base):
    __tablename__ = "analyst_actions"
    __table_args__ = (
        CheckConstraint("note IS NULL OR length(note) <= 2000", name="note_length"),
        CheckConstraint(
            "previous_incident_status IS DISTINCT FROM new_incident_status "
            "OR previous_transaction_status IS DISTINCT FROM new_transaction_status "
            "OR action_type = 'add_note'",
            name="meaningful_action",
        ),
        Index("ix_analyst_actions_incident_created_at", "incident_id", "created_at"),
    )

    analyst_action_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    incident_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("incidents.incident_id", ondelete="CASCADE"),
        nullable=False,
    )
    analyst_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False
    )
    action_type: Mapped[AnalystActionType] = mapped_column(ANALYST_ACTION_TYPE, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    previous_incident_status: Mapped[IncidentStatus] = mapped_column(
        INCIDENT_STATUS, nullable=False
    )
    new_incident_status: Mapped[IncidentStatus] = mapped_column(INCIDENT_STATUS, nullable=False)
    previous_transaction_status: Mapped[TransactionStatus] = mapped_column(
        TRANSACTION_STATUS, nullable=False
    )
    new_transaction_status: Mapped[TransactionStatus] = mapped_column(
        TRANSACTION_STATUS, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    incident: Mapped[Incident] = relationship(back_populates="analyst_actions")
    analyst: Mapped[User] = relationship(back_populates="analyst_actions")


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"
    __table_args__ = (
        CheckConstraint("seed >= 0", name="seed_nonnegative"),
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= started_at", name="time_window_ordered"
        ),
    )

    scenario_run_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    scenario_key: Mapped[ScenarioKey] = mapped_column(SCENARIO_KEY, nullable=False, unique=True)
    status: Mapped[ScenarioRunStatus] = mapped_column(SCENARIO_RUN_STATUS, nullable=False)
    seed: Mapped[int] = mapped_column(Integer, nullable=False)
    simulation_epoch: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    run_fingerprint: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    result_incident_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("incidents.incident_id", ondelete="SET NULL")
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint("length(btrim(entity_type)) > 0", name="entity_type_not_blank"),
        CheckConstraint("length(btrim(entity_id)) > 0", name="entity_id_not_blank"),
        CheckConstraint("length(btrim(request_id)) > 0", name="request_id_not_blank"),
        Index("ix_audit_events_entity_created_at", "entity_type", "entity_id", "created_at"),
        Index("ix_audit_events_request_id", "request_id"),
    )

    audit_event_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT")
    )
    event_type: Mapped[AuditEventType] = mapped_column(AUDIT_EVENT_TYPE, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(320), nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    actor: Mapped[User | None] = relationship(back_populates="audit_events")
