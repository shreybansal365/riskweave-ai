from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.readiness import ReadinessSnapshot
from app.main import create_app
from tests.conftest import StaticReadinessProbe


def test_ready_reports_current_database_revision(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "service": "RiskWeave API",
        "checks": {"database": "reachable", "migrations": "current"},
        "revision": "0002_domain_security",
    }


def test_ready_returns_503_when_database_is_unavailable(settings: Settings) -> None:
    probe = StaticReadinessProbe(ReadinessSnapshot(database="unavailable", migrations="unknown"))

    with TestClient(create_app(settings=settings, readiness_probe=probe)) as test_client:
        response = test_client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "service": "RiskWeave API",
        "checks": {"database": "unavailable", "migrations": "unknown"},
        "revision": None,
    }


def test_ready_returns_503_when_migration_is_pending(settings: Settings) -> None:
    probe = StaticReadinessProbe(
        ReadinessSnapshot(
            database="reachable",
            migrations="pending",
            revision="older_revision",
        )
    )

    with TestClient(create_app(settings=settings, readiness_probe=probe)) as test_client:
        response = test_client.get("/ready")

    assert response.status_code == 503
    assert response.json()["checks"] == {
        "database": "reachable",
        "migrations": "pending",
    }
