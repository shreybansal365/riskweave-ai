from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query, Request, status

from app.api.dependencies import CurrentUser, DatabaseSession, request_id
from app.models.enums import IncidentStatus, ScenarioKey, Severity
from app.schemas.incidents import (
    AnalystActionRequest,
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentMutationResponse,
    IncidentPatchRequest,
)
from app.services.analyst_workflows import (
    AnalystWorkflowService,
    WorkflowConflictError,
    WorkflowNotFoundError,
)
from app.services.incidents import IncidentNotFoundError, IncidentQueryService

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    _: CurrentUser,
    session: DatabaseSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Literal["created_at", "updated_at", "severity", "fused_score", "status"] = (
        "created_at"
    ),
    sort_direction: Literal["asc", "desc"] = "desc",
    severity: Severity | None = None,
    status_filter: Annotated[IncidentStatus | None, Query(alias="status")] = None,
    scenario: ScenarioKey | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
) -> IncidentListResponse:
    if date_from is not None and date_from.tzinfo is None:
        raise HTTPException(status_code=422, detail="date_from must be timezone-aware")
    if date_to is not None and date_to.tzinfo is None:
        raise HTTPException(status_code=422, detail="date_to must be timezone-aware")
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to")
    return IncidentQueryService().list_incidents(
        session,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_direction=sort_direction,
        severity=severity,
        status=status_filter,
        scenario=scenario,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )


@router.get(
    "/{incident_id}",
    response_model=IncidentDetailResponse,
    responses={status.HTTP_404_NOT_FOUND: {"description": "Incident not found"}},
)
def get_incident(
    incident_id: UUID,
    _: CurrentUser,
    session: DatabaseSession,
) -> IncidentDetailResponse:
    try:
        return IncidentQueryService().get_incident(session, incident_id)
    except IncidentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Incident not found") from exc


@router.patch(
    "/{incident_id}",
    response_model=IncidentMutationResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Incident not found"},
        status.HTTP_409_CONFLICT: {"description": "Invalid or conflicting transition"},
    },
)
def patch_incident(
    incident_id: UUID,
    payload: IncidentPatchRequest,
    request: Request,
    user: CurrentUser,
    session: DatabaseSession,
    idempotency_key: Annotated[
        str,
        Header(alias="Idempotency-Key", min_length=1, max_length=128),
    ],
) -> IncidentMutationResponse:
    try:
        return AnalystWorkflowService().patch_status(
            session,
            incident_id=incident_id,
            target_status=payload.status,
            note=payload.note,
            expected_updated_at=payload.expected_updated_at,
            idempotency_key=idempotency_key,
            analyst=user,
            request_id=request_id(request),
        )
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Incident not found") from exc
    except WorkflowConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/{incident_id}/actions",
    response_model=IncidentMutationResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Incident not found"},
        status.HTTP_409_CONFLICT: {"description": "Invalid or conflicting action"},
    },
)
def record_incident_action(
    incident_id: UUID,
    payload: AnalystActionRequest,
    request: Request,
    user: CurrentUser,
    session: DatabaseSession,
    idempotency_key: Annotated[
        str,
        Header(alias="Idempotency-Key", min_length=1, max_length=128),
    ],
) -> IncidentMutationResponse:
    try:
        return AnalystWorkflowService().apply_action(
            session,
            incident_id=incident_id,
            action_type=payload.action_type,
            note=payload.note,
            expected_updated_at=payload.expected_updated_at,
            idempotency_key=idempotency_key,
            analyst=user,
            request_id=request_id(request),
        )
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Incident not found") from exc
    except WorkflowConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
