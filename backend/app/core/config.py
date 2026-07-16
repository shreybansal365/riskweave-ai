from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnvironment = Literal["development", "test", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


class Settings(BaseSettings):
    """Validated runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "RiskWeave API"
    app_version: str = "0.5.0"
    app_env: AppEnvironment = "development"
    log_level: LogLevel = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = (
        "postgresql+psycopg://riskweave:riskweave-local-only@localhost:5432/riskweave"
    )
    cors_origins: str = "http://localhost:5173,http://localhost:4173"
    jwt_secret: SecretStr | None = None
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = "riskweave-api"
    jwt_audience: str = "riskweave-analyst-workspace"
    access_token_ttl_minutes: int = Field(default=15, ge=1, le=60)
    demo_admin_email: str = "admin@riskweave.demo"
    demo_admin_password: SecretStr | None = None
    demo_analyst_email: str = "analyst@riskweave.demo"
    demo_analyst_password: SecretStr | None = None
    release_bootstrap_confirm: str | None = None
    auth_failure_limit: int = Field(default=5, ge=1, le=20)
    auth_failure_window_seconds: int = Field(default=60, ge=10, le=900)
    public_demo_access_enabled: bool = False
    demo_seed: int = 26026
    model_random_seed: int = 26026
    simulation_epoch: datetime = datetime(2026, 7, 14, 9, 0, tzinfo=UTC)

    @field_validator("database_url", mode="before")
    @classmethod
    def require_postgresql(cls, value: object) -> str:
        """Reject non-PostgreSQL runtime URLs and select psycopg explicitly."""

        if not isinstance(value, str):
            raise TypeError("DATABASE_URL must be a string")

        normalized = value.strip()
        if normalized.startswith("postgresql://"):
            normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)
        if not normalized.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must use PostgreSQL with the psycopg driver")
        return normalized

    @model_validator(mode="after")
    def validate_security_configuration(self) -> Self:
        """Validate browser origins and production-only secret requirements."""

        _ = self.cors_origin_list
        if self.app_env == "production" and self.jwt_secret is None:
            raise ValueError("JWT_SECRET is required when APP_ENV=production")
        if self.demo_seed != 26026 or self.model_random_seed != 26026:
            raise ValueError("RiskWeave demo and model seeds are locked to 26026")
        if self.simulation_epoch != datetime(2026, 7, 14, 9, 0, tzinfo=UTC):
            raise ValueError("SIMULATION_EPOCH is locked to 2026-07-14T09:00:00Z")
        return self

    @field_validator("simulation_epoch")
    @classmethod
    def require_utc_simulation_epoch(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
            raise ValueError("SIMULATION_EPOCH must be timezone-aware UTC")
        return value.astimezone(UTC)

    @field_validator("jwt_secret")
    @classmethod
    def require_strong_jwt_secret(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return value

    @field_validator(
        "jwt_secret",
        "demo_admin_password",
        "demo_analyst_password",
        "release_bootstrap_confirm",
        mode="before",
    )
    @classmethod
    def blank_secret_is_unset(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("demo_admin_password", "demo_analyst_password")
    @classmethod
    def require_demo_password_strength(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None and len(value.get_secret_value()) < 12:
            raise ValueError("demo passwords must contain at least 12 characters")
        return value

    @field_validator("demo_admin_email", "demo_analyst_email")
    @classmethod
    def normalize_demo_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if len(normalized) > 320 or "@" not in normalized or normalized.startswith("@"):
            raise ValueError("demo email must be a valid normalized email address")
        return normalized

    @property
    def cors_origin_list(self) -> list[str]:
        """Return validated origins in the format expected by FastAPI."""

        origins = [origin.strip().rstrip("/") for origin in self.cors_origins.split(",")]
        origins = [origin for origin in origins if origin]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")

        for origin in origins:
            parsed = urlsplit(origin)
            if (
                origin == "*"
                or parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"Invalid CORS origin: {origin}")
        return origins

    @property
    def expose_api_docs(self) -> bool:
        """Hide interactive documentation in production."""

        return self.app_env != "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide validated settings instance."""

    return Settings()
