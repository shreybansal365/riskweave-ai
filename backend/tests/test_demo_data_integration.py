from __future__ import annotations

from datetime import UTC
from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.db.session import SessionFactory
from app.models.domain import (
    BehaviourBaseline,
    CryptoAsset,
    CyberEvent,
    ScenarioRun,
    Transaction,
    TransactionChannel,
)
from app.models.enums import ScenarioRunStatus
from app.services.demo_data import (
    EXPECTED_BASELINE_COUNTS,
    SIMULATION_EPOCH,
    WINDOW_START,
    DemoDataService,
    ForcedResetFailure,
    baseline_counts,
    dataset_fingerprint,
)
from app.synthetic.identity import deterministic_uuid


@pytest.mark.integration
def test_reset_generates_exact_deterministic_14_day_baseline(
    postgres_session_factory: SessionFactory,
) -> None:
    service = DemoDataService(postgres_session_factory)
    first = service.reset(request_id="integration-reset-first")
    second = service.reset(request_id="integration-reset-second")
    assert first.counts == second.counts == EXPECTED_BASELINE_COUNTS
    assert first.fingerprint == second.fingerprint
    assert first.elapsed_seconds < 5
    assert second.elapsed_seconds < 5

    with postgres_session_factory() as session:
        assert baseline_counts(session) == EXPECTED_BASELINE_COUNTS
        minimum_transaction_time = session.scalar(select(func.min(Transaction.created_at)))
        maximum_transaction_time = session.scalar(select(func.max(Transaction.created_at)))
        minimum_event_time = session.scalar(select(func.min(CyberEvent.event_time)))
        maximum_event_time = session.scalar(select(func.max(CyberEvent.event_time)))
        assert minimum_transaction_time is not None
        assert maximum_transaction_time is not None
        assert minimum_event_time is not None
        assert maximum_event_time is not None
        assert minimum_transaction_time >= WINDOW_START
        assert maximum_transaction_time < SIMULATION_EPOCH
        assert minimum_event_time >= WINDOW_START
        assert maximum_event_time < SIMULATION_EPOCH
        baselines = session.scalars(
            select(BehaviourBaseline).order_by(BehaviourBaseline.customer_id)
        ).all()
        assert len(baselines) == 12
        assert all(item.sample_started_at == WINDOW_START for item in baselines)
        assert all(item.sample_ended_at == SIMULATION_EPOCH for item in baselines)
        assert all(item.known_device_ids for item in baselines)
        assert all(item.known_beneficiary_ids for item in baselines)
        assert all(item.known_channels for item in baselines)
        assert all(item.typical_transaction_velocity_30m >= Decimal("1") for item in baselines)
        assert all(item.updated_at.tzinfo == UTC for item in baselines)


@pytest.mark.integration
def test_uuid_stability_channel_crypto_linkage_and_scenario_seed_state(
    postgres_session_factory: SessionFactory,
) -> None:
    DemoDataService(postgres_session_factory).reset(request_id="integration-linkage-reset")
    with postgres_session_factory() as session:
        expected_customer_id = deterministic_uuid("customer", "customer-01")
        transaction_ids = set(session.scalars(select(Transaction.transaction_id)))
        assert deterministic_uuid("transaction", "background-000") in transaction_ids
        assert (
            session.get(
                BehaviourBaseline,
                deterministic_uuid("behaviour-baseline", str(expected_customer_id)),
            )
            is not None
        )

        channels = session.scalars(select(TransactionChannel)).all()
        assert len(channels) == 2
        assert all(channel.crypto_asset_id is not None for channel in channels)
        assert all(isinstance(channel.crypto_asset, CryptoAsset) for channel in channels)
        assert {channel.crypto_asset.pqc_ready for channel in channels} == {False, True}

        scenario_runs = session.scalars(select(ScenarioRun)).all()
        assert len(scenario_runs) == 3
        assert all(item.status == ScenarioRunStatus.NOT_RUN for item in scenario_runs)
        assert all(item.seed == 26026 for item in scenario_runs)
        assert all(item.simulation_epoch == SIMULATION_EPOCH for item in scenario_runs)


@pytest.mark.integration
def test_forced_reset_failure_rolls_back_without_partial_state(
    postgres_session_factory: SessionFactory,
) -> None:
    service = DemoDataService(postgres_session_factory)
    baseline = service.reset(request_id="integration-rollback-baseline")
    with pytest.raises(ForcedResetFailure):
        service.reset(request_id="integration-rollback-failure", fail_after_delete=True)

    with postgres_session_factory() as session:
        assert baseline_counts(session) == EXPECTED_BASELINE_COUNTS
        assert dataset_fingerprint(session) == baseline.fingerprint
