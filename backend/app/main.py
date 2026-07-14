from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import Engine

from app.api.routes.auth import router as auth_router
from app.api.routes.system import router as system_router
from app.core.config import Settings, get_settings
from app.core.middleware import RequestIdMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import AuthenticationFailureLimiter
from app.core.security import PasswordService, TokenService
from app.db.readiness import PostgresReadinessProbe, ReadinessProbe
from app.db.session import (
    SessionFactory,
    create_database_engine,
    create_session_factory,
)
from app.services.audit import AuditRecorder
from app.services.authentication import AuthenticationService

logger = logging.getLogger(__name__)


def create_app(
    settings: Settings | None = None,
    readiness_probe: ReadinessProbe | None = None,
    database_engine: Engine | None = None,
    session_factory: SessionFactory | None = None,
    password_service: PasswordService | None = None,
    token_service: TokenService | None = None,
    failure_limiter: AuthenticationFailureLimiter | None = None,
) -> FastAPI:
    """Build the application with explicit, testable dependencies."""

    resolved_settings = settings or get_settings()
    engine = database_engine or create_database_engine(resolved_settings)
    owns_engine = database_engine is None
    resolved_probe = readiness_probe or PostgresReadinessProbe(engine)
    resolved_session_factory = session_factory or create_session_factory(engine)
    resolved_password_service = password_service or PasswordService()
    resolved_token_service = token_service or TokenService(resolved_settings)
    resolved_failure_limiter = failure_limiter or AuthenticationFailureLimiter(
        failure_limit=resolved_settings.auth_failure_limit,
        window_seconds=resolved_settings.auth_failure_window_seconds,
    )
    audit_recorder = AuditRecorder()
    authentication_service = AuthenticationService(
        password_service=resolved_password_service,
        token_service=resolved_token_service,
        failure_limiter=resolved_failure_limiter,
        audit_recorder=audit_recorder,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        if owns_engine:
            engine.dispose()

    app = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        docs_url="/docs" if resolved_settings.expose_api_docs else None,
        redoc_url=None,
        lifespan=lifespan,
        debug=False,
    )
    app.state.settings = resolved_settings
    app.state.readiness_probe = resolved_probe
    app.state.session_factory = resolved_session_factory
    app.state.password_service = resolved_password_service
    app.state.token_service = resolved_token_service
    app.state.audit_recorder = audit_recorder
    app.state.authentication_service = authentication_service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIdMiddleware)

    @app.exception_handler(Exception)
    async def safe_unhandled_exception(request: Request, exception: Exception) -> JSONResponse:
        request_identifier = getattr(request.state, "request_id", "unavailable")
        logger.exception("Unhandled request failure request_id=%s", request_identifier)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Internal server error",
                "request_id": request_identifier,
            },
        )

    app.include_router(auth_router)
    app.include_router(system_router)
    return app


app = create_app()
