from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated, cast

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.rate_limit import PublicDemoAccessLimiter
from app.core.security import (
    AccessMode,
    AuthenticationConfigurationError,
    TokenService,
    TokenValidationError,
)
from app.db.session import SessionFactory
from app.models.domain import User
from app.models.enums import AuditEventType, UserRole
from app.services.audit import AuditRecorder
from app.services.authentication import AuthenticationService

_bearer = HTTPBearer(auto_error=False)


def get_session_factory(request: Request) -> SessionFactory:
    return cast(SessionFactory, request.app.state.session_factory)


def get_session(request: Request) -> Iterator[Session]:
    with get_session_factory(request)() as session:
        yield session


def get_token_service(request: Request) -> TokenService:
    return cast(TokenService, request.app.state.token_service)


def get_authentication_service(request: Request) -> AuthenticationService:
    return cast(AuthenticationService, request.app.state.authentication_service)


def get_audit_recorder(request: Request) -> AuditRecorder:
    return cast(AuditRecorder, request.app.state.audit_recorder)


def get_public_demo_access_limiter(request: Request) -> PublicDemoAccessLimiter:
    return cast(PublicDemoAccessLimiter, request.app.state.public_demo_access_limiter)


def request_id(request: Request) -> str:
    return cast(str, request.state.request_id)


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[Session, Depends(get_session)],
    token_service: Annotated[TokenService, Depends(get_token_service)],
    audit: Annotated[AuditRecorder, Depends(get_audit_recorder)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = token_service.decode_access_token(credentials.credentials)
    except AuthenticationConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from exc
    except TokenValidationError as exc:
        audit.record(
            session,
            event_type=AuditEventType.AUTHENTICATION_FAILED,
            entity_type="access_token",
            entity_id="untrusted",
            request_id=request_id(request),
            details={"reason": "invalid_or_expired_token"},
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = session.get(User, claims.user_id)
    if user is None or not user.active or user.role != claims.role:
        audit.record(
            session,
            event_type=AuditEventType.AUTHENTICATION_FAILED,
            actor_user_id=user.user_id if user is not None else None,
            entity_type="user",
            entity_id=str(claims.user_id),
            request_id=request_id(request),
            details={"reason": "inactive_missing_or_role_changed"},
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    request.state.access_mode = claims.access_mode
    return user


def get_writable_user(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    audit: Annotated[AuditRecorder, Depends(get_audit_recorder)],
) -> User:
    if getattr(request.state, "access_mode", AccessMode.STANDARD) == AccessMode.DEMO_READ_ONLY:
        audit.record(
            session,
            event_type=AuditEventType.AUTHORIZATION_DENIED,
            actor_user_id=user.user_id,
            entity_type="route",
            entity_id=request.url.path,
            request_id=request_id(request),
            details={"required_access_mode": AccessMode.STANDARD.value},
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Read-only demo access cannot modify data",
        )
    return user


def get_admin_user(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    audit: Annotated[AuditRecorder, Depends(get_audit_recorder)],
) -> User:
    if getattr(request.state, "access_mode", AccessMode.STANDARD) == AccessMode.DEMO_READ_ONLY:
        audit.record(
            session,
            event_type=AuditEventType.AUTHORIZATION_DENIED,
            actor_user_id=user.user_id,
            entity_type="route",
            entity_id=request.url.path,
            request_id=request_id(request),
            details={"required_access_mode": AccessMode.STANDARD.value},
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    if user.role != UserRole.ADMIN:
        audit.record(
            session,
            event_type=AuditEventType.AUTHORIZATION_DENIED,
            actor_user_id=user.user_id,
            entity_type="route",
            entity_id=request.url.path,
            request_id=request_id(request),
            details={"required_role": UserRole.ADMIN.value, "actual_role": user.role.value},
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return user


DatabaseSession = Annotated[Session, Depends(get_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]
WritableUser = Annotated[User, Depends(get_writable_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
AuthenticationServiceDependency = Annotated[
    AuthenticationService, Depends(get_authentication_service)
]
