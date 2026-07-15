from __future__ import annotations

from collections.abc import Sequence
from typing import Literal
from uuid import UUID

from app.models.domain import RiskContribution
from app.models.enums import ContributionCategory
from app.schemas.incidents import (
    InteractionComponentSourceResponse,
    InteractionSourcePairResponse,
)
from risk_engine.correlation import INTERACTION_COMPONENT_CODES

_CYBER_CATEGORIES = {
    ContributionCategory.CYBER_RULE,
    ContributionCategory.CYBER_ANOMALY,
}
_TRANSACTION_CATEGORIES = {
    ContributionCategory.TRANSACTION_RULE,
    ContributionCategory.TRANSACTION_ANOMALY,
}


class IncidentProvenanceError(RuntimeError):
    """Raised when persisted interaction sources cannot be paired without guessing."""


def project_interaction_source_pairs(
    contributions: Sequence[RiskContribution],
) -> list[InteractionSourcePairResponse]:
    """Project deterministic component pairs from persisted contribution references.

    Documented fraud interactions use the backend-owned component-code contract. Historical
    background interactions predate that rule catalog and are accepted only when their persisted
    event and transaction references each identify exactly one stream contribution.
    """

    by_code = {item.code: item for item in contributions}
    interactions = sorted(
        (item for item in contributions if item.category == ContributionCategory.CORRELATION),
        key=lambda item: (item.display_order, str(item.contribution_id)),
    )
    pairs: list[InteractionSourcePairResponse] = []
    for interaction in interactions:
        configured_codes = INTERACTION_COMPONENT_CODES.get(interaction.code)
        if configured_codes is not None:
            cyber = by_code.get(configured_codes[0])
            transaction = by_code.get(configured_codes[1])
            if cyber is None or transaction is None:
                raise IncidentProvenanceError(
                    f"interaction {interaction.code} is missing a configured component"
                )
        else:
            cyber = _unique_source_match(
                contributions,
                categories=_CYBER_CATEGORIES,
                source_kind="event",
                source_id=interaction.source_event_id,
                interaction_code=interaction.code,
            )
            transaction = _unique_source_match(
                contributions,
                categories=_TRANSACTION_CATEGORIES,
                source_kind="transaction",
                source_id=interaction.source_transaction_id,
                interaction_code=interaction.code,
            )

        _validate_pair(interaction, cyber, transaction)
        assert interaction.source_event_id is not None
        assert interaction.source_transaction_id is not None
        pairs.append(
            InteractionSourcePairResponse(
                interaction_contribution_id=interaction.contribution_id,
                interaction_rule_code=interaction.code,
                display_order=interaction.display_order,
                interaction_source_event_id=interaction.source_event_id,
                interaction_source_transaction_id=interaction.source_transaction_id,
                interaction_source_baseline_id=interaction.source_baseline_id,
                cyber_component=_component_source(cyber),
                transaction_component=_component_source(transaction),
            )
        )
    return pairs


def _unique_source_match(
    contributions: Sequence[RiskContribution],
    *,
    categories: set[ContributionCategory],
    source_kind: Literal["event", "transaction"],
    source_id: UUID | None,
    interaction_code: str,
) -> RiskContribution:
    if source_id is None:
        raise IncidentProvenanceError(
            f"interaction {interaction_code} has no persisted {source_kind} source"
        )
    matches = [
        item
        for item in contributions
        if item.category in categories
        and (
            item.source_event_id == source_id
            if source_kind == "event"
            else item.source_transaction_id == source_id
        )
    ]
    if len(matches) != 1:
        raise IncidentProvenanceError(
            f"interaction {interaction_code} has {len(matches)} persisted {source_kind} matches"
        )
    return matches[0]


def _validate_pair(
    interaction: RiskContribution,
    cyber: RiskContribution,
    transaction: RiskContribution,
) -> None:
    if cyber.category not in _CYBER_CATEGORIES:
        raise IncidentProvenanceError(
            f"interaction {interaction.code} references a non-cyber component"
        )
    if transaction.category not in _TRANSACTION_CATEGORIES:
        raise IncidentProvenanceError(
            f"interaction {interaction.code} references a non-transaction component"
        )
    if interaction.source_event_id is None or cyber.source_event_id != interaction.source_event_id:
        raise IncidentProvenanceError(
            f"interaction {interaction.code} has inconsistent cyber source provenance"
        )
    if (
        interaction.source_transaction_id is None
        or transaction.source_transaction_id != interaction.source_transaction_id
    ):
        raise IncidentProvenanceError(
            f"interaction {interaction.code} has inconsistent transaction source provenance"
        )
    if (
        interaction.source_baseline_id is not None
        and transaction.source_baseline_id != interaction.source_baseline_id
    ):
        raise IncidentProvenanceError(
            f"interaction {interaction.code} has inconsistent baseline provenance"
        )


def _component_source(item: RiskContribution) -> InteractionComponentSourceResponse:
    return InteractionComponentSourceResponse(
        contribution_id=item.contribution_id,
        category=item.category,
        rule_code=item.code,
        label=item.label,
        source_event_id=item.source_event_id,
        source_transaction_id=item.source_transaction_id,
        source_baseline_id=item.source_baseline_id,
    )
