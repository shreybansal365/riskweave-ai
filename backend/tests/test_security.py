from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Settings
from app.core.rate_limit import AuthenticationFailureLimiter, PublicDemoAccessLimiter
from app.core.security import (
    AccessMode,
    AuthenticationConfigurationError,
    PasswordService,
    TokenService,
    TokenValidationError,
)
from app.main import create_app
from app.models.enums import UserRole


def _secret_value(value: SecretStr | None) -> str:
    assert value is not None
    return value.get_secret_value()


def test_password_service_uses_argon2id_and_rejects_bad_passwords() -> None:
    service = PasswordService()
    password_hash = service.hash_password("Unit-Test-Password-2026!")

    assert password_hash.startswith("$argon2id$")
    assert service.verify_password(password_hash, "Unit-Test-Password-2026!")
    assert not service.verify_password(password_hash, "wrong-password")
    assert not service.verify_password("not-a-hash", "wrong-password")
    assert service.needs_rehash("not-a-hash")
    assert not service.needs_rehash(password_hash)


def test_token_service_round_trip_and_rejections(settings: Settings) -> None:
    service = TokenService(settings)
    user_id = uuid4()
    token = service.create_access_token(user_id=user_id, role=UserRole.ADMIN)
    claims = service.decode_access_token(token.value)

    assert claims.user_id == user_id
    assert claims.role == UserRole.ADMIN
    assert claims.access_mode == AccessMode.STANDARD
    assert token.expires_in_seconds == 900

    demo_token = service.create_access_token(
        user_id=user_id,
        role=UserRole.ANALYST,
        access_mode=AccessMode.DEMO_READ_ONLY,
    )
    assert service.decode_access_token(demo_token.value).access_mode == AccessMode.DEMO_READ_ONLY

    with pytest.raises(TokenValidationError):
        service.decode_access_token(f"{token.value}tampered")

    now = datetime.now(UTC)
    expired = jwt.encode(
        {
            "sub": str(user_id),
            "role": UserRole.ADMIN.value,
            "type": "access",
            "jti": str(uuid4()),
            "iat": now - timedelta(minutes=20),
            "exp": now - timedelta(minutes=5),
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
        },
        _secret_value(settings.jwt_secret),
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(TokenValidationError):
        service.decode_access_token(expired)


def test_unconfigured_token_service_fails_closed() -> None:
    settings = Settings(_env_file=None, jwt_secret=None)
    service = TokenService(settings)

    assert not service.configured
    with pytest.raises(AuthenticationConfigurationError):
        service.create_access_token(user_id=uuid4(), role=UserRole.ANALYST)
    with pytest.raises(AuthenticationConfigurationError):
        service.decode_access_token("token")


def test_authentication_failure_limiter_uses_fixed_window() -> None:
    current_time = 100.0

    def clock() -> float:
        return current_time

    limiter = AuthenticationFailureLimiter(failure_limit=2, window_seconds=60, clock=clock)
    assert limiter.is_allowed("analyst")
    limiter.record_failure("analyst")
    assert limiter.is_allowed("analyst")
    limiter.record_failure("analyst")
    assert not limiter.is_allowed("analyst")
    limiter.reset("analyst")
    assert limiter.is_allowed("analyst")


def test_public_demo_access_limiter_bounds_successful_issuance() -> None:
    current_time = 100.0

    def clock() -> float:
        return current_time

    limiter = PublicDemoAccessLimiter(request_limit=2, window_seconds=60, clock=clock)
    assert limiter.consume("judge")
    assert limiter.consume("judge")
    assert not limiter.consume("judge")
    current_time = 161.0
    assert limiter.consume("judge")


def test_production_error_response_is_safe(settings: Settings) -> None:
    production_settings = Settings(
        _env_file=None,
        app_env="production",
        database_url=settings.database_url,
        cors_origins=settings.cors_origins,
        jwt_secret="production-test-secret-at-least-32-characters",
    )
    app: FastAPI = create_app(settings=production_settings)

    @app.get("/test-only/failure")
    def fail() -> None:
        raise RuntimeError("internal stack detail must not escape")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-only/failure", headers={"X-Request-ID": "safe-error-id"})

    assert response.status_code == 500
    assert response.json() == {
        "detail": "Internal server error",
        "request_id": "safe-error-id",
    }
    assert "stack detail" not in response.text
