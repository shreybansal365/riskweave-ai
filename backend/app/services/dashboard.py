from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.domain import (
    BehaviourBaseline,
    CyberEvent,
    Incident,
    Transaction,
    TransactionChannel,
)
from app.models.enums import IncidentStatus, Severity, TransactionStatus
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    DashboardTrendPointResponse,
    DashboardTrendsResponse,
    SeverityCountsResponse,
    SourceHealthResponse,
    TransactionActionCountsResponse,
)
from app.services.demo_data import SIMULATION_EPOCH, WINDOW_START

SYNTHETIC_NOTICE = (
    "Metrics are calculated from persisted deterministic synthetic prototype records."
)


class DashboardService:
    """Aggregate persisted records; never manufacture frontend metric values."""

    def summary(self, session: Session) -> DashboardSummaryResponse:
        incidents = session.scalars(select(Incident)).all()
        severity_counts = Counter(item.severity.value for item in incidents)
        held = session.scalar(
            select(func.count(Transaction.transaction_id)).where(
                Transaction.status == TransactionStatus.HELD
            )
        )
        legitimate_unusual = session.scalar(
            select(func.count(Incident.incident_id))
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .where(
                Transaction.status == TransactionStatus.PERMITTED,
                Incident.fused_score < 40,
                or_(Incident.cyber_score >= 20, Incident.transaction_score >= 20),
            )
        )
        source_specs = (
            (
                "authentication_telemetry",
                CyberEvent,
                "Persisted synthetic authentication, device, network, and endpoint events.",
            ),
            (
                "transaction_stream",
                Transaction,
                "Persisted synthetic transaction activity.",
            ),
            (
                "behavioural_baselines",
                BehaviourBaseline,
                "Persisted customer-level deterministic behavioural baselines.",
            ),
            (
                "transaction_channels",
                TransactionChannel,
                "Persisted synthetic channel and cryptographic-inventory links.",
            ),
        )
        source_systems: list[SourceHealthResponse] = []
        for source, model, detail in source_specs:
            record_count = int(session.scalar(select(func.count()).select_from(model)) or 0)
            source_systems.append(
                SourceHealthResponse(
                    source=source,
                    status="healthy" if record_count > 0 else "empty",
                    record_count=record_count,
                    detail=detail,
                )
            )
        return DashboardSummaryResponse(
            visible_incidents=len(incidents),
            incidents_by_severity=_severity_counts(severity_counts),
            open_incidents=sum(item.status == IncidentStatus.OPEN for item in incidents),
            in_review_incidents=sum(item.status == IncidentStatus.IN_REVIEW for item in incidents),
            transactions_held=int(held or 0),
            legitimate_unusual_activity_permitted=int(legitimate_unusual or 0),
            confirmed_fraud_cases=sum(
                item.status == IncidentStatus.CONFIRMED_FRAUD for item in incidents
            ),
            source_systems=source_systems,
            synthetic_data_notice=SYNTHETIC_NOTICE,
        )

    def trends(self, session: Session) -> DashboardTrendsResponse:
        rows = session.execute(
            select(Incident, Transaction)
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .where(
                Incident.created_at >= WINDOW_START,
                Incident.created_at < SIMULATION_EPOCH,
            )
            .order_by(Incident.created_at, Incident.incident_id)
        ).all()
        by_day: dict[date, list[tuple[Incident, Transaction]]] = defaultdict(list)
        for incident, transaction in rows:
            window_day = (incident.created_at - WINDOW_START).days
            by_day[WINDOW_START.date() + timedelta(days=window_day)].append((incident, transaction))

        points: list[DashboardTrendPointResponse] = []
        for offset in range(14):
            day = WINDOW_START.date() + timedelta(days=offset)
            day_rows = by_day[day]
            severity_counts = Counter(item.severity.value for item, _ in day_rows)
            transaction_counts = Counter(transaction.status.value for _, transaction in day_rows)
            points.append(
                DashboardTrendPointResponse(
                    day=day,
                    incident_volume=len(day_rows),
                    severity_distribution=_severity_counts(severity_counts),
                    average_cyber_score=_average([item.cyber_score for item, _ in day_rows]),
                    average_transaction_score=_average(
                        [item.transaction_score for item, _ in day_rows]
                    ),
                    average_fused_score=_average([item.fused_score for item, _ in day_rows]),
                    transaction_actions=TransactionActionCountsResponse(
                        permitted=transaction_counts[TransactionStatus.PERMITTED.value],
                        held=transaction_counts[TransactionStatus.HELD.value],
                        released=transaction_counts[TransactionStatus.RELEASED.value],
                        declined=transaction_counts[TransactionStatus.DECLINED.value],
                        pending=transaction_counts[TransactionStatus.PENDING.value],
                        cancelled=transaction_counts[TransactionStatus.CANCELLED.value],
                    ),
                )
            )
        return DashboardTrendsResponse(
            window_start=WINDOW_START.date(),
            window_end=WINDOW_START.date() + timedelta(days=13),
            points=points,
            synthetic_data_notice=SYNTHETIC_NOTICE,
        )


def _severity_counts(counts: Counter[str]) -> SeverityCountsResponse:
    return SeverityCountsResponse(
        low=counts[Severity.LOW.value],
        guarded=counts[Severity.GUARDED.value],
        elevated=counts[Severity.ELEVATED.value],
        high=counts[Severity.HIGH.value],
        critical=counts[Severity.CRITICAL.value],
    )


def _average(values: list[int]) -> Decimal | None:
    if not values:
        return None
    return (Decimal(sum(values)) / Decimal(len(values))).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
