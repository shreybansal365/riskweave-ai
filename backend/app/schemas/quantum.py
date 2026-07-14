from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.enums import (
    AlgorithmFamily,
    DataSensitivity,
    MigrationStatus,
    QuantumPriority,
)
from app.schemas.common import ApiModel


class QuantumChannelResponse(ApiModel):
    channel_id: UUID
    channel_code: str
    display_name: str
    active: bool


class QuantumAssetResponse(ApiModel):
    crypto_asset_id: UUID
    name: str
    algorithm_family: AlgorithmFamily
    data_sensitivity: DataSensitivity
    confidentiality_years: int = Field(ge=0)
    pqc_ready: bool
    migration_status: MigrationStatus
    readiness_priority_score: int = Field(ge=0, le=100)
    readiness_priority_level: QuantumPriority
    migration_priority_reasons: list[str]
    assessed_at: datetime
    linked_channels: list[QuantumChannelResponse]
    fraud_risk_separation_notice: str


class QuantumAssetsResponse(ApiModel):
    items: list[QuantumAssetResponse]
    synthetic_data_notice: str
    active_attack_detection_disclaimer: str


class QuantumPriorityCountsResponse(ApiModel):
    low: int = Field(ge=0)
    medium: int = Field(ge=0)
    high: int = Field(ge=0)
    urgent: int = Field(ge=0)


class QuantumSummaryResponse(ApiModel):
    total_assets: int = Field(ge=0)
    linked_transaction_channels: int = Field(ge=0)
    pqc_ready_assets: int = Field(ge=0)
    migration_status_counts: dict[str, int]
    readiness_priority_counts: QuantumPriorityCountsResponse
    highest_priority_assets: list[QuantumAssetResponse]
    fraud_risk_separation_notice: str
    active_attack_detection_disclaimer: str
