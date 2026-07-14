from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.models.enums import (
    AnalystActionType,
    ContributionCategory,
    IncidentStatus,
    RecommendedAction,
    ScenarioKey,
    Severity,
    TransactionStatus,
)
from app.schemas.common import ApiModel, PaginationMeta


class IncidentScoreResponse(ApiModel):
    cyber_score: int = Field(ge=0, le=100)
    transaction_score: int = Field(ge=0, le=100)
    correlation_bonus: int = Field(ge=0, le=18)
    raw_fused_score: Decimal = Field(ge=0, le=100)
    fused_score: int = Field(ge=0, le=100)


class WeightedScoreTermResponse(ApiModel):
    """One server-authored term in the weighted fusion projection."""

    score: int = Field(ge=0, le=100)
    weight: Decimal = Field(ge=0, le=1)
    weighted_term: Decimal = Field(ge=0, le=100)


class FusionProjectionResponse(ApiModel):
    """Read-only explanation of persisted fusion inputs and output."""

    cyber: WeightedScoreTermResponse
    transaction: WeightedScoreTermResponse
    correlation_bonus: int = Field(ge=0, le=18)
    raw_fused_score: Decimal = Field(ge=0, le=100)
    rounded_fused_score: int = Field(ge=0, le=100)
    rounding_mode: Literal["ROUND_HALF_UP"] = "ROUND_HALF_UP"


class IncidentListItemResponse(IncidentScoreResponse):
    incident_id: UUID
    incident_reference: str
    customer_id: UUID
    customer_reference: str
    customer_display_name: str
    account_id: UUID
    account_reference: str
    transaction_id: UUID
    scenario_key: ScenarioKey | None
    severity: Severity
    status: IncidentStatus
    recommended_action: RecommendedAction
    transaction_status: TransactionStatus
    amount_minor: int = Field(ge=0)
    currency: Literal["INR"]
    summary: str
    created_at: datetime
    updated_at: datetime


class IncidentListResponse(ApiModel):
    items: list[IncidentListItemResponse]
    pagination: PaginationMeta


class ContributionResponse(ApiModel):
    contribution_id: UUID
    category: ContributionCategory
    code: str
    label: str
    points: int = Field(ge=0, le=100)
    explanation: str
    source_event_id: UUID | None
    source_transaction_id: UUID | None
    source_baseline_id: UUID | None
    display_order: int = Field(ge=0)


class TimelineItemResponse(ApiModel):
    occurred_at: datetime
    item_type: Literal[
        "cyber_event",
        "beneficiary",
        "transaction",
        "incident",
        "analyst_action",
    ]
    code: str
    label: str
    description: str
    source_id: UUID


class AnalystActionResponse(ApiModel):
    analyst_action_id: UUID
    analyst_id: UUID
    analyst_display_name: str
    action_type: AnalystActionType
    note: str | None
    previous_incident_status: IncidentStatus
    new_incident_status: IncidentStatus
    previous_transaction_status: TransactionStatus
    new_transaction_status: TransactionStatus
    created_at: datetime


class CustomerSummaryResponse(ApiModel):
    customer_id: UUID
    customer_reference: str
    display_name: str
    home_city: str
    home_country: str
    risk_segment: str


class AccountSummaryResponse(ApiModel):
    account_id: UUID
    account_reference: str
    account_type: str
    status: str
    currency: Literal["INR"]


class SessionSummaryResponse(ApiModel):
    session_id: UUID
    device_id: UUID
    masked_ip_address: str
    city: str
    country: str
    started_at: datetime
    ended_at: datetime | None
    status: str


class CryptoReadinessSummaryResponse(ApiModel):
    channel_id: UUID
    channel_code: str
    channel_display_name: str
    crypto_asset_id: UUID
    asset_name: str
    priority_score: int = Field(ge=0, le=100)
    priority_level: str
    pqc_ready: bool
    migration_status: str
    reasons: list[str]
    fraud_risk_separation_notice: str


class TransactionSummaryResponse(ApiModel):
    transaction_id: UUID
    beneficiary_id: UUID
    beneficiary_display_name: str
    channel_id: UUID
    amount_minor: int = Field(ge=0)
    currency: Literal["INR"]
    created_at: datetime
    status: TransactionStatus
    destination_risk: str


class IncidentDetailResponse(IncidentScoreResponse):
    incident_id: UUID
    incident_reference: str
    scenario_key: ScenarioKey | None
    severity: Severity
    status: IncidentStatus
    recommended_action: RecommendedAction
    summary: str
    signal_narrative: list[dict[str, object]]
    decision_explanation: str
    action_explanation: str
    engine_version: str
    model_version: str
    created_at: datetime
    updated_at: datetime
    fusion_projection: FusionProjectionResponse
    customer: CustomerSummaryResponse
    account: AccountSummaryResponse
    session: SessionSummaryResponse
    transaction: TransactionSummaryResponse
    crypto_readiness: CryptoReadinessSummaryResponse
    timeline: list[TimelineItemResponse]
    cyber_contributions: list[ContributionResponse]
    transaction_contributions: list[ContributionResponse]
    interaction_contributions: list[ContributionResponse]
    analyst_actions: list[AnalystActionResponse]
    available_actions: list[AnalystActionType]


class IncidentPatchRequest(ApiModel):
    status: IncidentStatus
    note: str | None = Field(default=None, max_length=2000)
    expected_updated_at: datetime | None = None

    @field_validator("status")
    @classmethod
    def reject_open_target(cls, value: IncidentStatus) -> IncidentStatus:
        if value == IncidentStatus.OPEN:
            raise ValueError("an incident cannot be transitioned back to open")
        return value

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("expected_updated_at")
    @classmethod
    def require_aware_timestamp(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("expected_updated_at must be timezone-aware")
        return value.astimezone(UTC) if value is not None else None


class AnalystActionRequest(ApiModel):
    action_type: AnalystActionType
    note: str | None = Field(default=None, max_length=2000)
    expected_updated_at: datetime | None = None

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("expected_updated_at")
    @classmethod
    def require_aware_timestamp(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("expected_updated_at must be timezone-aware")
        return value.astimezone(UTC) if value is not None else None

    @model_validator(mode="after")
    def require_note_for_note_action(self) -> AnalystActionRequest:
        if self.action_type == AnalystActionType.ADD_NOTE and self.note is None:
            raise ValueError("add_note requires a non-empty note")
        return self


class IncidentMutationResponse(ApiModel):
    incident_id: UUID
    status: IncidentStatus
    transaction_status: TransactionStatus
    updated_at: datetime
    recorded_action: AnalystActionResponse
    idempotent_replay: bool
