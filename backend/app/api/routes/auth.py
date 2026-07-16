from typing import cast

from fastapi import APIRouter, HTTPException, Request, status

from app.api.dependencies import (
    AdminUser,
    AuthenticationServiceDependency,
    CurrentUser,
    DatabaseSession,
    get_public_demo_access_limiter,
    request_id,
)
from app.core.config import Settings
from app.core.security import AccessMode, AuthenticationConfigurationError
from app.schemas.auth import (
    AuthenticatedUserResponse,
    AuthorizationCheckResponse,
    LoginRequest,
    LoginResponse,
)
from app.services.authentication import (
    AuthenticationRateLimitedError,
    DemoAccessUnavailableError,
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


@router.post(
    "/demo-access",
    response_model=LoginResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Public demo access is disabled"},
        status.HTTP_429_TOO_MANY_REQUESTS: {"description": "Too many demo-access requests"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Public demo access unavailable"},
    },
)
def demo_access(
    request: Request,
    session: DatabaseSession,
    authentication: AuthenticationServiceDependency,
) -> LoginResponse:
    settings = cast(Settings, request.app.state.settings)
    if not settings.public_demo_access_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public demo access is unavailable",
        )

    limiter = get_public_demo_access_limiter(request)
    client_key = request.client.host if request.client is not None else "unknown-client"
    if not limiter.consume(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many demo access requests; retry later",
            headers={"Retry-After": str(settings.auth_failure_window_seconds)},
        )

    try:
        result = authentication.authenticate_demo_access(
            session,
            analyst_email=settings.demo_analyst_email,
            request_id=request_id(request),
        )
    except (DemoAccessUnavailableError, AuthenticationConfigurationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Public demo access is unavailable",
        ) from exc

    user = AuthenticatedUserResponse.model_validate(result.user).model_copy(
        update={"access_mode": AccessMode.DEMO_READ_ONLY}
    )
    return LoginResponse(
        access_token=result.access_token.value,
        expires_in=result.access_token.expires_in_seconds,
        user=user,
    )


@router.get("/me", response_model=AuthenticatedUserResponse)
def me(request: Request, user: CurrentUser) -> AuthenticatedUserResponse:
    access_mode = cast(AccessMode, request.state.access_mode)
    return AuthenticatedUserResponse.model_validate(user).model_copy(
        update={"access_mode": access_mode}
    )


@router.get("/admin-check", response_model=AuthorizationCheckResponse)
def admin_check(user: AdminUser) -> AuthorizationCheckResponse:
    return AuthorizationCheckResponse(user=AuthenticatedUserResponse.model_validate(user))
