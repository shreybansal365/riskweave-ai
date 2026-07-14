from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.db.readiness import DatabaseCheck, MigrationCheck


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
