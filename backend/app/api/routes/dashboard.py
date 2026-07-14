from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dashboard import DashboardSummaryResponse, DashboardTrendsResponse
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(_: CurrentUser, session: DatabaseSession) -> DashboardSummaryResponse:
    return DashboardService().summary(session)


@router.get("/trends", response_model=DashboardTrendsResponse)
def dashboard_trends(_: CurrentUser, session: DatabaseSession) -> DashboardTrendsResponse:
    return DashboardService().trends(session)
