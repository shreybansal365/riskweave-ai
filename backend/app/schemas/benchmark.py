from __future__ import annotations

from decimal import Decimal

from pydantic import Field

from app.schemas.common import ApiModel


class BenchmarkDecisionCountsResponse(ApiModel):
    permitted: int = Field(ge=0)
    monitored: int = Field(ge=0)
    stepped_up: int = Field(ge=0)
    held: int = Field(ge=0)


class BenchmarkMethodMetricsResponse(ApiModel):
    true_positives: int = Field(ge=0)
    false_positives: int = Field(ge=0)
    true_negatives: int = Field(ge=0)
    false_negatives: int = Field(ge=0)
    precision: Decimal | None
    recall: Decimal | None
    f1: Decimal | None
    decisions: BenchmarkDecisionCountsResponse


class BenchmarkOperatingPointResponse(ApiModel):
    threshold: int = Field(ge=0, le=100)
    label: str
    positive_definition: str
    isolated_cyber_rule_score: BenchmarkMethodMetricsResponse
    isolated_transaction_rule_score: BenchmarkMethodMetricsResponse
    fused_hybrid_contextual_score: BenchmarkMethodMetricsResponse


class BenchmarkCohortResponse(ApiModel):
    case_count: int = Field(ge=0)
    label_distribution: dict[str, int]
    operating_points: dict[str, BenchmarkOperatingPointResponse]


class BenchmarkSummaryResponse(ApiModel):
    fixture_version: str
    benchmark_name: str
    total_cases: int = Field(ge=0)
    label_distribution: dict[str, int]
    comparator_definitions: dict[str, str]
    operating_points: dict[str, BenchmarkOperatingPointResponse]
    cohorts: dict[str, BenchmarkCohortResponse]
    limitations: list[str]
    context_aware_scenario_statement: str
    disclaimer: str
