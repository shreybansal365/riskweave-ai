from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import (
    Account,
    BehaviourBaseline,
    Beneficiary,
    Customer,
    Device,
    Incident,
    Transaction,
    TransactionChannel,
)
from app.models.domain import Session as BankingSession
from app.schemas.context import (
    AccountCompactResponse,
    AccountContextResponse,
    BehaviourBaselineResponse,
    BeneficiaryContextResponse,
    CustomerContextResponse,
    DeviceContextResponse,
    LinkedIncidentResponse,
    SessionContextResponse,
    TransactionContextResponse,
)
from app.services.presentation import masked_bank_code, masked_ip, masked_uuid


class ContextNotFoundError(LookupError):
    """Raised when a requested synthetic customer or account does not exist."""


class CustomerContextService:
    """Build bounded customer and account investigation context from persisted data."""

    def customer(self, session: Session, customer_id: UUID) -> CustomerContextResponse:
        customer = session.get(Customer, customer_id)
        if customer is None:
            raise ContextNotFoundError(str(customer_id))
        accounts = session.scalars(
            select(Account)
            .where(Account.customer_id == customer_id)
            .order_by(Account.created_at, Account.account_id)
        ).all()
        baseline = self._baseline(session, customer_id)
        devices = self._devices(session, customer_id)
        sessions = self._sessions(session, customer_id=customer_id)
        beneficiaries = self._beneficiaries(session, customer_id)
        transactions = self._transactions(session, customer_id=customer_id)
        incidents = self._incidents(session, customer_id=customer_id)
        return CustomerContextResponse(
            customer_id=customer.customer_id,
            customer_reference=masked_uuid(customer.customer_id, prefix="CUS"),
            display_name=customer.display_name,
            home_city=customer.home_city,
            home_country=customer.home_country,
            risk_segment=customer.risk_segment,
            created_at=customer.created_at,
            behavioural_baseline=_baseline_response(baseline),
            accounts=[_account_response(item) for item in accounts],
            trusted_devices=[_device_response(item) for item in devices if item.trusted],
            familiar_locations=list(baseline.usual_cities),
            recent_sessions=[_session_response(item) for item in sessions],
            recent_beneficiaries=[_beneficiary_response(item) for item in beneficiaries],
            recent_transactions=[_transaction_response(*item) for item in transactions],
            linked_incidents=[_incident_response(item) for item in incidents],
        )

    def account(self, session: Session, account_id: UUID) -> AccountContextResponse:
        account = session.get(Account, account_id)
        if account is None:
            raise ContextNotFoundError(str(account_id))
        customer = session.get(Customer, account.customer_id)
        if customer is None:
            raise ContextNotFoundError(f"customer for {account_id}")
        baseline = self._baseline(session, customer.customer_id)
        devices = self._devices(session, customer.customer_id)
        sessions = self._sessions(session, account_id=account_id)
        transactions = self._transactions(session, account_id=account_id)
        beneficiary_ids = {transaction.beneficiary_id for transaction, _ in transactions}
        beneficiaries = session.scalars(
            select(Beneficiary)
            .where(Beneficiary.beneficiary_id.in_(beneficiary_ids))
            .order_by(Beneficiary.created_at.desc(), Beneficiary.beneficiary_id)
            .limit(10)
        ).all()
        incidents = self._incidents(session, account_id=account_id)
        compact = _account_response(account)
        return AccountContextResponse(
            **compact.model_dump(),
            customer_id=customer.customer_id,
            customer_reference=masked_uuid(customer.customer_id, prefix="CUS"),
            customer_display_name=customer.display_name,
            behavioural_baseline=_baseline_response(baseline),
            trusted_devices=[_device_response(item) for item in devices if item.trusted],
            familiar_locations=list(baseline.usual_cities),
            recent_sessions=[_session_response(item) for item in sessions],
            recent_beneficiaries=[_beneficiary_response(item) for item in beneficiaries],
            recent_transactions=[_transaction_response(*item) for item in transactions],
            linked_incidents=[_incident_response(item) for item in incidents],
        )

    @staticmethod
    def _baseline(session: Session, customer_id: UUID) -> BehaviourBaseline:
        baseline = session.scalar(
            select(BehaviourBaseline).where(BehaviourBaseline.customer_id == customer_id)
        )
        if baseline is None:
            raise ContextNotFoundError(f"behavioural baseline for {customer_id}")
        return baseline

    @staticmethod
    def _devices(session: Session, customer_id: UUID) -> list[Device]:
        return list(
            session.scalars(
                select(Device)
                .where(Device.customer_id == customer_id)
                .order_by(Device.last_seen_at.desc(), Device.device_id)
                .limit(10)
            )
        )

    @staticmethod
    def _sessions(
        session: Session,
        *,
        customer_id: UUID | None = None,
        account_id: UUID | None = None,
    ) -> list[BankingSession]:
        if customer_id is None and account_id is None:
            raise ValueError("a customer_id or account_id is required")
        condition = (
            BankingSession.customer_id == customer_id
            if customer_id is not None
            else BankingSession.account_id == account_id
        )
        return list(
            session.scalars(
                select(BankingSession)
                .where(condition)
                .order_by(BankingSession.started_at.desc(), BankingSession.session_id)
                .limit(10)
            )
        )

    @staticmethod
    def _beneficiaries(session: Session, customer_id: UUID) -> list[Beneficiary]:
        return list(
            session.scalars(
                select(Beneficiary)
                .where(Beneficiary.customer_id == customer_id)
                .order_by(Beneficiary.created_at.desc(), Beneficiary.beneficiary_id)
                .limit(10)
            )
        )

    @staticmethod
    def _transactions(
        session: Session,
        *,
        customer_id: UUID | None = None,
        account_id: UUID | None = None,
    ) -> list[tuple[Transaction, TransactionChannel]]:
        if customer_id is None and account_id is None:
            raise ValueError("a customer_id or account_id is required")
        condition = (
            Transaction.customer_id == customer_id
            if customer_id is not None
            else Transaction.account_id == account_id
        )
        return [
            (transaction, channel)
            for transaction, channel in session.execute(
                select(Transaction, TransactionChannel)
                .join(TransactionChannel, TransactionChannel.channel_id == Transaction.channel_id)
                .where(condition)
                .order_by(Transaction.created_at.desc(), Transaction.transaction_id)
                .limit(10)
            ).all()
        ]

    @staticmethod
    def _incidents(
        session: Session,
        *,
        customer_id: UUID | None = None,
        account_id: UUID | None = None,
    ) -> list[Incident]:
        if customer_id is None and account_id is None:
            raise ValueError("a customer_id or account_id is required")
        condition = (
            Incident.customer_id == customer_id
            if customer_id is not None
            else Incident.account_id == account_id
        )
        return list(
            session.scalars(
                select(Incident)
                .where(condition)
                .order_by(Incident.created_at.desc(), Incident.incident_id)
                .limit(10)
            )
        )


def _baseline_response(item: BehaviourBaseline) -> BehaviourBaselineResponse:
    return BehaviourBaselineResponse(
        baseline_id=item.baseline_id,
        sample_started_at=item.sample_started_at,
        sample_ended_at=item.sample_ended_at,
        typical_login_start_hour=item.typical_login_start_hour,
        typical_login_end_hour=item.typical_login_end_hour,
        usual_cities=list(item.usual_cities),
        known_channels=list(item.known_channels),
        normal_transaction_median_minor=item.median_transaction_amount_minor,
        transaction_amount_mad_minor=item.transaction_amount_mad_minor,
        average_daily_transaction_count=item.average_daily_transaction_count,
        typical_beneficiary_age_days=item.typical_beneficiary_age_days,
        typical_transaction_velocity_30m=item.typical_transaction_velocity_30m,
        usual_destination_risks=list(item.usual_destination_risks),
        model_version=item.model_version,
    )


def _account_response(item: Account) -> AccountCompactResponse:
    return AccountCompactResponse(
        account_id=item.account_id,
        account_reference=masked_uuid(item.account_id, prefix="ACC"),
        account_type=item.account_type,
        currency=item.currency,
        status=item.status,
        typical_transaction_min_minor=item.typical_transaction_min_minor,
        typical_transaction_max_minor=item.typical_transaction_max_minor,
        average_daily_transaction_count=item.average_daily_transaction_count,
    )


def _device_response(item: Device) -> DeviceContextResponse:
    return DeviceContextResponse(
        device_id=item.device_id,
        device_reference=masked_uuid(item.device_id, prefix="DEV"),
        device_type=item.device_type,
        operating_system=item.operating_system,
        trusted=item.trusted,
        posture=item.posture,
        first_seen_at=item.first_seen_at,
        last_seen_at=item.last_seen_at,
    )


def _session_response(item: BankingSession) -> SessionContextResponse:
    return SessionContextResponse(
        session_id=item.session_id,
        device_id=item.device_id,
        account_id=item.account_id,
        masked_ip_address=masked_ip(str(item.ip_address)),
        city=item.city,
        country=item.country,
        started_at=item.started_at,
        ended_at=item.ended_at,
        status=item.status,
    )


def _beneficiary_response(item: Beneficiary) -> BeneficiaryContextResponse:
    return BeneficiaryContextResponse(
        beneficiary_id=item.beneficiary_id,
        beneficiary_reference=masked_uuid(item.beneficiary_id, prefix="BEN"),
        display_name=item.display_name,
        bank_code_masked=masked_bank_code(item.bank_code),
        created_at=item.created_at,
        risk_level=item.risk_level,
    )


def _transaction_response(
    item: Transaction,
    channel: TransactionChannel,
) -> TransactionContextResponse:
    return TransactionContextResponse(
        transaction_id=item.transaction_id,
        account_id=item.account_id,
        session_id=item.session_id,
        beneficiary_id=item.beneficiary_id,
        channel_code=channel.channel_code.value,
        amount_minor=item.amount_minor,
        currency=item.currency,
        created_at=item.created_at,
        status=item.status,
        destination_risk=item.destination_risk,
    )


def _incident_response(item: Incident) -> LinkedIncidentResponse:
    return LinkedIncidentResponse(
        incident_id=item.incident_id,
        severity=item.severity.value,
        status=item.status,
        fused_score=item.fused_score,
        scenario_key=item.scenario_key.value if item.scenario_key else None,
        created_at=item.created_at,
    )
