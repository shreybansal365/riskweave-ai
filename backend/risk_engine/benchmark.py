from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CyberEventType, RiskLevel
from app.synthetic.identity import deterministic_uuid
from risk_engine.correlation import evaluate_interactions
from risk_engine.fusion import decision_for_score, fuse_scores
from risk_engine.rules import (
    CYBER_BASELINE,
    TRANSACTION_BASELINE,
    CyberRiskEngine,
    TransactionRiskEngine,
)
from risk_engine.types import CyberFeatures, TransactionFeatures

BENCHMARK_DISCLAIMER = (
    "Prototype evaluation on deterministic synthetic data; "
    "not evidence of real-world banking accuracy."
)
BENCHMARK_NAME = "benchmark-v1 — mixed synthetic security benchmark"
CONTEXT_AWARE_SCENARIO_STATEMENT = (
    "RiskWeave demonstrates context-aware avoidance of an unnecessary intervention in the "
    "deterministic legitimate-new-device scenario. Broader false-positive reduction has not "
    "yet been established by benchmark-v1."
)
COMPARATOR_DEFINITIONS = {
    "isolated_cyber_rule_score": (
        "Deterministic cyber rule points without anomaly or transaction context."
    ),
    "isolated_transaction_rule_score": (
        "Deterministic transaction rule points without anomaly or cyber context."
    ),
    "fused_hybrid_contextual_score": (
        "Rounded fused score using both complete streams, capped anomaly support, and eligible "
        "cross-domain interaction bonuses."
    ),
}
BENCHMARK_LIMITATIONS = (
    "No legitimate benchmark-v1 case contains unusual evidence in both domains.",
    "Seven labeled attacks are single-domain cases outside RiskWeave's primary "
    "cross-domain use case.",
    "The isolated rule scores and fused hybrid score are not identically calibrated.",
    "benchmark-v1 does not demonstrate universal false-positive reduction.",
    "The fused method underperforms both isolated rule methods at the 60+ threshold on the "
    "complete mixed fixture.",
    "All results apply only to deterministic synthetic data.",
)


class CyberCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    new_device: bool = False
    first_seen_fingerprint: bool = False
    untrusted_device: bool = False
    failed_mfa: bool = False
    risky_network: bool = False
    unusual_location: bool = False
    impossible_travel: bool = False
    endpoint_alert: bool = False
    unusual_login_hours: Decimal = Decimal("0")
    session_token_anomaly: bool = False


class TransactionCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    beneficiary_known: bool = True
    beneficiary_age_days: Decimal = Decimal("365")
    amount_ratio: Decimal = Decimal("1")
    velocity_ratio: Decimal = Decimal("1")
    destination_risk: RiskLevel = RiskLevel.LOW
    channel_known: bool = True
    historical_deviation_mad: Decimal = Decimal("0")


class BenchmarkCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(min_length=1, max_length=80)
    label: Literal["legitimate", "attack"]
    rationale: str = Field(min_length=1, max_length=500)
    cyber: CyberCase = Field(default_factory=CyberCase)
    transaction: TransactionCase = Field(default_factory=TransactionCase)


@dataclass(frozen=True, slots=True)
class DecisionCounts:
    permitted: int
    monitored: int
    stepped_up: int
    held: int


@dataclass(frozen=True, slots=True)
class MethodMetrics:
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    precision: Decimal | None
    recall: Decimal | None
    f1: Decimal | None
    decisions: DecisionCounts


@dataclass(frozen=True, slots=True)
class OperatingPointReport:
    threshold: int
    label: str
    positive_definition: str
    isolated_cyber_rule_score: MethodMetrics
    isolated_transaction_rule_score: MethodMetrics
    fused_hybrid_contextual_score: MethodMetrics


@dataclass(frozen=True, slots=True)
class CohortReport:
    case_count: int
    label_distribution: dict[str, int]
    operating_points: dict[str, OperatingPointReport]


@dataclass(frozen=True, slots=True)
class _CaseEvaluation:
    positive: bool
    cohort: str
    isolated_cyber_rule_score: int
    isolated_transaction_rule_score: int
    fused_hybrid_contextual_score: int


@dataclass(frozen=True, slots=True)
class BenchmarkReport:
    fixture_version: str
    benchmark_name: str
    total_cases: int
    label_distribution: dict[str, int]
    comparator_definitions: dict[str, str]
    operating_points: dict[str, OperatingPointReport]
    cohorts: dict[str, CohortReport]
    limitations: tuple[str, ...]
    context_aware_scenario_statement: str
    disclaimer: str = BENCHMARK_DISCLAIMER

    def as_dict(self) -> dict[str, object]:
        return asdict(self)

    @property
    def isolated_cyber(self) -> MethodMetrics:
        """Backward-compatible 40+ escalation metric."""

        return self.operating_points["escalation_40"].isolated_cyber_rule_score

    @property
    def isolated_transaction(self) -> MethodMetrics:
        """Backward-compatible 40+ escalation metric."""

        return self.operating_points["escalation_40"].isolated_transaction_rule_score

    @property
    def fused_contextual(self) -> MethodMetrics:
        """Backward-compatible 40+ escalation metric."""

        return self.operating_points["escalation_40"].fused_hybrid_contextual_score


_OPERATING_POINTS = (
    (
        "escalation_40",
        40,
        "40+ escalation or step-up threshold",
        "Elevated, High, or Critical: step-up authentication or a stronger response.",
    ),
    (
        "intervention_60",
        60,
        "60+ operational hold/intervention threshold",
        "High or Critical: the transaction is held for review or a critical incident.",
    ),
    (
        "critical_80",
        80,
        "80+ critical-only threshold",
        "Critical: hold the transaction and open a critical incident.",
    ),
)


def load_benchmark(path: Path) -> tuple[str, tuple[BenchmarkCase, ...]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    fixture_version = str(raw["fixture_version"])
    cases = tuple(BenchmarkCase.model_validate(item) for item in raw["cases"])
    if len(cases) != 48:
        raise ValueError(f"benchmark must contain exactly 48 cases, found {len(cases)}")
    if len({case.case_id for case in cases}) != 48:
        raise ValueError("benchmark case identifiers must be unique")
    distribution = {
        "normal": sum(case.case_id.startswith("normal-") for case in cases),
        "unusual_legitimate": sum(case.case_id.startswith("unusual-legitimate-") for case in cases),
        "attack": sum(case.label == "attack" for case in cases),
    }
    if distribution != {"normal": 18, "unusual_legitimate": 12, "attack": 18}:
        raise ValueError(f"benchmark class distribution is invalid: {distribution}")
    return fixture_version, cases


def evaluate_benchmark(path: Path) -> BenchmarkReport:
    fixture_version, cases = load_benchmark(path)
    cyber_engine = CyberRiskEngine()
    transaction_engine = TransactionRiskEngine()
    evaluations: list[_CaseEvaluation] = []
    for case in cases:
        cyber_features, transaction_features = _features_for_case(case)
        cyber = cyber_engine.evaluate(cyber_features)
        transaction = transaction_engine.evaluate(transaction_features)
        interactions = evaluate_interactions(
            cyber.contributions,
            transaction.contributions,
            transaction_id=transaction_features.transaction_id,
        )
        fused = fuse_scores(cyber.score, transaction.score, interactions.bonus)
        cyber_signal = any(item.code != CYBER_BASELINE for item in cyber.contributions)
        transaction_signal = any(
            item.code != TRANSACTION_BASELINE for item in transaction.contributions
        )
        evaluations.append(
            _CaseEvaluation(
                positive=case.label == "attack",
                cohort=_cohort_for(
                    label=case.label,
                    cyber_signal=cyber_signal,
                    transaction_signal=transaction_signal,
                ),
                isolated_cyber_rule_score=cyber.rule_points,
                isolated_transaction_rule_score=transaction.rule_points,
                fused_hybrid_contextual_score=fused.fused_score,
            )
        )

    operating_points = _operating_point_reports(evaluations)
    cohort_names = (
        "normal_legitimate",
        "legitimate_unusual_cyber",
        "legitimate_unusual_transaction",
        "cross_domain_attacks",
        "cyber_only_attacks",
        "transaction_only_attacks",
    )
    cohorts: dict[str, CohortReport] = {}
    for cohort_name in cohort_names:
        cohort_evaluations = [
            evaluation for evaluation in evaluations if evaluation.cohort == cohort_name
        ]
        cohorts[cohort_name] = CohortReport(
            case_count=len(cohort_evaluations),
            label_distribution={
                "legitimate": sum(not item.positive for item in cohort_evaluations),
                "attack": sum(item.positive for item in cohort_evaluations),
            },
            operating_points=_operating_point_reports(cohort_evaluations),
        )

    return BenchmarkReport(
        fixture_version=fixture_version,
        benchmark_name=BENCHMARK_NAME,
        total_cases=len(cases),
        label_distribution={
            "legitimate": sum(case.label == "legitimate" for case in cases),
            "attack": sum(case.label == "attack" for case in cases),
        },
        comparator_definitions=dict(COMPARATOR_DEFINITIONS),
        operating_points=operating_points,
        cohorts=cohorts,
        limitations=BENCHMARK_LIMITATIONS,
        context_aware_scenario_statement=CONTEXT_AWARE_SCENARIO_STATEMENT,
    )


def _features_for_case(case: BenchmarkCase) -> tuple[CyberFeatures, TransactionFeatures]:
    epoch = datetime(2026, 7, 14, 9, 0, tzinfo=UTC)
    event_types: set[CyberEventType] = set()
    cyber = case.cyber
    mapping = (
        (cyber.new_device, CyberEventType.NEW_DEVICE),
        (cyber.failed_mfa, CyberEventType.MFA_FAILED),
        (cyber.risky_network, CyberEventType.RISKY_IP),
        (cyber.unusual_location, CyberEventType.UNUSUAL_LOCATION),
        (cyber.impossible_travel, CyberEventType.IMPOSSIBLE_TRAVEL),
        (cyber.endpoint_alert, CyberEventType.ENDPOINT_ALERT),
        (cyber.unusual_login_hours > 0, CyberEventType.UNUSUAL_LOGIN_TIME),
        (cyber.session_token_anomaly, CyberEventType.SESSION_TOKEN_ANOMALY),
    )
    for enabled, event_type in mapping:
        if enabled:
            event_types.add(event_type)
    event_ids = {
        event_type: deterministic_uuid("benchmark-event", f"{case.case_id}/{event_type.value}")
        for event_type in event_types
    }
    event_times = {
        event_type: epoch - timedelta(minutes=25 - index)
        for index, event_type in enumerate(sorted(event_types, key=lambda item: item.value))
    }
    deviations: list[str] = []
    if cyber.new_device:
        deviations.append("session started on a device absent from customer history")
    if cyber.first_seen_fingerprint:
        deviations.append("browser fingerprint had not appeared before")
    if cyber.untrusted_device:
        deviations.append("device posture was not trusted")
    if cyber.unusual_login_hours > 0:
        deviations.append("login time was outside the personal baseline")
    if cyber.failed_mfa:
        deviations.append("MFA outcome differed from normal successful authentication")
    if cyber.risky_network:
        deviations.append("network reputation differed from normal sessions")
    if cyber.unusual_location or cyber.impossible_travel:
        deviations.append("location behaviour differed from customer history")
    if cyber.endpoint_alert:
        deviations.append("endpoint posture differed from normal sessions")
    if cyber.session_token_anomaly:
        deviations.append("session-token behaviour differed from normal rotation")

    transaction = case.transaction
    transaction_deviations: list[str] = []
    if not transaction.beneficiary_known:
        transaction_deviations.append("beneficiary was absent from transaction history")
    if transaction.amount_ratio >= 3:
        transaction_deviations.append("amount exceeded the normal transaction range")
    if transaction.velocity_ratio >= 2:
        transaction_deviations.append("transaction velocity exceeded the baseline")
    if transaction.destination_risk != RiskLevel.LOW:
        transaction_deviations.append("destination risk differed from customer history")
    if not transaction.channel_known:
        transaction_deviations.append("channel was absent from normal usage")
    if transaction.historical_deviation_mad >= 3:
        transaction_deviations.append("amount deviated materially from historical dispersion")

    transaction_id = deterministic_uuid("benchmark-transaction", case.case_id)
    baseline_id = deterministic_uuid("benchmark-baseline", case.case_id)
    return (
        CyberFeatures.create(
            event_types=frozenset(event_types),
            event_ids=event_ids,
            event_times=event_times,
            baseline_id=baseline_id,
            device_known=not cyber.new_device,
            fingerprint_known=not cyber.first_seen_fingerprint,
            device_trusted=not cyber.untrusted_device,
            unusual_login_time_hours=cyber.unusual_login_hours,
            location_distance_km=Decimal("2500")
            if cyber.unusual_location or cyber.impossible_travel
            else Decimal("0"),
            anomaly_deviations=tuple(deviations),
        ),
        TransactionFeatures(
            transaction_id=transaction_id,
            baseline_id=baseline_id,
            beneficiary_known=transaction.beneficiary_known,
            beneficiary_age_days=transaction.beneficiary_age_days,
            amount_ratio=transaction.amount_ratio,
            velocity_ratio=transaction.velocity_ratio,
            destination_risk=transaction.destination_risk,
            channel_known=transaction.channel_known,
            historical_deviation_mad=transaction.historical_deviation_mad,
            occurred_at=epoch,
            anomaly_deviations=tuple(transaction_deviations),
        ),
    )


def _cohort_for(
    *,
    label: Literal["legitimate", "attack"],
    cyber_signal: bool,
    transaction_signal: bool,
) -> str:
    if label == "legitimate":
        if cyber_signal and transaction_signal:
            raise ValueError(
                "benchmark-v1 unexpectedly contains a legitimate case with unusual evidence "
                "in both domains"
            )
        if cyber_signal:
            return "legitimate_unusual_cyber"
        if transaction_signal:
            return "legitimate_unusual_transaction"
        return "normal_legitimate"
    if cyber_signal and transaction_signal:
        return "cross_domain_attacks"
    if cyber_signal:
        return "cyber_only_attacks"
    if transaction_signal:
        return "transaction_only_attacks"
    raise ValueError("benchmark-v1 contains an attack without cyber or transaction evidence")


def _operating_point_reports(
    evaluations: list[_CaseEvaluation],
) -> dict[str, OperatingPointReport]:
    reports: dict[str, OperatingPointReport] = {}
    for key, threshold, label, positive_definition in _OPERATING_POINTS:
        reports[key] = OperatingPointReport(
            threshold=threshold,
            label=label,
            positive_definition=positive_definition,
            isolated_cyber_rule_score=_metrics(
                [(item.positive, item.isolated_cyber_rule_score) for item in evaluations],
                threshold=threshold,
            ),
            isolated_transaction_rule_score=_metrics(
                [(item.positive, item.isolated_transaction_rule_score) for item in evaluations],
                threshold=threshold,
            ),
            fused_hybrid_contextual_score=_metrics(
                [(item.positive, item.fused_hybrid_contextual_score) for item in evaluations],
                threshold=threshold,
            ),
        )
    return reports


def _metrics(rows: list[tuple[bool, int]], *, threshold: int) -> MethodMetrics:
    predicted = [(actual, score >= threshold, score) for actual, score in rows]
    tp = sum(actual and decision for actual, decision, _ in predicted)
    fp = sum(not actual and decision for actual, decision, _ in predicted)
    tn = sum(not actual and not decision for actual, decision, _ in predicted)
    fn = sum(actual and not decision for actual, decision, _ in predicted)
    buckets = [decision_for_score(score)[0].value for _, _, score in predicted]
    precision = _ratio(tp, tp + fp)
    recall = _ratio(tp, tp + fn)
    return MethodMetrics(
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        precision=precision,
        recall=recall,
        f1=_f1(tp, fp, fn),
        decisions=DecisionCounts(
            permitted=sum(value == "low" for value in buckets),
            monitored=sum(value == "guarded" for value in buckets),
            stepped_up=sum(value == "elevated" for value in buckets),
            held=sum(value in {"high", "critical"} for value in buckets),
        ),
    )


def _ratio(numerator: int, denominator: int) -> Decimal | None:
    if denominator == 0:
        return None
    return (Decimal(numerator) / Decimal(denominator)).quantize(Decimal("0.0001"))


def _f1(true_positives: int, false_positives: int, false_negatives: int) -> Decimal | None:
    denominator = 2 * true_positives + false_positives + false_negatives
    if denominator == 0 or true_positives == 0:
        return None
    return (Decimal(2 * true_positives) / Decimal(denominator)).quantize(Decimal("0.0001"))
