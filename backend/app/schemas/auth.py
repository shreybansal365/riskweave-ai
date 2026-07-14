from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=320)
    password: SecretStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        local, separator, domain = normalized.partition("@")
        if not separator or not local or "." not in domain or domain.startswith("."):
            raise ValueError("email must be a valid address")
        return normalized

    @field_validator("password")
    @classmethod
    def bound_password(cls, value: SecretStr) -> SecretStr:
        length = len(value.get_secret_value())
        if length < 1 or length > 256:
            raise ValueError("password must contain between 1 and 256 characters")
        return value


class AuthenticatedUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    user_id: UUID
    email: str
    display_name: str
    role: UserRole
    active: bool
    created_at: datetime
    last_login_at: datetime | None


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: AuthenticatedUserResponse


class AuthorizationCheckResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    authorized: Literal[True] = True
    required_role: Literal["admin"] = "admin"
    user: AuthenticatedUserResponse
