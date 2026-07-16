from __future__ import annotations

import json

from alembic.config import Config

from alembic import command
from app.core.config import get_settings
from app.db.session import create_database_engine, create_session_factory
from app.services.release_bootstrap import ReleaseBootstrapService


def main() -> None:
    settings = get_settings()
    command.upgrade(Config("alembic.ini"), "head")

    engine = create_database_engine(settings)
    try:
        result = ReleaseBootstrapService(create_session_factory(engine)).run(settings=settings)
    finally:
        engine.dispose()

    print(
        json.dumps(
            {
                "operation": "release_bootstrap",
                "dataset_action": result.dataset_action,
                "counts": result.counts,
                "fingerprint": result.fingerprint,
                "users": {
                    "created": result.users.created,
                    "updated": result.users.updated,
                    "unchanged": result.users.unchanged,
                },
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
