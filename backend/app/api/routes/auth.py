from typing import cast

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import (
    AdminUser,
    AuthenticationServiceDependency,
    CurrentUser,
    DatabaseSession,
    request_id,
)
from app.core.config import Settings
from app.core.security import AuthenticationConfigurationError
from app.schemas.auth import (
    AuthenticatedUserResponse,
    AuthorizationCheckResponse,
    LoginRequest,
    LoginResponse,
)
from app.services.authentication import (
    AuthenticationRateLimitedError,
    InvalidCredentialsError,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        status.HTTP_401_UNAUTHORIZED: {"description": "Invalid credentials"},
        status.HTTP_429_TOO_MANY_REQUESTS: {"description": "Too many failed attempts"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Authentication not configured"},
    },
)
def login(
    payload: LoginRequest,
    request: Request,
    session: DatabaseSession,
    authentication: AuthenticationServiceDependency,
) -> LoginResponse:
    try:
        result = authentication.authenticate(
            session,
            email=payload.email,
            password=payload.password.get_secret_value(),
            request_id=request_id(request),
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except AuthenticationRateLimitedError as exc:
        settings = cast(Settings, request.app.state.settings)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts; retry later",
            headers={"Retry-After": str(settings.auth_failure_window_seconds)},
        ) from exc
    except AuthenticationConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from exc

    return LoginResponse(
        access_token=result.access_token.value,
        expires_in=result.access_token.expires_in_seconds,
        user=AuthenticatedUserResponse.model_validate(result.user),
    )


@router.get("/me", response_model=AuthenticatedUserResponse)
def me(user: CurrentUser) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse.model_validate(user)


@router.get("/admin-check", response_model=AuthorizationCheckResponse)
def admin_check(user: AdminUser) -> AuthorizationCheckResponse:
    return AuthorizationCheckResponse(user=AuthenticatedUserResponse.model_validate(user))
