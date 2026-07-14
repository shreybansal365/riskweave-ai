from typing import cast

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.api.dependencies import AdminUser, CurrentUser, DatabaseSession
from app.core.config import Settings
from app.db.readiness import ReadinessProbe
from app.schemas.system import (
    HealthResponse,
    ReadinessChecks,
    ReadinessResponse,
    SystemContextResponse,
    SystemIntegrityResponse,
)
from app.services.system_integrity import SystemIntegrityService

router = APIRouter(tags=["system"])


def _settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def _readiness_probe(request: Request) -> ReadinessProbe:
    return cast(ReadinessProbe, request.app.state.readiness_probe)


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    """Report application liveness without touching the database."""

    settings = _settings(request)
    return HealthResponse(service=settings.app_name, version=settings.app_version)


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse}},
)
def ready(request: Request) -> ReadinessResponse | JSONResponse:
    """Report PostgreSQL connectivity and Alembic revision readiness."""

    settings = _settings(request)
    snapshot = _readiness_probe(request).check()
    payload = ReadinessResponse(
        status="ready" if snapshot.is_ready else "not_ready",
        service=settings.app_name,
        checks=ReadinessChecks(
            database=snapshot.database,
            migrations=snapshot.migrations,
        ),
        revision=snapshot.revision,
    )

    if not snapshot.is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload.model_dump(mode="json"),
        )
    return payload


@router.get("/api/system/integrity", response_model=SystemIntegrityResponse)
def system_integrity(
    request: Request,
    _: AdminUser,
    session: DatabaseSession,
) -> SystemIntegrityResponse:
    """Return safe deterministic runtime context for authenticated administrators."""

    return SystemIntegrityService().snapshot(
        session,
        settings=_settings(request),
        readiness=_readiness_probe(request).check(),
        api_origin=str(request.base_url),
    )


@router.get("/api/system/context", response_model=SystemContextResponse)
def system_context(
    request: Request,
    _: CurrentUser,
    session: DatabaseSession,
) -> SystemContextResponse:
    """Return safe environment and deterministic dataset context to signed-in users."""

    return SystemIntegrityService().context(
        session,
        settings=_settings(request),
        api_origin=str(request.base_url),
    )
