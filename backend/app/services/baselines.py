from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from statistics import median
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.domain import (
    BehaviourBaseline,
    Beneficiary,
    Customer,
    Device,
    Transaction,
    TransactionChannel,
)
from app.models.domain import (
    Session as BankingSession,
)

BASELINE_VERSION = "baseline-v1"


def generate_behavioural_baselines(
    session: Session,
    *,
    window_start: datetime,
    window_end: datetime,
) -> tuple[BehaviourBaseline, ...]:
    """Derive explainable customer baselines from persisted synthetic history."""

    session.execute(delete(BehaviourBaseline))
    channels = {
        channel.channel_id: channel.channel_code.value
        for channel in session.scalars(select(TransactionChannel))
    }
    beneficiaries = {
        beneficiary.beneficiary_id: beneficiary
        for beneficiary in session.scalars(select(Beneficiary))
    }
    results: list[BehaviourBaseline] = []
    customers = session.scalars(select(Customer).order_by(Customer.customer_id)).all()
    for customer in customers:
        sessions = session.scalars(
            select(BankingSession)
            .where(
                BankingSession.customer_id == customer.customer_id,
                BankingSession.started_at >= window_start,
                BankingSession.started_at < window_end,
            )
            .order_by(BankingSession.started_at, BankingSession.session_id)
        ).all()
        transactions = session.scalars(
            select(Transaction)
            .where(
                Transaction.customer_id == customer.customer_id,
                Transaction.created_at >= window_start,
                Transaction.created_at < window_end,
            )
            .order_by(Transaction.created_at, Transaction.transaction_id)
        ).all()
        devices = session.scalars(
            select(Device)
            .where(Device.customer_id == customer.customer_id)
            .order_by(Device.device_id)
        ).all()
        if not sessions or not transactions:
            raise ValueError(f"customer {customer.customer_id} lacks baseline history")

        amounts = [transaction.amount_minor for transaction in transactions]
        median_amount = int(median(amounts))
        deviations = [abs(amount - median_amount) for amount in amounts]
        mad = int(median(deviations))
        login_hours = [item.started_at.hour for item in sessions]
        city_counts = Counter(item.city for item in sessions)
        usual_cities = [
            city for city, _ in sorted(city_counts.items(), key=lambda item: (-item[1], item[0]))
        ][:3]
        known_beneficiaries = sorted({item.beneficiary_id for item in transactions}, key=str)
        beneficiary_ages = [
            Decimal((item.created_at - beneficiaries[item.beneficiary_id].created_at).days)
            for item in transactions
        ]
        velocity_counts = _rolling_counts(transactions, timedelta(minutes=30))

        baseline = BehaviourBaseline(
            baseline_id=_baseline_id(customer.customer_id),
            customer_id=customer.customer_id,
            sample_started_at=window_start,
            sample_ended_at=window_end,
            typical_login_start_hour=min(login_hours),
            typical_login_end_hour=max(login_hours),
            usual_cities=usual_cities,
            known_channels=sorted({channels[item.channel_id] for item in transactions}),
            known_device_ids=[item.device_id for item in devices],
            known_beneficiary_ids=known_beneficiaries,
            usual_destination_risks=sorted({item.destination_risk.value for item in transactions}),
            median_transaction_amount_minor=median_amount,
            transaction_amount_mad_minor=mad,
            average_daily_transaction_count=_two_places(Decimal(len(transactions)) / Decimal("14")),
            typical_beneficiary_age_days=_two_places(
                sum(beneficiary_ages, Decimal("0")) / Decimal(len(beneficiary_ages))
            ),
            typical_transaction_velocity_30m=_two_places(
                Decimal(sum(velocity_counts)) / Decimal(len(velocity_counts))
            ),
            model_version=BASELINE_VERSION,
            updated_at=window_end,
        )
        session.add(baseline)
        results.append(baseline)
    session.flush()
    return tuple(results)


def _rolling_counts(
    transactions: Sequence[Transaction],
    window: timedelta,
) -> list[int]:
    counts: list[int] = []
    for index, transaction in enumerate(transactions):
        start = transaction.created_at - window
        counts.append(
            sum(
                start <= earlier.created_at <= transaction.created_at
                for earlier in transactions[: index + 1]
            )
        )
    return counts


def _two_places(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _baseline_id(customer_id: UUID) -> UUID:
    from app.synthetic.identity import deterministic_uuid

    return deterministic_uuid("behaviour-baseline", str(customer_id))
