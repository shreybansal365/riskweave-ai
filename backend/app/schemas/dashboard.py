from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import Field

from app.schemas.common import ApiModel


class SeverityCountsResponse(ApiModel):
    low: int = Field(ge=0)
    guarded: int = Field(ge=0)
    elevated: int = Field(ge=0)
    high: int = Field(ge=0)
    critical: int = Field(ge=0)


class SourceHealthResponse(ApiModel):
    source: str
    status: str
    record_count: int = Field(ge=0)
    detail: str


class DashboardSummaryResponse(ApiModel):
    visible_incidents: int = Field(ge=0)
    incidents_by_severity: SeverityCountsResponse
    open_incidents: int = Field(ge=0)
    in_review_incidents: int = Field(ge=0)
    transactions_held: int = Field(ge=0)
    legitimate_unusual_activity_permitted: int = Field(ge=0)
    confirmed_fraud_cases: int = Field(ge=0)
    source_systems: list[SourceHealthResponse]
    synthetic_data_notice: str


class TransactionActionCountsResponse(ApiModel):
    permitted: int = Field(ge=0)
    held: int = Field(ge=0)
    released: int = Field(ge=0)
    declined: int = Field(ge=0)
    pending: int = Field(ge=0)
    cancelled: int = Field(ge=0)


class DashboardTrendPointResponse(ApiModel):
    day: date
    incident_volume: int = Field(ge=0)
    severity_distribution: SeverityCountsResponse
    average_cyber_score: Decimal | None
    average_transaction_score: Decimal | None
    average_fused_score: Decimal | None
    transaction_actions: TransactionActionCountsResponse


class DashboardTrendsResponse(ApiModel):
    window_start: date
    window_end: date
    points: list[DashboardTrendPointResponse]
    synthetic_data_notice: str
