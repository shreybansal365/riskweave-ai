from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rate_limit import AuthenticationFailureLimiter
from app.core.security import AccessToken, PasswordService, TokenService
from app.models.domain import User
from app.models.enums import AuditEventType
from app.services.audit import AuditRecorder


class InvalidCredentialsError(ValueError):
    """Raised for every credential failure to avoid account enumeration."""


class AuthenticationRateLimitedError(ValueError):
    """Raised after repeated failed attempts for the same normalized account key."""


@dataclass(frozen=True, slots=True)
class AuthenticationResult:
    user: User
    access_token: AccessToken


class AuthenticationService:
    def __init__(
        self,
        *,
        password_service: PasswordService,
        token_service: TokenService,
        failure_limiter: AuthenticationFailureLimiter,
        audit_recorder: AuditRecorder,
    ) -> None:
        self._passwords = password_service
        self._tokens = token_service
        self._failure_limiter = failure_limiter
        self._audit = audit_recorder

    def authenticate(
        self,
        session: Session,
        *,
        email: str,
        password: str,
        request_id: str,
    ) -> AuthenticationResult:
        normalized_email = email.strip().lower()
        if not self._failure_limiter.is_allowed(normalized_email):
            self._record_failure(
                session,
                normalized_email=normalized_email,
                request_id=request_id,
                user=None,
                reason="rate_limited",
            )
            session.commit()
            raise AuthenticationRateLimitedError

        user = session.scalar(select(User).where(User.email == normalized_email))
        candidate_hash = user.password_hash if user is not None else self._passwords.dummy_hash
        password_valid = self._passwords.verify_password(candidate_hash, password)

        if user is None or not user.active or not password_valid:
            self._failure_limiter.record_failure(normalized_email)
            self._record_failure(
                session,
                normalized_email=normalized_email,
                request_id=request_id,
                user=user,
                reason="invalid_credentials",
            )
            session.commit()
            raise InvalidCredentialsError

        access_token = self._tokens.create_access_token(user_id=user.user_id, role=user.role)
        user.last_login_at = datetime.now(UTC)
        self._audit.record(
            session,
            event_type=AuditEventType.AUTHENTICATION_SUCCEEDED,
            actor_user_id=user.user_id,
            entity_type="user",
            entity_id=str(user.user_id),
            request_id=request_id,
            details={"role": user.role.value},
        )
        session.commit()
        self._failure_limiter.reset(normalized_email)
        return AuthenticationResult(user=user, access_token=access_token)

    def _record_failure(
        self,
        session: Session,
        *,
        normalized_email: str,
        request_id: str,
        user: User | None,
        reason: str,
    ) -> None:
        self._audit.record(
            session,
            event_type=AuditEventType.AUTHENTICATION_FAILED,
            actor_user_id=user.user_id if user is not None else None,
            entity_type="user",
            entity_id=str(user.user_id) if user is not None else normalized_email,
            request_id=request_id,
            details={"reason": reason},
        )
