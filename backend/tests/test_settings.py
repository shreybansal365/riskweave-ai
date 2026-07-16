import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_plain_postgresql_url_selects_psycopg_driver() -> None:
    settings = Settings(
        _env_file=None,
        database_url="postgresql://user:password@localhost:5432/riskweave",
    )

    assert settings.database_url.startswith("postgresql+psycopg://")
    assert settings.public_demo_access_enabled is False


def test_non_postgresql_runtime_url_is_rejected() -> None:
    with pytest.raises(ValidationError, match="must use PostgreSQL"):
        Settings(_env_file=None, database_url="sqlite:///riskweave.db")


def test_cors_allowlist_is_parsed_and_normalized() -> None:
    settings = Settings(
        _env_file=None,
        cors_origins="http://localhost:5173/, https://riskweave.example",
    )

    assert settings.cors_origin_list == [
        "http://localhost:5173",
        "https://riskweave.example",
    ]


def test_cors_wildcard_is_rejected() -> None:
    with pytest.raises(ValidationError, match="Invalid CORS origin"):
        Settings(_env_file=None, cors_origins="*")


def test_production_requires_a_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET is required"):
        Settings(_env_file=None, app_env="production", jwt_secret=None)


def test_weak_authentication_configuration_is_rejected() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(_env_file=None, jwt_secret="too-short")

    with pytest.raises(ValidationError, match="at least 12 characters"):
        Settings(_env_file=None, demo_admin_password="too-short")

    with pytest.raises(ValidationError):
        Settings(_env_file=None, access_token_ttl_minutes=61)


def test_blank_optional_secrets_are_treated_as_unset() -> None:
    settings = Settings(
        _env_file=None,
        jwt_secret="",
        demo_admin_password="",
        demo_analyst_password="",
        release_bootstrap_confirm="",
    )

    assert settings.jwt_secret is None
    assert settings.demo_admin_password is None
    assert settings.demo_analyst_password is None
    assert settings.release_bootstrap_confirm is None
