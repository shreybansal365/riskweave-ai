from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.readiness import DatabaseCheck, MigrationCheck
from app.models.enums import AuditEventType, ScenarioKey, ScenarioRunStatus
from app.schemas.common import ApiModel

DatasetState = Literal[
    "baseline_restored",
    "showcase_active",
    "modified",
    "uninitialized",
]


class HealthResponse(BaseModel):
    """Application liveness response."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"
    service: str
    version: str


class ReadinessChecks(BaseModel):
    """Individual service checks used by the readiness endpoint."""

    model_config = ConfigDict(extra="forbid")

    database: DatabaseCheck
    migrations: MigrationCheck


class ReadinessResponse(BaseModel):
    """Database-backed readiness response."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["ready", "not_ready"]
    service: str
    checks: ReadinessChecks
    revision: str | None = None


class RuntimeContextResponse(ApiModel):
    configured_environment: Literal["development", "test", "production"]
    deployment_mode: Literal["local_demo", "test", "deployed_demo"]
    environment_label: str
    api_origin: str
    api_origin_scope: Literal["loopback", "network"]


class SystemContextResponse(ApiModel):
    environment_label: str
    deployment_mode: Literal["local_demo", "test", "deployed_demo"]
    dataset_version: str
    simulation_epoch: datetime
    dataset_state: DatasetState
    dataset_state_label: str


class DatasetIntegrityResponse(ApiModel):
    version: str
    simulation_epoch: datetime
    generator_seed: int = Field(ge=0)
    model_seed: int = Field(ge=0)
    expected_baseline_counts: dict[str, int]
    current_counts: dict[str, int]
    current_fingerprint: str
    latest_reset_fingerprint: str | None
    exact_baseline_restored: bool


class ScenarioIntegrityResponse(ApiModel):
    scenario_key: ScenarioKey
    status: ScenarioRunStatus
    seed: int = Field(ge=0)
    simulation_epoch: datetime
    result_incident_id: UUID | None
    started_at: datetime
    completed_at: datetime | None


class BenchmarkIntegrityResponse(ApiModel):
    fixture_version: str
    benchmark_name: str
    case_count: int = Field(ge=0)


class AuditReferenceResponse(ApiModel):
    audit_event_id: UUID
    event_type: AuditEventType
    created_at: datetime


class AuditIntegrityResponse(ApiModel):
    latest_reset: AuditReferenceResponse | None
    latest_event: AuditReferenceResponse | None


class ReadinessReferenceResponse(ApiModel):
    database: DatabaseCheck
    migrations: MigrationCheck
    revision: str | None


class SystemIntegrityResponse(ApiModel):
    service: str
    version: str
    runtime: RuntimeContextResponse
    readiness: ReadinessReferenceResponse
    dataset: DatasetIntegrityResponse
    scenarios: list[ScenarioIntegrityResponse]
    benchmark: BenchmarkIntegrityResponse
    audit: AuditIntegrityResponse
