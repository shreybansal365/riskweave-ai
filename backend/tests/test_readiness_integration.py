import os

import pytest

from app.core.config import Settings
from app.db.readiness import PostgresReadinessProbe
from app.db.session import create_database_engine


@pytest.mark.integration
@pytest.mark.skipif(
    os.getenv("RUN_DATABASE_TESTS") != "1",
    reason="set RUN_DATABASE_TESTS=1 with a migrated PostgreSQL database",
)
def test_postgres_probe_verifies_database_and_migration() -> None:
    settings = Settings(_env_file=None)
    engine = create_database_engine(settings)

    try:
        snapshot = PostgresReadinessProbe(engine).check()
    finally:
        engine.dispose()

    assert snapshot.is_ready
    assert snapshot.database == "reachable"
    assert snapshot.migrations == "current"
    assert snapshot.revision == "0003_intelligence_support"
