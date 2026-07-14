from __future__ import annotations

from functools import lru_cache
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import field_validator, model_validator
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
    app_version: str = "0.1.0"
    app_env: AppEnvironment = "development"
    log_level: LogLevel = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = (
        "postgresql+psycopg://riskweave:riskweave-local-only@localhost:5432/riskweave"
    )
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

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
    def validate_cors_origins(self) -> Self:
        """Validate a concrete, wildcard-free browser origin allowlist."""

        _ = self.cors_origin_list
        return self

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
