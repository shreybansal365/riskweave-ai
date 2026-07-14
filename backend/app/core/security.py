from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings
from app.models.enums import UserRole


class AuthenticationConfigurationError(RuntimeError):
    """Raised when authentication is requested without required secret configuration."""


class TokenValidationError(ValueError):
    """Raised when an access token is expired, malformed, or otherwise untrusted."""


@dataclass(frozen=True, slots=True)
class AccessToken:
    value: str
    expires_in_seconds: int


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: UUID
    role: UserRole
    token_id: UUID


class PasswordService:
    """Argon2id password hashing with explicit, reviewable parameters."""

    def __init__(self) -> None:
        self._hasher = PasswordHasher(
            time_cost=2,
            memory_cost=19_456,
            parallelism=1,
            hash_len=32,
            salt_len=16,
            type=Type.ID,
        )
        self._dummy_hash = self._hasher.hash("riskweave-non-account-dummy-password")

    @property
    def dummy_hash(self) -> str:
        return self._dummy_hash

    def hash_password(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify_password(self, password_hash: str, password: str) -> bool:
        try:
            return self._hasher.verify(password_hash, password)
        except (InvalidHashError, VerificationError, VerifyMismatchError):
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        try:
            return self._hasher.check_needs_rehash(password_hash)
        except InvalidHashError:
            return True


class TokenService:
    """Issue and validate short-lived, audience-bound HS256 access tokens."""

    def __init__(self, settings: Settings) -> None:
        self._secret = (
            settings.jwt_secret.get_secret_value() if settings.jwt_secret is not None else None
        )
        self._algorithm = settings.jwt_algorithm
        self._issuer = settings.jwt_issuer
        self._audience = settings.jwt_audience
        self._ttl = timedelta(minutes=settings.access_token_ttl_minutes)

    @property
    def configured(self) -> bool:
        return self._secret is not None

    def create_access_token(self, *, user_id: UUID, role: UserRole) -> AccessToken:
        secret = self._require_secret()
        issued_at = datetime.now(UTC)
        expires_at = issued_at + self._ttl
        token_id = uuid4()
        payload = {
            "sub": str(user_id),
            "role": role.value,
            "type": "access",
            "jti": str(token_id),
            "iat": issued_at,
            "exp": expires_at,
            "iss": self._issuer,
            "aud": self._audience,
        }
        encoded = jwt.encode(payload, secret, algorithm=self._algorithm)
        return AccessToken(value=encoded, expires_in_seconds=int(self._ttl.total_seconds()))

    def decode_access_token(self, token: str) -> TokenClaims:
        secret = self._require_secret()
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=[self._algorithm],
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["sub", "role", "type", "jti", "iat", "exp", "iss", "aud"]},
            )
            if payload.get("type") != "access":
                raise TokenValidationError("token type is not accepted")
            return TokenClaims(
                user_id=UUID(str(payload["sub"])),
                role=UserRole(str(payload["role"])),
                token_id=UUID(str(payload["jti"])),
            )
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
            if isinstance(exc, TokenValidationError):
                raise
            raise TokenValidationError("access token is invalid or expired") from exc

    def _require_secret(self) -> str:
        if self._secret is None:
            raise AuthenticationConfigurationError("authentication is not configured")
        return self._secret
