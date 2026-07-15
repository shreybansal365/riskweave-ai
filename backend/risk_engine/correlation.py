from __future__ import annotations

from collections.abc import Mapping
from datetime import timedelta
from types import MappingProxyType
from uuid import UUID

from app.models.enums import ContributionCategory
from risk_engine.rules import (
    CYBER_ENDPOINT_ALERT,
    CYBER_FAILED_MFA,
    CYBER_IMPOSSIBLE_TRAVEL,
    CYBER_NEW_DEVICE,
    CYBER_RISKY_NETWORK,
    TRANSACTION_HIGH_AMOUNT,
    TRANSACTION_NEW_BENEFICIARY,
    TRANSACTION_VELOCITY_SPIKE,
)
from risk_engine.types import (
    Contribution,
    CorrelatableEvent,
    InteractionResult,
    TransactionCorrelationContext,
)

CORRELATION_WINDOW = timedelta(minutes=30)
MAX_CORRELATION_BONUS = 18

# Backend-owned component semantics for every documented interaction rule. The
# incident projection reuses this exact contract so browsers never need to know
# which fraud-rule contributions form an interaction.
INTERACTION_COMPONENT_CODES: Mapping[str, tuple[str, str]] = MappingProxyType(
    {
        "correlation.new_device_new_beneficiary": (
            CYBER_NEW_DEVICE,
            TRANSACTION_NEW_BENEFICIARY,
        ),
        "correlation.failed_mfa_high_amount": (
            CYBER_FAILED_MFA,
            TRANSACTION_HIGH_AMOUNT,
        ),
        "correlation.endpoint_velocity_spike": (
            CYBER_ENDPOINT_ALERT,
            TRANSACTION_VELOCITY_SPIKE,
        ),
        "correlation.risky_network_new_beneficiary": (
            CYBER_RISKY_NETWORK,
            TRANSACTION_NEW_BENEFICIARY,
        ),
        "correlation.impossible_travel_high_amount": (
            CYBER_IMPOSSIBLE_TRAVEL,
            TRANSACTION_HIGH_AMOUNT,
        ),
    }
)


def correlate_events(
    transaction: TransactionCorrelationContext,
    events: tuple[CorrelatableEvent, ...],
) -> tuple[CorrelatableEvent, ...]:
    """Return only identity-matched events inside the inclusive lookback window."""

    window_start = transaction.transaction_time - CORRELATION_WINDOW
    eligible = (
        event
        for event in events
        if window_start <= event.event_time <= transaction.transaction_time
        and event.customer_id == transaction.customer_id
        and event.account_id == transaction.account_id
        and event.session_id == transaction.session_id
        and (
            event.device_id is None
            or transaction.device_id is None
            or event.device_id == transaction.device_id
        )
    )
    return tuple(
        sorted(
            eligible,
            key=lambda item: (item.event_time, item.event_type.value, str(item.event_id)),
        )
    )


def evaluate_interactions(
    cyber: tuple[Contribution, ...],
    transaction: tuple[Contribution, ...],
    *,
    transaction_id: UUID | None,
) -> InteractionResult:
    """Apply documented cross-domain interactions without outcome-oriented bonuses."""

    cyber_by_code = {item.code: item for item in cyber}
    transaction_by_code = {item.code: item for item in transaction}
    candidates: list[Contribution] = []

    def add(
        *,
        code: str,
        label: str,
        points: int,
        explanation: str,
    ) -> None:
        cyber_code, transaction_code = INTERACTION_COMPONENT_CODES[code]
        cyber_signal = cyber_by_code.get(cyber_code)
        transaction_signal = transaction_by_code.get(transaction_code)
        if cyber_signal is None or transaction_signal is None:
            return
        candidates.append(
            Contribution(
                category=ContributionCategory.CORRELATION,
                code=code,
                label=label,
                points=points,
                explanation=explanation,
                source_event_id=cyber_signal.source_event_id,
                source_transaction_id=transaction_id,
                source_baseline_id=transaction_signal.source_baseline_id,
                occurred_at=transaction_signal.occurred_at,
            )
        )

    add(
        code="correlation.new_device_new_beneficiary",
        label="New device and new beneficiary",
        points=6,
        explanation=(
            "A new customer device was followed by a transfer to a newly created beneficiary."
        ),
    )
    add(
        code="correlation.failed_mfa_high_amount",
        label="Failed MFA and high amount",
        points=6,
        explanation=(
            "Failed MFA preceded a transfer at least five times the customer's median amount."
        ),
    )
    add(
        code="correlation.endpoint_velocity_spike",
        label="Endpoint alert and velocity spike",
        points=6,
        explanation="A compromised-device alert coincided with sharply elevated transfer velocity.",
    )

    # This weaker beneficiary interaction is suppressed when the stronger new-device pairing exists.
    if not any(item.code == "correlation.new_device_new_beneficiary" for item in candidates):
        add(
            code="correlation.risky_network_new_beneficiary",
            label="Risky network and new beneficiary",
            points=4,
            explanation=(
                "A risky network source preceded a transfer to a newly created beneficiary."
            ),
        )

    add(
        code="correlation.impossible_travel_high_amount",
        label="Impossible travel and high amount",
        points=6,
        explanation="An impossible-travel event preceded a transfer at least five times normal.",
    )

    accepted: list[Contribution] = []
    total = 0
    for candidate in candidates:
        if total + candidate.points > MAX_CORRELATION_BONUS:
            continue
        accepted.append(candidate)
        total += candidate.points
    return InteractionResult(bonus=total, contributions=tuple(accepted))
