from fastapi import APIRouter

from app.api.dependencies import CurrentUser
from app.schemas.benchmark import BenchmarkSummaryResponse
from app.services.benchmark_reporting import BenchmarkReportingService

router = APIRouter(prefix="/api/benchmark", tags=["benchmark reporting"])


@router.get("/summary", response_model=BenchmarkSummaryResponse)
def benchmark_summary(_: CurrentUser) -> BenchmarkSummaryResponse:
    return BenchmarkReportingService().summary()
