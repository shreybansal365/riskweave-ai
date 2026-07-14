from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

EXPECTED_ALEMBIC_REVISION = "0003_intelligence_support"

DatabaseCheck = Literal["reachable", "unavailable"]
MigrationCheck = Literal["current", "pending", "unknown"]


@dataclass(frozen=True, slots=True)
class ReadinessSnapshot:
    """Database and migration state returned by a readiness probe."""

    database: DatabaseCheck
    migrations: MigrationCheck
    revision: str | None = None

    @property
    def is_ready(self) -> bool:
        return self.database == "reachable" and self.migrations == "current"


class ReadinessProbe(Protocol):
    """Structural interface used by the HTTP layer and tests."""

    def check(self) -> ReadinessSnapshot:
        """Return a safe readiness snapshot."""


class PostgresReadinessProbe:
    """Verify PostgreSQL connectivity and the expected Alembic revision."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def check(self) -> ReadinessSnapshot:
        try:
            with self._engine.connect() as connection:
                connection.execute(text("SELECT 1")).scalar_one()
                revision = connection.execute(
                    text("SELECT version_num FROM alembic_version")
                ).scalar_one_or_none()
        except SQLAlchemyError:
            return ReadinessSnapshot(database="unavailable", migrations="unknown")

        migration_state: MigrationCheck = (
            "current" if revision == EXPECTED_ALEMBIC_REVISION else "pending"
        )
        return ReadinessSnapshot(
            database="reachable",
            migrations=migration_state,
            revision=revision,
        )
