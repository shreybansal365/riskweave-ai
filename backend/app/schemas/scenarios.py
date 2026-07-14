from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.models.enums import (
    RecommendedAction,
    ScenarioKey,
    ScenarioRunStatus,
    Severity,
    TransactionStatus,
)
from app.schemas.common import ApiModel


class ScenarioDefinitionResponse(ApiModel):
    scenario_key: ScenarioKey
    title: str
    purpose: str
    status: ScenarioRunStatus
    simulation_epoch: datetime
    started_at: datetime
    completed_at: datetime | None
    result_incident_id: UUID | None


class ScenarioCatalogResponse(ApiModel):
    items: list[ScenarioDefinitionResponse]
    synthetic_data_notice: str


class ScenarioExecutionResponse(ApiModel):
    scenario_key: ScenarioKey
    incident_id: UUID
    cyber_score: int = Field(ge=0, le=100)
    transaction_score: int = Field(ge=0, le=100)
    correlation_bonus: int = Field(ge=0, le=18)
    raw_fused_score: Decimal = Field(ge=0, le=100)
    fused_score: int = Field(ge=0, le=100)
    severity: Severity
    recommended_action: RecommendedAction
    transaction_status: TransactionStatus
    idempotent: bool


class ScenarioResetResponse(ApiModel):
    dataset_version: str
    counts: dict[str, int]
    fingerprint: str
    elapsed_seconds: float = Field(ge=0)
    exact_baseline_restored: bool
