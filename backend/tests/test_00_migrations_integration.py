from __future__ import annotations

import os

import pytest
from alembic.config import Config
from sqlalchemy import Engine, inspect, text

from alembic import command

EXPECTED_DOMAIN_TABLES = {
    "accounts",
    "analyst_actions",
    "audit_events",
    "behavioural_baselines",
    "beneficiaries",
    "crypto_assets",
    "cyber_events",
    "customers",
    "devices",
    "incidents",
    "risk_contributions",
    "scenario_runs",
    "sessions",
    "transaction_channels",
    "transactions",
    "users",
}


@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="set RUN_DATABASE_TESTS=1 with a PostgreSQL database",
)
def test_fresh_upgrade_and_safe_downgrade_reupgrade(postgres_engine: Engine) -> None:
    config = Config("alembic.ini")

    try:
        command.downgrade(config, "base")
        command.upgrade(config, "head")

        inspector = inspect(postgres_engine)
        assert set(inspector.get_table_names()) >= EXPECTED_DOMAIN_TABLES
        with postgres_engine.connect() as connection:
            revision = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            assert revision == "0002_domain_security"

        command.downgrade(config, "0001_foundation")
        downgraded_tables = set(inspect(postgres_engine).get_table_names())
        assert EXPECTED_DOMAIN_TABLES.isdisjoint(downgraded_tables)
        with postgres_engine.connect() as connection:
            remaining_enums = connection.execute(
                text(
                    "SELECT typname FROM pg_type "
                    "WHERE typname IN ('user_role', 'risk_level', 'transaction_status')"
                )
            ).scalars()
            assert list(remaining_enums) == []

        command.upgrade(config, "head")
        assert set(inspect(postgres_engine).get_table_names()) >= EXPECTED_DOMAIN_TABLES
    finally:
        command.upgrade(config, "head")
