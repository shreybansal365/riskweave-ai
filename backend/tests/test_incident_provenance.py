from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from app.models.domain import RiskContribution
from app.models.enums import ContributionCategory
from app.services.incident_provenance import (
    IncidentProvenanceError,
    project_interaction_source_pairs,
)
from risk_engine.correlation import INTERACTION_COMPONENT_CODES


@pytest.mark.parametrize(
    ("interaction_code", "cyber_code", "transaction_code"),
    [
        (interaction_code, component_codes[0], component_codes[1])
        for interaction_code, component_codes in INTERACTION_COMPONENT_CODES.items()
    ],
)
def test_all_documented_interactions_project_exact_persisted_component_pairs(
    interaction_code: str,
    cyber_code: str,
    transaction_code: str,
) -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    baseline_id = uuid4()
    cyber = _contribution(
        category=ContributionCategory.CYBER_RULE,
        code=cyber_code,
        source_event_id=event_id,
        source_baseline_id=baseline_id,
        display_order=1,
    )
    transaction = _contribution(
        category=ContributionCategory.TRANSACTION_RULE,
        code=transaction_code,
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=2,
    )
    interaction = _contribution(
        category=ContributionCategory.CORRELATION,
        code=interaction_code,
        source_event_id=event_id,
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=3,
    )

    pairs = project_interaction_source_pairs([transaction, interaction, cyber])

    assert len(pairs) == 1
    pair = pairs[0]
    assert pair.interaction_contribution_id == interaction.contribution_id
    assert pair.interaction_rule_code == interaction_code
    assert pair.interaction_source_event_id == event_id
    assert pair.interaction_source_transaction_id == transaction_id
    assert pair.interaction_source_baseline_id == baseline_id
    assert pair.cyber_component.contribution_id == cyber.contribution_id
    assert pair.cyber_component.rule_code == cyber_code
    assert pair.cyber_component.source_event_id == event_id
    assert pair.transaction_component.contribution_id == transaction.contribution_id
    assert pair.transaction_component.rule_code == transaction_code
    assert pair.transaction_component.source_transaction_id == transaction_id


def test_pairing_uses_rule_code_when_transaction_contributions_share_one_transaction() -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    baseline_id = uuid4()
    cyber = _contribution(
        category=ContributionCategory.CYBER_RULE,
        code="cyber.failed_mfa",
        source_event_id=event_id,
        source_baseline_id=baseline_id,
        display_order=1,
    )
    expected = _contribution(
        category=ContributionCategory.TRANSACTION_RULE,
        code="transaction.high_amount",
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=2,
    )
    decoy = _contribution(
        category=ContributionCategory.TRANSACTION_RULE,
        code="transaction.velocity_spike",
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=3,
    )
    interaction = _contribution(
        category=ContributionCategory.CORRELATION,
        code="correlation.failed_mfa_high_amount",
        source_event_id=event_id,
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=4,
    )

    pair = project_interaction_source_pairs([decoy, interaction, expected, cyber])[0]

    assert pair.transaction_component.contribution_id == expected.contribution_id
    assert pair.transaction_component.contribution_id != decoy.contribution_id


def test_zero_interactions_project_an_explicit_empty_pair_list() -> None:
    assert project_interaction_source_pairs([]) == []


def test_historical_interaction_projects_only_from_unique_persisted_sources() -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    cyber = _contribution(
        category=ContributionCategory.CYBER_RULE,
        code="background.cyber_context.00",
        source_event_id=event_id,
        display_order=1,
    )
    transaction = _contribution(
        category=ContributionCategory.TRANSACTION_RULE,
        code="background.transaction_context.00",
        source_transaction_id=transaction_id,
        display_order=2,
    )
    interaction = _contribution(
        category=ContributionCategory.CORRELATION,
        code="background.correlation_context.00",
        source_event_id=event_id,
        source_transaction_id=transaction_id,
        display_order=3,
    )

    pair = project_interaction_source_pairs([transaction, interaction, cyber])[0]

    assert pair.interaction_contribution_id == interaction.contribution_id
    assert pair.cyber_component.contribution_id == cyber.contribution_id
    assert pair.transaction_component.contribution_id == transaction.contribution_id


def test_pairs_are_ordered_by_persisted_interaction_order() -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    baseline_id = uuid4()
    components = [
        _contribution(
            category=ContributionCategory.CYBER_RULE,
            code="cyber.new_device",
            source_event_id=event_id,
            source_baseline_id=baseline_id,
            display_order=1,
        ),
        _contribution(
            category=ContributionCategory.CYBER_RULE,
            code="cyber.failed_mfa",
            source_event_id=event_id,
            source_baseline_id=baseline_id,
            display_order=2,
        ),
        _contribution(
            category=ContributionCategory.TRANSACTION_RULE,
            code="transaction.new_beneficiary",
            source_transaction_id=transaction_id,
            source_baseline_id=baseline_id,
            display_order=3,
        ),
        _contribution(
            category=ContributionCategory.TRANSACTION_RULE,
            code="transaction.high_amount",
            source_transaction_id=transaction_id,
            source_baseline_id=baseline_id,
            display_order=4,
        ),
    ]
    later = _contribution(
        category=ContributionCategory.CORRELATION,
        code="correlation.failed_mfa_high_amount",
        source_event_id=event_id,
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=11,
    )
    earlier = _contribution(
        category=ContributionCategory.CORRELATION,
        code="correlation.new_device_new_beneficiary",
        source_event_id=event_id,
        source_transaction_id=transaction_id,
        source_baseline_id=baseline_id,
        display_order=10,
    )

    pairs = project_interaction_source_pairs([later, *components, earlier])

    assert [item.interaction_rule_code for item in pairs] == [
        "correlation.new_device_new_beneficiary",
        "correlation.failed_mfa_high_amount",
    ]


@pytest.mark.parametrize("malformation", ["missing_event", "mismatched_event", "ambiguous"])
def test_malformed_source_references_fail_without_inventing_a_pair(malformation: str) -> None:
    event_id = uuid4()
    transaction_id = uuid4()
    cyber = _contribution(
        category=ContributionCategory.CYBER_RULE,
        code="background.cyber_context.00",
        source_event_id=event_id,
        display_order=1,
    )
    transaction = _contribution(
        category=ContributionCategory.TRANSACTION_RULE,
        code="background.transaction_context.00",
        source_transaction_id=transaction_id,
        display_order=2,
    )
    interaction = _contribution(
        category=ContributionCategory.CORRELATION,
        code="background.correlation_context.00",
        source_event_id=None if malformation == "missing_event" else event_id,
        source_transaction_id=transaction_id,
        display_order=3,
    )
    contributions = [cyber, transaction, interaction]
    if malformation == "mismatched_event":
        interaction.source_event_id = uuid4()
    if malformation == "ambiguous":
        contributions.append(
            _contribution(
                category=ContributionCategory.TRANSACTION_RULE,
                code="background.transaction_context.duplicate",
                source_transaction_id=transaction_id,
                display_order=4,
            )
        )

    with pytest.raises(IncidentProvenanceError):
        project_interaction_source_pairs(contributions)


def _contribution(
    *,
    category: ContributionCategory,
    code: str,
    source_event_id: UUID | None = None,
    source_transaction_id: UUID | None = None,
    source_baseline_id: UUID | None = None,
    display_order: int,
) -> RiskContribution:
    return RiskContribution(
        contribution_id=uuid4(),
        incident_id=uuid4(),
        category=category,
        code=code,
        label=code,
        points=1,
        explanation="Persisted synthetic provenance fixture.",
        source_event_id=source_event_id,
        source_transaction_id=source_transaction_id,
        source_baseline_id=source_baseline_id,
        display_order=display_order,
    )
