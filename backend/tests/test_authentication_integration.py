from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import select

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.models.domain import AuditEvent, User
from app.models.enums import AuditEventType, UserRole
from app.services.seeding import seed_demo_users


def _seed_users(
    session_factory: SessionFactory,
    settings: Settings,
    password_service: PasswordService,
) -> None:
    with session_factory.begin() as session:
        seed_demo_users(session, settings=settings, password_service=password_service)


def _login(
    client: TestClient,
    *,
    email: str,
    password: str,
    request_identifier: str,
) -> tuple[str, dict[str, Any]]:
    response = client.post(
        "/api/auth/login",
        headers={"X-Request-ID": request_identifier},
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    return str(payload["access_token"]), payload


def _secret_value(value: SecretStr | None) -> str:
    assert value is not None
    return value.get_secret_value()


@pytest.mark.integration
def test_login_and_me_create_success_audit(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _seed_users(postgres_session_factory, postgres_settings, password_service)
    request_identifier = f"login-success-{uuid4()}"

    token, payload = _login(
        postgres_client,
        email=postgres_settings.demo_analyst_email.upper(),
        password=_secret_value(postgres_settings.demo_analyst_password),
        request_identifier=request_identifier,
    )

    assert payload["token_type"] == "bearer"
    assert payload["expires_in"] == 900
    assert payload["user"]["role"] == "analyst"
    assert payload["user"]["access_mode"] == "standard"
    assert payload["user"]["last_login_at"] is not None

    me_response = postgres_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == postgres_settings.demo_analyst_email
    assert me_response.json()["access_mode"] == "standard"
    assert me_response.headers["X-Content-Type-Options"] == "nosniff"
    assert me_response.headers["X-Frame-Options"] == "DENY"

    with postgres_session_factory() as session:
        event = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == request_identifier)
        )
        assert event is not None
        assert event.event_type == AuditEventType.AUTHENTICATION_SUCCEEDED
        assert event.details == {"role": "analyst"}


@pytest.mark.integration
def test_failed_login_is_generic_rate_limited_and_audited(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _seed_users(postgres_session_factory, postgres_settings, password_service)
    request_ids: list[str] = []
    for attempt in range(postgres_settings.auth_failure_limit):
        request_identifier = f"failed-login-{attempt}-{uuid4()}"
        request_ids.append(request_identifier)
        response = postgres_client.post(
            "/api/auth/login",
            headers={"X-Request-ID": request_identifier},
            json={
                "email": postgres_settings.demo_analyst_email,
                "password": "Wrong-Password-2026!",
            },
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid email or password"}

    limited_request_id = f"rate-limited-{uuid4()}"
    limited = postgres_client.post(
        "/api/auth/login",
        headers={"X-Request-ID": limited_request_id},
        json={
            "email": postgres_settings.demo_analyst_email,
            "password": "Wrong-Password-2026!",
        },
    )
    assert limited.status_code == 429
    assert "retry" in limited.json()["detail"].lower()

    with postgres_session_factory() as session:
        events = list(
            session.scalars(
                select(AuditEvent).where(
                    AuditEvent.request_id.in_([*request_ids, limited_request_id])
                )
            )
        )
        assert len(events) == postgres_settings.auth_failure_limit + 1
        assert all(event.event_type == AuditEventType.AUTHENTICATION_FAILED for event in events)
        assert all("password" not in str(event.details).lower() for event in events)
        assert any(event.details["reason"] == "rate_limited" for event in events)


@pytest.mark.integration
def test_invalid_and_expired_tokens_are_rejected_and_audited(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _seed_users(postgres_session_factory, postgres_settings, password_service)
    invalid_request_id = f"invalid-token-{uuid4()}"
    invalid = postgres_client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Bearer not-a-jwt",
            "X-Request-ID": invalid_request_id,
        },
    )
    assert invalid.status_code == 401
    assert invalid.json()["detail"] == "Invalid or expired access token"

    with postgres_session_factory() as session:
        analyst = session.scalar(
            select(User).where(User.email == postgres_settings.demo_analyst_email)
        )
        assert analyst is not None
        expired_at = datetime.now(UTC) - timedelta(minutes=5)
        expired_token = jwt.encode(
            {
                "sub": str(analyst.user_id),
                "role": analyst.role.value,
                "type": "access",
                "jti": str(uuid4()),
                "iat": expired_at - timedelta(minutes=15),
                "exp": expired_at,
                "iss": postgres_settings.jwt_issuer,
                "aud": postgres_settings.jwt_audience,
            },
            _secret_value(postgres_settings.jwt_secret),
            algorithm=postgres_settings.jwt_algorithm,
        )

    expired_request_id = f"expired-token-{uuid4()}"
    expired = postgres_client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {expired_token}",
            "X-Request-ID": expired_request_id,
        },
    )
    assert expired.status_code == 401

    with postgres_session_factory() as session:
        audited_request_ids = set(
            session.scalars(
                select(AuditEvent.request_id).where(
                    AuditEvent.request_id.in_([invalid_request_id, expired_request_id])
                )
            )
        )
        assert audited_request_ids == {invalid_request_id, expired_request_id}


@pytest.mark.integration
def test_server_side_role_separation_and_authorization_audit(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _seed_users(postgres_session_factory, postgres_settings, password_service)
    analyst_token, _ = _login(
        postgres_client,
        email=postgres_settings.demo_analyst_email,
        password=_secret_value(postgres_settings.demo_analyst_password),
        request_identifier=f"analyst-login-{uuid4()}",
    )
    admin_token, _ = _login(
        postgres_client,
        email=postgres_settings.demo_admin_email,
        password=_secret_value(postgres_settings.demo_admin_password),
        request_identifier=f"admin-login-{uuid4()}",
    )

    denial_request_id = f"role-denial-{uuid4()}"
    analyst_response = postgres_client.get(
        "/api/auth/admin-check",
        headers={
            "Authorization": f"Bearer {analyst_token}",
            "X-Request-ID": denial_request_id,
        },
    )
    assert analyst_response.status_code == 403
    assert analyst_response.json() == {"detail": "Insufficient permissions"}

    admin_response = postgres_client.get(
        "/api/auth/admin-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["required_role"] == "admin"
    assert admin_response.json()["user"]["role"] == "admin"

    with postgres_session_factory() as session:
        denial = session.scalar(
            select(AuditEvent).where(AuditEvent.request_id == denial_request_id)
        )
        assert denial is not None
        assert denial.event_type == AuditEventType.AUTHORIZATION_DENIED
        assert denial.details == {"required_role": "admin", "actual_role": "analyst"}


@pytest.mark.integration
def test_protected_endpoint_and_login_payload_validation(postgres_client: TestClient) -> None:
    unauthenticated = postgres_client.get("/api/auth/me")
    assert unauthenticated.status_code == 401
    assert unauthenticated.headers["WWW-Authenticate"] == "Bearer"

    invalid_payload = postgres_client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": "x", "role": "admin"},
    )
    assert invalid_payload.status_code == 422
    assert "traceback" not in invalid_payload.text.lower()


@pytest.mark.integration
def test_request_identifier_and_auth_cache_headers(
    postgres_client: TestClient,
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    _seed_users(postgres_session_factory, postgres_settings, password_service)
    request_identifier = f"header-check-{uuid4()}"
    response = postgres_client.post(
        "/api/auth/login",
        headers={"X-Request-ID": request_identifier},
        json={
            "email": postgres_settings.demo_admin_email,
            "password": _secret_value(postgres_settings.demo_admin_password),
        },
    )
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == request_identifier
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Content-Security-Policy"].startswith("default-src 'none'")

    replaced = postgres_client.get("/health", headers={"X-Request-ID": "unsafe id with spaces"})
    assert replaced.status_code == 200
    assert replaced.headers["X-Request-ID"] != "unsafe id with spaces"
    assert len(replaced.headers["X-Request-ID"]) == 36


@pytest.mark.integration
def test_demo_user_seed_is_deterministic_and_idempotent(
    postgres_settings: Settings,
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    with postgres_session_factory.begin() as session:
        first = seed_demo_users(
            session,
            settings=postgres_settings,
            password_service=password_service,
        )
    with postgres_session_factory() as session:
        first_hashes = {
            user.user_id: user.password_hash
            for user in session.scalars(select(User).where(User.user_id.in_(first.user_ids)))
        }

    with postgres_session_factory.begin() as session:
        second = seed_demo_users(
            session,
            settings=postgres_settings,
            password_service=password_service,
        )
    with postgres_session_factory() as session:
        users = list(session.scalars(select(User).where(User.user_id.in_(second.user_ids))))
        second_hashes = {user.user_id: user.password_hash for user in users}

    assert first.user_ids == second.user_ids
    assert second.unchanged == 2
    assert second.created == 0
    assert second.updated == 0
    assert first_hashes == second_hashes
    assert {user.role for user in users} == {UserRole.ANALYST, UserRole.ADMIN}
    assert all(user.password_hash.startswith("$argon2id$") for user in users)
    assert all("Password-2026" not in user.password_hash for user in users)
