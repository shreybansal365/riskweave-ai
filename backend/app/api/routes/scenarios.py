from fastapi import APIRouter, Request

from app.api.dependencies import (
    AdminUser,
    CurrentUser,
    DatabaseSession,
    get_session_factory,
    request_id,
)
from app.models.enums import ScenarioKey
from app.schemas.scenarios import (
    ScenarioCatalogResponse,
    ScenarioExecutionResponse,
    ScenarioResetResponse,
)
from app.services.scenario_operations import ScenarioOperationsService

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("", response_model=ScenarioCatalogResponse)
def scenario_catalog(
    _: CurrentUser,
    session: DatabaseSession,
    request: Request,
) -> ScenarioCatalogResponse:
    return ScenarioOperationsService(get_session_factory(request)).catalog(session)


@router.post("/{scenario_key}/run", response_model=ScenarioExecutionResponse)
def run_scenario(
    scenario_key: ScenarioKey,
    request: Request,
    admin: AdminUser,
    session: DatabaseSession,
) -> ScenarioExecutionResponse:
    return ScenarioOperationsService(get_session_factory(request)).run(
        session,
        scenario_key=scenario_key,
        actor_user_id=admin.user_id,
        request_id=request_id(request),
    )


@router.post("/reset", response_model=ScenarioResetResponse)
def reset_scenarios(request: Request, admin: AdminUser) -> ScenarioResetResponse:
    return ScenarioOperationsService(get_session_factory(request)).reset(
        actor_user_id=admin.user_id,
        request_id=request_id(request),
    )
