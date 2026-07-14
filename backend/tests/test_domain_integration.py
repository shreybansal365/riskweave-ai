from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import DateTime, Engine, inspect, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.models.domain import Account, AuditEvent, Customer, Device, Session, Transaction
from app.models.enums import AccountStatus, AccountType, DevicePosture, DeviceType, RiskSegment
from tests.factories import create_domain_graph


@pytest.mark.integration
def test_complete_domain_graph_relationships_and_postgres_types(
    postgres_session_factory: SessionFactory,
    postgres_engine: Engine,
    password_service: PasswordService,
) -> None:
    with postgres_session_factory.begin() as database_session:
        graph = create_domain_graph(database_session, password_service)
        incident_id = graph.incident.incident_id
        transaction_id = graph.transaction.transaction_id

    with postgres_session_factory() as database_session:
        transaction = database_session.get(Transaction, transaction_id)
        assert transaction is not None
        assert transaction.session.account.customer.display_name.startswith("Synthetic Customer")
        assert transaction.session.device.customer_id == transaction.customer_id
        assert (
            transaction.channel.crypto_asset_id == transaction.channel.crypto_asset.crypto_asset_id
        )
        assert 0 <= transaction.channel.crypto_asset.priority_score <= 100
        assert transaction.beneficiary.customer_id == transaction.customer_id
        assert transaction.created_at.tzinfo is not None

        incident = database_session.get(graph.incident.__class__, incident_id)
        assert incident is not None
        assert incident.contributions[0].code == "schema_login_success"
        assert incident.analyst_actions[0].analyst.role.value == "analyst"

    inspector = inspect(postgres_engine)
    amount_column = next(
        column
        for column in inspector.get_columns("transactions")
        if column["name"] == "amount_minor"
    )
    assert str(amount_column["type"]) == "BIGINT"
    created_column = next(
        column for column in inspector.get_columns("transactions") if column["name"] == "created_at"
    )
    assert isinstance(created_column["type"], DateTime)
    assert created_column["type"].timezone is True


@pytest.mark.integration
def test_database_rejects_mismatched_session_identity(
    postgres_session_factory: SessionFactory,
) -> None:
    now = datetime.now(UTC)
    with postgres_session_factory() as database_session:
        first_customer = Customer(
            display_name="Synthetic Customer A",
            home_city="Pune",
            home_country="IN",
            risk_segment=RiskSegment.STANDARD,
        )
        second_customer = Customer(
            display_name="Synthetic Customer B",
            home_city="Mumbai",
            home_country="IN",
            risk_segment=RiskSegment.STANDARD,
        )
        database_session.add_all([first_customer, second_customer])
        database_session.flush()
        account = Account(
            customer_id=first_customer.customer_id,
            account_type=AccountType.SAVINGS,
            currency="INR",
            status=AccountStatus.ACTIVE,
            typical_transaction_min_minor=0,
            typical_transaction_max_minor=100_000,
            average_daily_transaction_count=Decimal("1.00"),
        )
        device = Device(
            customer_id=second_customer.customer_id,
            fingerprint=f"mismatch-{uuid4()}",
            device_type=DeviceType.MOBILE,
            operating_system="SyntheticOS",
            trusted=True,
            posture=DevicePosture.TRUSTED,
            first_seen_at=now,
            last_seen_at=now,
        )
        database_session.add_all([account, device])
        database_session.flush()
        database_session.add(
            Session(
                customer_id=first_customer.customer_id,
                account_id=account.account_id,
                device_id=device.device_id,
                ip_address="192.0.2.20",
                city="Pune",
                country="IN",
                started_at=now,
                status="active",
            )
        )
        with pytest.raises(IntegrityError):
            database_session.commit()
        database_session.rollback()


@pytest.mark.integration
def test_database_rejects_negative_money_and_invalid_enum(
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    with postgres_session_factory() as database_session:
        customer = Customer(
            display_name="Synthetic Constraint Customer",
            home_city="Pune",
            home_country="IN",
            risk_segment=RiskSegment.STANDARD,
        )
        database_session.add(customer)
        database_session.flush()
        database_session.add(
            Account(
                customer_id=customer.customer_id,
                account_type=AccountType.SAVINGS,
                currency="INR",
                status=AccountStatus.ACTIVE,
                typical_transaction_min_minor=-1,
                typical_transaction_max_minor=100,
                average_daily_transaction_count=Decimal("1.00"),
            )
        )
        with pytest.raises(IntegrityError):
            database_session.commit()
        database_session.rollback()

    with postgres_session_factory() as database_session:
        with pytest.raises(DBAPIError):
            database_session.execute(
                text(
                    "INSERT INTO users "
                    "(user_id, email, display_name, password_hash, role, active) "
                    "VALUES (:user_id, :email, :display_name, :password_hash, :role, true)"
                ),
                {
                    "user_id": uuid4(),
                    "email": f"invalid-enum-{uuid4().hex}@riskweave.demo",
                    "display_name": "Invalid Enum Test",
                    "password_hash": password_service.hash_password("Invalid-Enum-Test-2026!"),
                    "role": "operator",
                },
            )
            database_session.commit()
        database_session.rollback()


@pytest.mark.integration
def test_audit_events_are_database_enforced_append_only(
    postgres_session_factory: SessionFactory,
    password_service: PasswordService,
) -> None:
    with postgres_session_factory.begin() as database_session:
        graph = create_domain_graph(database_session, password_service)
        audit_event_id = graph.audit_event.audit_event_id

    with postgres_session_factory() as database_session:
        with pytest.raises(DBAPIError, match="append-only"):
            database_session.execute(
                text("UPDATE audit_events SET entity_type = 'tampered' WHERE audit_event_id = :id"),
                {"id": audit_event_id},
            )
            database_session.commit()
        database_session.rollback()

        stored_event = database_session.scalar(
            select(AuditEvent).where(AuditEvent.audit_event_id == audit_event_id)
        )
        assert stored_event is not None
        assert stored_event.entity_type == "analyst_action"
