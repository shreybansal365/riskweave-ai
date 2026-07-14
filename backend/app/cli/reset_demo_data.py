from __future__ import annotations

import json

from app.core.config import get_settings
from app.db.session import create_database_engine, create_session_factory
from app.services.demo_data import DemoDataService


def main() -> None:
    settings = get_settings()
    engine = create_database_engine(settings)
    try:
        result = DemoDataService(create_session_factory(engine)).reset()
        print(
            json.dumps(
                {
                    "operation": "reset",
                    "counts": result.counts,
                    "fingerprint": result.fingerprint,
                    "elapsed_seconds": round(result.elapsed_seconds, 4),
                },
                sort_keys=True,
            )
        )
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
