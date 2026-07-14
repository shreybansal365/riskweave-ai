from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.models.enums import (
    AccountStatus,
    AccountType,
    DevicePosture,
    DeviceType,
    IncidentStatus,
    RiskLevel,
    RiskSegment,
    SessionStatus,
    TransactionStatus,
)
from app.schemas.common import ApiModel


class BehaviourBaselineResponse(ApiModel):
    baseline_id: UUID
    sample_started_at: datetime
    sample_ended_at: datetime
    typical_login_start_hour: int = Field(ge=0, le=23)
    typical_login_end_hour: int = Field(ge=0, le=23)
    usual_cities: list[str]
    known_channels: list[str]
    normal_transaction_median_minor: int = Field(ge=0)
    transaction_amount_mad_minor: int = Field(ge=0)
    average_daily_transaction_count: Decimal = Field(ge=0)
    typical_beneficiary_age_days: Decimal = Field(ge=0)
    typical_transaction_velocity_30m: Decimal = Field(ge=0)
    usual_destination_risks: list[str]
    model_version: str


class DeviceContextResponse(ApiModel):
    device_id: UUID
    device_reference: str
    device_type: DeviceType
    operating_system: str
    trusted: bool
    posture: DevicePosture
    first_seen_at: datetime
    last_seen_at: datetime


class SessionContextResponse(ApiModel):
    session_id: UUID
    device_id: UUID
    account_id: UUID
    masked_ip_address: str
    city: str
    country: str
    started_at: datetime
    ended_at: datetime | None
    status: SessionStatus


class BeneficiaryContextResponse(ApiModel):
    beneficiary_id: UUID
    beneficiary_reference: str
    display_name: str
    bank_code_masked: str
    created_at: datetime
    risk_level: RiskLevel


class TransactionContextResponse(ApiModel):
    transaction_id: UUID
    account_id: UUID
    session_id: UUID
    beneficiary_id: UUID
    channel_code: str
    amount_minor: int = Field(ge=0)
    currency: str
    created_at: datetime
    status: TransactionStatus
    destination_risk: RiskLevel


class LinkedIncidentResponse(ApiModel):
    incident_id: UUID
    severity: str
    status: IncidentStatus
    fused_score: int = Field(ge=0, le=100)
    scenario_key: str | None
    created_at: datetime


class AccountCompactResponse(ApiModel):
    account_id: UUID
    account_reference: str
    account_type: AccountType
    currency: str
    status: AccountStatus
    typical_transaction_min_minor: int = Field(ge=0)
    typical_transaction_max_minor: int = Field(ge=0)
    average_daily_transaction_count: Decimal = Field(ge=0)


class CustomerContextResponse(ApiModel):
    customer_id: UUID
    customer_reference: str
    display_name: str
    home_city: str
    home_country: str
    risk_segment: RiskSegment
    created_at: datetime
    behavioural_baseline: BehaviourBaselineResponse
    accounts: list[AccountCompactResponse]
    trusted_devices: list[DeviceContextResponse]
    familiar_locations: list[str]
    recent_sessions: list[SessionContextResponse]
    recent_beneficiaries: list[BeneficiaryContextResponse]
    recent_transactions: list[TransactionContextResponse]
    linked_incidents: list[LinkedIncidentResponse]


class AccountContextResponse(AccountCompactResponse):
    customer_id: UUID
    customer_reference: str
    customer_display_name: str
    behavioural_baseline: BehaviourBaselineResponse
    trusted_devices: list[DeviceContextResponse]
    familiar_locations: list[str]
    recent_sessions: list[SessionContextResponse]
    recent_beneficiaries: list[BeneficiaryContextResponse]
    recent_transactions: list[TransactionContextResponse]
    linked_incidents: list[LinkedIncidentResponse]
