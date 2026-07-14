from __future__ import annotations

from app.models.enums import ContributionCategory, RecommendedAction
from risk_engine.types import Contribution, ExplanationBundle, FusionResult

_ACTION_EXPLANATIONS = {
    RecommendedAction.ALLOW: (
        "Permit the transaction because the combined context remains low risk."
    ),
    RecommendedAction.ALLOW_AND_MONITOR: (
        "Permit the transaction and retain the incident for monitoring; "
        "no hold or step-up is required."
    ),
    RecommendedAction.STEP_UP_AUTHENTICATION: (
        "Keep the transaction pending until the customer completes additional verification."
    ),
    RecommendedAction.HOLD_FOR_REVIEW: (
        "Hold the transaction while an analyst reviews the correlated evidence."
    ),
    RecommendedAction.HOLD_AND_OPEN_CRITICAL_INCIDENT: (
        "Hold the transaction and open a critical incident for immediate analyst investigation."
    ),
}


def build_explanation(
    fusion: FusionResult,
    contributions: tuple[Contribution, ...],
) -> ExplanationBundle:
    cyber_count = sum(
        item.category in {ContributionCategory.CYBER_RULE, ContributionCategory.CYBER_ANOMALY}
        for item in contributions
    )
    transaction_count = sum(
        item.category
        in {ContributionCategory.TRANSACTION_RULE, ContributionCategory.TRANSACTION_ANOMALY}
        for item in contributions
    )
    correlation_count = sum(
        item.category == ContributionCategory.CORRELATION for item in contributions
    )
    summary = (
        f"{fusion.severity.value.replace('_', ' ').title()} contextual risk from "
        f"{cyber_count} cyber, {transaction_count} transaction, and "
        f"{correlation_count} cross-domain contributions."
    )

    ordered = sorted(
        contributions,
        key=lambda item: (
            item.occurred_at is None,
            item.occurred_at.isoformat() if item.occurred_at else "",
            item.category.value,
            item.code,
        ),
    )
    narrative = tuple(
        {
            "timestamp": item.occurred_at.isoformat() if item.occurred_at else "derived",
            "category": item.category.value,
            "code": item.code,
            "label": item.label,
            "points": item.points,
            "explanation": item.explanation,
        }
        for item in ordered
    )
    decision = (
        f"Backend fusion used 0.45 x {fusion.cyber_score} cyber + 0.45 x "
        f"{fusion.transaction_score} transaction + {fusion.correlation_bonus} correlation = "
        f"{fusion.raw_fused_score}; ROUND_HALF_UP produced {fusion.fused_score}."
    )
    return ExplanationBundle(
        summary=summary,
        signal_narrative=narrative,
        decision_explanation=decision,
        action_explanation=_ACTION_EXPLANATIONS[fusion.recommended_action],
    )
