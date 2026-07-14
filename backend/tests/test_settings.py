import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_plain_postgresql_url_selects_psycopg_driver() -> None:
    settings = Settings(
        _env_file=None,
        database_url="postgresql://user:password@localhost:5432/riskweave",
    )

    assert settings.database_url.startswith("postgresql+psycopg://")


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
