from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from app.models.enums import RecommendedAction, Severity, TransactionStatus
from risk_engine.types import FusionResult

ENGINE_VERSION = "riskweave-rules-v1"
CYBER_WEIGHT = Decimal("0.45")
TRANSACTION_WEIGHT = Decimal("0.45")
MIN_SCORE = Decimal("0")
MAX_SCORE = Decimal("100")
MAX_CORRELATION_BONUS = 18


def fuse_scores(cyber_score: int, transaction_score: int, correlation_bonus: int) -> FusionResult:
    cyber = min(100, max(0, cyber_score))
    transaction = min(100, max(0, transaction_score))
    bonus = min(MAX_CORRELATION_BONUS, max(0, correlation_bonus))
    raw = CYBER_WEIGHT * Decimal(cyber) + TRANSACTION_WEIGHT * Decimal(transaction) + Decimal(bonus)
    clamped = min(MAX_SCORE, max(MIN_SCORE, raw))
    rounded = int(clamped.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    severity, action, transaction_status = decision_for_score(rounded)
    return FusionResult(
        cyber_score=cyber,
        transaction_score=transaction,
        correlation_bonus=bonus,
        raw_fused_score=clamped,
        fused_score=rounded,
        severity=severity,
        recommended_action=action,
        transaction_status=transaction_status,
    )


def decision_for_score(
    score: int,
) -> tuple[Severity, RecommendedAction, TransactionStatus]:
    if score <= 19:
        return Severity.LOW, RecommendedAction.ALLOW, TransactionStatus.PERMITTED
    if score <= 39:
        return (
            Severity.GUARDED,
            RecommendedAction.ALLOW_AND_MONITOR,
            TransactionStatus.PERMITTED,
        )
    if score <= 59:
        return (
            Severity.ELEVATED,
            RecommendedAction.STEP_UP_AUTHENTICATION,
            TransactionStatus.PENDING,
        )
    if score <= 79:
        return Severity.HIGH, RecommendedAction.HOLD_FOR_REVIEW, TransactionStatus.HELD
    return (
        Severity.CRITICAL,
        RecommendedAction.HOLD_AND_OPEN_CRITICAL_INCIDENT,
        TransactionStatus.HELD,
    )
