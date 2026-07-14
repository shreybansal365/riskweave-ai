from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.readiness import ReadinessSnapshot
from app.main import create_app


class StaticReadinessProbe:
    """Deterministic readiness probe for API tests."""

    def __init__(self, snapshot: ReadinessSnapshot) -> None:
        self._snapshot = snapshot

    def check(self) -> ReadinessSnapshot:
        return self._snapshot


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        database_url="postgresql+psycopg://test:test@localhost:5432/riskweave_test",
        cors_origins="http://localhost:4173",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    probe = StaticReadinessProbe(
        ReadinessSnapshot(
            database="reachable",
            migrations="current",
            revision="0001_foundation",
        )
    )
    with TestClient(create_app(settings=settings, readiness_probe=probe)) as test_client:
        yield test_client
