from __future__ import annotations

import hashlib
from decimal import Decimal
from pathlib import Path

from risk_engine.benchmark import (
    BENCHMARK_DISCLAIMER,
    BENCHMARK_NAME,
    COMPARATOR_DEFINITIONS,
    CONTEXT_AWARE_SCENARIO_STATEMENT,
    evaluate_benchmark,
    load_benchmark,
)

FIXTURE = Path(__file__).resolve().parents[1] / "data" / "benchmark" / "cases.json"


def test_benchmark_fixture_is_reviewable_locked_and_has_approved_distribution() -> None:
    fixture_version, cases = load_benchmark(FIXTURE)
    assert fixture_version == "benchmark-v1"
    assert len(cases) == 48
    assert sum(case.case_id.startswith("normal-") for case in cases) == 18
    assert sum(case.case_id.startswith("unusual-legitimate-") for case in cases) == 12
    assert sum(case.label == "attack" for case in cases) == 18
    assert all(case.rationale for case in cases)
    assert hashlib.sha256(FIXTURE.read_bytes()).hexdigest() == (
        "4f336593b6ab9dd5dd5adc311b4cdf508428b67f34f357e1ccb50a5f86a85ecf"
    )


def test_benchmark_is_calculated_repeatable_and_reconciles() -> None:
    first = evaluate_benchmark(FIXTURE)
    second = evaluate_benchmark(FIXTURE)
    assert first == second
    assert first.disclaimer == BENCHMARK_DISCLAIMER
    assert first.benchmark_name == BENCHMARK_NAME
    assert first.comparator_definitions == COMPARATOR_DEFINITIONS
    assert first.context_aware_scenario_statement == CONTEXT_AWARE_SCENARIO_STATEMENT
    assert first.total_cases == 48
    assert first.label_distribution == {"legitimate": 30, "attack": 18}
    assert set(first.operating_points) == {
        "escalation_40",
        "intervention_60",
        "critical_80",
    }
    assert {key: report.threshold for key, report in first.operating_points.items()} == {
        "escalation_40": 40,
        "intervention_60": 60,
        "critical_80": 80,
    }
    for report in first.operating_points.values():
        for metrics in (
            report.isolated_cyber_rule_score,
            report.isolated_transaction_rule_score,
            report.fused_hybrid_contextual_score,
        ):
            assert (
                metrics.true_positives
                + metrics.false_positives
                + metrics.true_negatives
                + metrics.false_negatives
                == 48
            )
            assert (
                metrics.decisions.permitted
                + metrics.decisions.monitored
                + metrics.decisions.stepped_up
                + metrics.decisions.held
                == 48
            )
            assert metrics.precision is None or 0 <= metrics.precision <= 1
            assert metrics.recall is None or 0 <= metrics.recall <= 1
            assert metrics.f1 is None or 0 <= metrics.f1 <= 1


def test_benchmark_reports_exact_unfavorable_results_and_cohorts() -> None:
    report = evaluate_benchmark(FIXTURE)

    expected = {
        "escalation_40": ((10, 0, 30, 8), (10, 0, 30, 8), (8, 0, 30, 10)),
        "intervention_60": ((8, 0, 30, 10), (8, 0, 30, 10), (6, 0, 30, 12)),
        "critical_80": ((0, 0, 30, 18), (0, 0, 30, 18), (6, 0, 30, 12)),
    }
    for key, expected_methods in expected.items():
        point = report.operating_points[key]
        methods = (
            point.isolated_cyber_rule_score,
            point.isolated_transaction_rule_score,
            point.fused_hybrid_contextual_score,
        )
        assert (
            tuple(
                (
                    metrics.true_positives,
                    metrics.false_positives,
                    metrics.true_negatives,
                    metrics.false_negatives,
                )
                for metrics in methods
            )
            == expected_methods
        )

    assert {name: cohort.case_count for name, cohort in report.cohorts.items()} == {
        "normal_legitimate": 7,
        "legitimate_unusual_cyber": 13,
        "legitimate_unusual_transaction": 10,
        "cross_domain_attacks": 11,
        "cyber_only_attacks": 3,
        "transaction_only_attacks": 4,
    }
    intervention = report.operating_points["intervention_60"]
    assert intervention.isolated_cyber_rule_score.f1 == Decimal("0.6154")
    assert intervention.isolated_transaction_rule_score.f1 == Decimal("0.6154")
    assert intervention.fused_hybrid_contextual_score.f1 == Decimal("0.5000")
    assert len(report.limitations) == 6
    assert any("underperforms" in limitation for limitation in report.limitations)
