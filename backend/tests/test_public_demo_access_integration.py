from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.main import create_app
from app.services.demo_data import DemoDataService
from app.services.seeding import seed_demo_users


def _prepare(
    session_factory: SessionFactory,
    settings: Settings,
    password_service: PasswordService,
) -> None:
    DemoDataService(session_factory).reset(request_id=f"public-demo-reset-{uuid4()}")
    with session_factory.begin() as session:
        seed_demo_users(session, settings=settings, password_service=password_service)


def test_public_demo_access_is_disabled_by_default(client: TestClient) -> None:
    response = client.post("/api/auth/demo-access")

    assert response.status_code == 404
    assert response.json() == {"detail": "Public demo access is unavailable"}


@pytest.mark.integration
def test_public_demo_token_is_read_only_across_every_write_and_admin_route(
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    enabled_settings = postgres_settings.model_copy(update={"public_demo_access_enabled": True})
    _prepare(postgres_session_factory, enabled_settings, password_service)

    with TestClient(
        create_app(
            settings=enabled_settings,
            session_factory=postgres_session_factory,
            password_service=password_service,
        )
    ) as client:
        demo = client.post(
            "/api/auth/demo-access",
            headers={"X-Request-ID": "public-demo-entry"},
        )
        assert demo.status_code == 200, demo.text
        payload = demo.json()
        assert payload["token_type"] == "bearer"
        assert payload["user"]["role"] == "analyst"
        assert payload["user"]["access_mode"] == "demo_read_only"
        token = payload["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me = client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["access_mode"] == "demo_read_only"
        assert client.get("/api/dashboard/summary", headers=headers).status_code == 200
        incidents = client.get("/api/incidents", headers=headers)
        assert incidents.status_code == 200
        incident_id = incidents.json()["items"][0]["incident_id"]
        detail = client.get(f"/api/incidents/{incident_id}", headers=headers)
        assert detail.status_code == 200

        patch = client.patch(
            f"/api/incidents/{incident_id}",
            headers={**headers, "Idempotency-Key": "public-demo-patch"},
            json={
                "status": "in_review",
                "expected_updated_at": detail.json()["updated_at"],
            },
        )
        action = client.post(
            f"/api/incidents/{incident_id}/actions",
            headers={**headers, "Idempotency-Key": "public-demo-action"},
            json={"action_type": "add_note", "note": "Must not be persisted."},
        )
        run = client.post("/api/scenarios/account_takeover/run", headers=headers)
        reset = client.post("/api/scenarios/reset", headers=headers)
        integrity = client.get("/api/system/integrity", headers=headers)
        admin_check = client.get("/api/auth/admin-check", headers=headers)

        assert patch.status_code == 403
        assert patch.json() == {"detail": "Read-only demo access cannot modify data"}
        assert action.status_code == 403
        assert action.json() == {"detail": "Read-only demo access cannot modify data"}
        assert run.status_code == 403
        assert reset.status_code == 403
        assert integrity.status_code == 403
        assert admin_check.status_code == 403

        analyst_password = enabled_settings.demo_analyst_password
        admin_password = enabled_settings.demo_admin_password
        assert analyst_password is not None
        assert admin_password is not None

        analyst_login = client.post(
            "/api/auth/login",
            json={
                "email": enabled_settings.demo_analyst_email,
                "password": analyst_password.get_secret_value(),
            },
        )
        admin_login = client.post(
            "/api/auth/login",
            json={
                "email": enabled_settings.demo_admin_email,
                "password": admin_password.get_secret_value(),
            },
        )
        assert analyst_login.status_code == 200
        assert analyst_login.json()["user"]["access_mode"] == "standard"
        assert admin_login.status_code == 200
        assert admin_login.json()["user"]["access_mode"] == "standard"
        assert (
            client.get(
                "/api/auth/admin-check",
                headers={"Authorization": f"Bearer {admin_login.json()['access_token']}"},
            ).status_code
            == 200
        )
