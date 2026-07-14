from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine

from app.api.routes.system import router as system_router
from app.core.config import Settings, get_settings
from app.db.readiness import PostgresReadinessProbe, ReadinessProbe
from app.db.session import create_database_engine


def create_app(
    settings: Settings | None = None,
    readiness_probe: ReadinessProbe | None = None,
) -> FastAPI:
    """Build the application with explicit, testable dependencies."""

    resolved_settings = settings or get_settings()
    engine: Engine | None = None
    resolved_probe = readiness_probe

    if resolved_probe is None:
        engine = create_database_engine(resolved_settings)
        resolved_probe = PostgresReadinessProbe(engine)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        if engine is not None:
            engine.dispose()

    app = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        docs_url="/docs" if resolved_settings.expose_api_docs else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings
    app.state.readiness_probe = resolved_probe
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
    )
    app.include_router(system_router)
    return app


app = create_app()
