from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.quantum import QuantumAssetsResponse, QuantumSummaryResponse
from app.services.quantum_readiness import QuantumReadinessService

router = APIRouter(prefix="/api/quantum", tags=["quantum readiness"])


@router.get("/assets", response_model=QuantumAssetsResponse)
def quantum_assets(_: CurrentUser, session: DatabaseSession) -> QuantumAssetsResponse:
    return QuantumReadinessService().list_assets(session)


@router.get("/summary", response_model=QuantumSummaryResponse)
def quantum_summary(_: CurrentUser, session: DatabaseSession) -> QuantumSummaryResponse:
    return QuantumReadinessService().summary(session)
