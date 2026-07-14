import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.readiness import ReadinessSnapshot
from app.db.session import SessionFactory, create_database_engine, create_session_factory
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
        jwt_secret="unit-test-jwt-secret-at-least-32-characters",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    probe = StaticReadinessProbe(
        ReadinessSnapshot(
            database="reachable",
            migrations="current",
            revision="0002_domain_security",
        )
    )
    with TestClient(create_app(settings=settings, readiness_probe=probe)) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def postgres_settings() -> Settings:
    if os.getenv("RUN_DATABASE_TESTS") != "1":
        pytest.skip("set RUN_DATABASE_TESTS=1 with a migrated PostgreSQL database")
    return Settings(
        _env_file=None,
        app_env="test",
        jwt_secret="postgres-integration-jwt-secret-32-characters-minimum",
        demo_admin_email="admin@riskweave.demo",
        demo_admin_password="Admin-Demo-Password-2026!",
        demo_analyst_email="analyst@riskweave.demo",
        demo_analyst_password="Analyst-Demo-Password-2026!",
        cors_origins="http://localhost:4173",
    )


@pytest.fixture(scope="session")
def postgres_engine(postgres_settings: Settings) -> Iterator[Engine]:
    engine = create_database_engine(postgres_settings)
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture(scope="session")
def postgres_session_factory(postgres_engine: Engine) -> SessionFactory:
    return create_session_factory(postgres_engine)


@pytest.fixture(scope="session")
def password_service() -> PasswordService:
    return PasswordService()


@pytest.fixture
def postgres_client(
    postgres_settings: Settings,
    postgres_engine: Engine,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> Iterator[TestClient]:
    probe = StaticReadinessProbe(
        ReadinessSnapshot(
            database="reachable",
            migrations="current",
            revision="0002_domain_security",
        )
    )
    with TestClient(
        create_app(
            settings=postgres_settings,
            readiness_probe=probe,
            database_engine=postgres_engine,
            session_factory=postgres_session_factory,
            password_service=password_service,
        )
    ) as test_client:
        yield test_client
