from fastapi.testclient import TestClient


def test_health_is_database_independent(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "RiskWeave API",
        "version": "0.1.0",
    }
