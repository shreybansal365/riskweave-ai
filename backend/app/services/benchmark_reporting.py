from __future__ import annotations

from pathlib import Path

from app.schemas.benchmark import BenchmarkSummaryResponse
from risk_engine.benchmark import evaluate_benchmark


class BenchmarkReportingService:
    """Evaluate immutable benchmark-v1 and expose its qualified report."""

    def __init__(self, fixture_path: Path | None = None) -> None:
        self._fixture_path = fixture_path or (
            Path(__file__).resolve().parents[2] / "data" / "benchmark" / "cases.json"
        )

    def summary(self) -> BenchmarkSummaryResponse:
        report = evaluate_benchmark(self._fixture_path)
        return BenchmarkSummaryResponse.model_validate(report.as_dict())
