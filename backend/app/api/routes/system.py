from typing import cast

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.core.config import Settings
from app.db.readiness import ReadinessProbe
from app.schemas.system import HealthResponse, ReadinessChecks, ReadinessResponse

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
