from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta
from math import ceil
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import String, case, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.domain import (
    Account,
    AnalystAction,
    Beneficiary,
    CryptoAsset,
    Customer,
    CyberEvent,
    Incident,
    RiskContribution,
    Transaction,
    TransactionChannel,
    User,
)
from app.models.domain import Session as BankingSession
from app.models.enums import (
    ContributionCategory,
    IncidentStatus,
    ScenarioKey,
    Severity,
)
from app.schemas.common import PaginationMeta
from app.schemas.incidents import (
    AccountSummaryResponse,
    AnalystActionResponse,
    ContributionResponse,
    CryptoReadinessSummaryResponse,
    CustomerSummaryResponse,
    IncidentDetailResponse,
    IncidentListItemResponse,
    IncidentListResponse,
    SessionSummaryResponse,
    TimelineItemResponse,
    TransactionSummaryResponse,
)
from app.services.presentation import masked_ip, masked_uuid
from app.services.quantum_readiness import (
    FRAUD_RISK_SEPARATION_NOTICE,
    QuantumReadinessService,
)

IncidentSort = Literal["created_at", "updated_at", "severity", "fused_score", "status"]
SortDirection = Literal["asc", "desc"]


class IncidentNotFoundError(LookupError):
    """Raised when a requested synthetic incident does not exist."""


_SEVERITY_ORDER = case(
    (Incident.severity == Severity.LOW, 0),
    (Incident.severity == Severity.GUARDED, 1),
    (Incident.severity == Severity.ELEVATED, 2),
    (Incident.severity == Severity.HIGH, 3),
    (Incident.severity == Severity.CRITICAL, 4),
    else_=5,
)


class IncidentQueryService:
    """Read persisted incidents without recalculating any risk value."""

    def __init__(self, quantum_service: QuantumReadinessService | None = None) -> None:
        self._quantum = quantum_service or QuantumReadinessService()

    def list_incidents(
        self,
        session: Session,
        *,
        page: int,
        page_size: int,
        sort_by: IncidentSort,
        sort_direction: SortDirection,
        severity: Severity | None,
        status: IncidentStatus | None,
        scenario: ScenarioKey | None,
        date_from: datetime | None,
        date_to: datetime | None,
        search: str | None,
    ) -> IncidentListResponse:
        filters = self._filters(
            severity=severity,
            status=status,
            scenario=scenario,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        total = session.scalar(
            select(func.count(Incident.incident_id))
            .join(Customer, Customer.customer_id == Incident.customer_id)
            .where(*filters)
        )
        total_items = int(total or 0)
        sort_column: Any = {
            "created_at": Incident.created_at,
            "updated_at": Incident.updated_at,
            "severity": _SEVERITY_ORDER,
            "fused_score": Incident.fused_score,
            "status": Incident.status,
        }[sort_by]
        primary_order = sort_column.asc() if sort_direction == "asc" else sort_column.desc()
        rows = session.execute(
            select(Incident, Transaction, Customer, Account)
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .join(Customer, Customer.customer_id == Incident.customer_id)
            .join(Account, Account.account_id == Incident.account_id)
            .where(*filters)
            .order_by(primary_order, Incident.created_at.desc(), Incident.incident_id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return IncidentListResponse(
            items=[
                _list_item(incident, transaction, customer, account)
                for incident, transaction, customer, account in rows
            ],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=ceil(total_items / page_size) if total_items else 0,
            ),
        )

    def get_incident(self, session: Session, incident_id: UUID) -> IncidentDetailResponse:
        row = session.execute(
            select(
                Incident,
                Transaction,
                Customer,
                Account,
                BankingSession,
                Beneficiary,
                TransactionChannel,
                CryptoAsset,
            )
            .join(Transaction, Transaction.transaction_id == Incident.transaction_id)
            .join(Customer, Customer.customer_id == Incident.customer_id)
            .join(Account, Account.account_id == Incident.account_id)
            .join(BankingSession, BankingSession.session_id == Incident.session_id)
            .join(Beneficiary, Beneficiary.beneficiary_id == Transaction.beneficiary_id)
            .join(TransactionChannel, TransactionChannel.channel_id == Transaction.channel_id)
            .join(CryptoAsset, CryptoAsset.crypto_asset_id == TransactionChannel.crypto_asset_id)
            .where(Incident.incident_id == incident_id)
        ).one_or_none()
        if row is None:
            raise IncidentNotFoundError(str(incident_id))
        (
            incident,
            transaction,
            customer,
            account,
            banking_session,
            beneficiary,
            channel,
            crypto_asset,
        ) = row
        contributions = session.scalars(
            select(RiskContribution)
            .where(RiskContribution.incident_id == incident_id)
            .order_by(RiskContribution.display_order, RiskContribution.contribution_id)
        ).all()
        action_rows = session.execute(
            select(AnalystAction, User.display_name)
            .join(User, User.user_id == AnalystAction.analyst_id)
            .where(AnalystAction.incident_id == incident_id)
            .order_by(AnalystAction.created_at, AnalystAction.analyst_action_id)
        ).all()
        cyber_events = session.scalars(
            select(CyberEvent)
            .where(
                CyberEvent.session_id == incident.session_id,
                CyberEvent.customer_id == incident.customer_id,
                CyberEvent.account_id == incident.account_id,
                CyberEvent.event_time >= transaction.created_at - timedelta(minutes=30),
                CyberEvent.event_time <= transaction.created_at,
            )
            .order_by(CyberEvent.event_time, CyberEvent.cyber_event_id)
        ).all()
        contribution_responses = [_contribution(item) for item in contributions]
        assessment = self._quantum.assess(crypto_asset)
        analyst_actions = [
            AnalystActionResponse(
                analyst_action_id=action.analyst_action_id,
                analyst_id=action.analyst_id,
                analyst_display_name=analyst_display_name,
                action_type=action.action_type,
                note=action.note,
                previous_incident_status=action.previous_incident_status,
                new_incident_status=action.new_incident_status,
                previous_transaction_status=action.previous_transaction_status,
                new_transaction_status=action.new_transaction_status,
                created_at=action.created_at,
            )
            for action, analyst_display_name in action_rows
        ]
        return IncidentDetailResponse(
            incident_id=incident.incident_id,
            incident_reference=masked_uuid(incident.incident_id, prefix="INC"),
            scenario_key=incident.scenario_key,
            cyber_score=incident.cyber_score,
            transaction_score=incident.transaction_score,
            correlation_bonus=incident.correlation_bonus,
            raw_fused_score=incident.raw_fused_score,
            fused_score=incident.fused_score,
            severity=incident.severity,
            status=incident.status,
            recommended_action=incident.recommended_action,
            summary=incident.summary,
            signal_narrative=incident.signal_narrative,
            decision_explanation=incident.decision_explanation,
            action_explanation=incident.action_explanation,
            engine_version=incident.engine_version,
            model_version=incident.model_version,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            customer=CustomerSummaryResponse(
                customer_id=customer.customer_id,
                customer_reference=masked_uuid(customer.customer_id, prefix="CUS"),
                display_name=customer.display_name,
                home_city=customer.home_city,
                home_country=customer.home_country,
                risk_segment=customer.risk_segment.value,
            ),
            account=AccountSummaryResponse(
                account_id=account.account_id,
                account_reference=masked_uuid(account.account_id, prefix="ACC"),
                account_type=account.account_type.value,
                status=account.status.value,
                currency="INR",
            ),
            session=SessionSummaryResponse(
                session_id=banking_session.session_id,
                device_id=banking_session.device_id,
                masked_ip_address=masked_ip(str(banking_session.ip_address)),
                city=banking_session.city,
                country=banking_session.country,
                started_at=banking_session.started_at,
                ended_at=banking_session.ended_at,
                status=banking_session.status.value,
            ),
            transaction=TransactionSummaryResponse(
                transaction_id=transaction.transaction_id,
                beneficiary_id=beneficiary.beneficiary_id,
                beneficiary_display_name=beneficiary.display_name,
                channel_id=channel.channel_id,
                amount_minor=transaction.amount_minor,
                currency="INR",
                created_at=transaction.created_at,
                status=transaction.status,
                destination_risk=transaction.destination_risk.value,
            ),
            crypto_readiness=CryptoReadinessSummaryResponse(
                channel_id=channel.channel_id,
                channel_code=channel.channel_code.value,
                channel_display_name=channel.display_name,
                crypto_asset_id=crypto_asset.crypto_asset_id,
                asset_name=crypto_asset.name,
                priority_score=assessment.score,
                priority_level=assessment.level.value,
                pqc_ready=crypto_asset.pqc_ready,
                migration_status=crypto_asset.migration_status.value,
                reasons=list(assessment.reasons),
                fraud_risk_separation_notice=FRAUD_RISK_SEPARATION_NOTICE,
            ),
            timeline=_timeline(
                incident=incident,
                beneficiary=beneficiary,
                transaction=transaction,
                cyber_events=cyber_events,
                analyst_actions=analyst_actions,
            ),
            cyber_contributions=[
                item
                for item in contribution_responses
                if item.category
                in {ContributionCategory.CYBER_RULE, ContributionCategory.CYBER_ANOMALY}
            ],
            transaction_contributions=[
                item
                for item in contribution_responses
                if item.category
                in {
                    ContributionCategory.TRANSACTION_RULE,
                    ContributionCategory.TRANSACTION_ANOMALY,
                }
            ],
            interaction_contributions=[
                item
                for item in contribution_responses
                if item.category == ContributionCategory.CORRELATION
            ],
            analyst_actions=analyst_actions,
        )

    @staticmethod
    def _filters(
        *,
        severity: Severity | None,
        status: IncidentStatus | None,
        scenario: ScenarioKey | None,
        date_from: datetime | None,
        date_to: datetime | None,
        search: str | None,
    ) -> list[Any]:
        filters: list[Any] = []
        if severity is not None:
            filters.append(Incident.severity == severity)
        if status is not None:
            filters.append(Incident.status == status)
        if scenario is not None:
            filters.append(Incident.scenario_key == scenario)
        if date_from is not None:
            filters.append(Incident.created_at >= date_from)
        if date_to is not None:
            filters.append(Incident.created_at <= date_to)
        if search:
            normalized = search.strip()
            search_filters: list[Any] = [
                func.lower(Customer.display_name).contains(normalized.lower(), autoescape=True),
                cast(Incident.incident_id, String) == normalized.lower(),
                cast(Incident.transaction_id, String) == normalized.lower(),
                cast(Incident.account_id, String) == normalized.lower(),
                cast(Incident.customer_id, String) == normalized.lower(),
            ]
            filters.append(or_(*search_filters))
        return filters


def _list_item(
    incident: Incident,
    transaction: Transaction,
    customer: Customer,
    account: Account,
) -> IncidentListItemResponse:
    return IncidentListItemResponse(
        incident_id=incident.incident_id,
        incident_reference=masked_uuid(incident.incident_id, prefix="INC"),
        customer_id=customer.customer_id,
        customer_reference=masked_uuid(customer.customer_id, prefix="CUS"),
        customer_display_name=customer.display_name,
        account_id=account.account_id,
        account_reference=masked_uuid(account.account_id, prefix="ACC"),
        transaction_id=transaction.transaction_id,
        scenario_key=incident.scenario_key,
        cyber_score=incident.cyber_score,
        transaction_score=incident.transaction_score,
        correlation_bonus=incident.correlation_bonus,
        raw_fused_score=incident.raw_fused_score,
        fused_score=incident.fused_score,
        severity=incident.severity,
        status=incident.status,
        recommended_action=incident.recommended_action,
        transaction_status=transaction.status,
        amount_minor=transaction.amount_minor,
        currency="INR",
        summary=incident.summary,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


def _contribution(item: RiskContribution) -> ContributionResponse:
    return ContributionResponse(
        contribution_id=item.contribution_id,
        category=item.category,
        code=item.code,
        label=item.label,
        points=item.points,
        explanation=item.explanation,
        source_event_id=item.source_event_id,
        source_transaction_id=item.source_transaction_id,
        source_baseline_id=item.source_baseline_id,
        display_order=item.display_order,
    )


def _timeline(
    *,
    incident: Incident,
    beneficiary: Beneficiary,
    transaction: Transaction,
    cyber_events: Sequence[CyberEvent],
    analyst_actions: list[AnalystActionResponse],
) -> list[TimelineItemResponse]:
    items = [
        TimelineItemResponse(
            occurred_at=event.event_time,
            item_type="cyber_event",
            code=event.event_type.value,
            label=event.event_type.value.replace("_", " ").title(),
            description=_event_description(event),
            source_id=event.cyber_event_id,
        )
        for event in cyber_events
    ]
    items.extend(
        (
            TimelineItemResponse(
                occurred_at=beneficiary.created_at,
                item_type="beneficiary",
                code="beneficiary_available",
                label="Beneficiary available",
                description=(
                    "The synthetic beneficiary was available to the customer before the transfer."
                ),
                source_id=beneficiary.beneficiary_id,
            ),
            TimelineItemResponse(
                occurred_at=transaction.created_at,
                item_type="transaction",
                code="transaction_initiated",
                label="Transaction initiated",
                description=(
                    f"Synthetic INR transaction entered the {transaction.status.value} state."
                ),
                source_id=transaction.transaction_id,
            ),
            TimelineItemResponse(
                occurred_at=incident.created_at,
                item_type="incident",
                code="contextual_decision",
                label="Contextual decision recorded",
                description=incident.summary,
                source_id=incident.incident_id,
            ),
        )
    )
    items.extend(
        TimelineItemResponse(
            occurred_at=action.created_at,
            item_type="analyst_action",
            code=action.action_type.value,
            label=action.action_type.value.replace("_", " ").title(),
            description=action.note or "Analyst workflow state changed.",
            source_id=action.analyst_action_id,
        )
        for action in analyst_actions
    )
    items.extend(
        TimelineItemResponse(
            occurred_at=action.created_at,
            item_type="transaction",
            code="transaction_status_changed",
            label="Transaction status changed",
            description=(
                f"Transaction moved from {action.previous_transaction_status.value} "
                f"to {action.new_transaction_status.value}."
            ),
            source_id=transaction.transaction_id,
        )
        for action in analyst_actions
        if action.previous_transaction_status != action.new_transaction_status
    )
    return sorted(items, key=lambda item: (item.occurred_at, item.item_type, str(item.source_id)))


def _event_description(event: CyberEvent) -> str:
    if event.event_type.value == "login_success":
        return "A successful synthetic authentication event was observed."
    if event.event_type.value == "mfa_success":
        return "The customer completed synthetic multi-factor authentication."
    return f"A synthetic {event.event_type.value.replace('_', ' ')} signal was observed."
