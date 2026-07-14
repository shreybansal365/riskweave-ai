from __future__ import annotations

import argparse
import json
from dataclasses import asdict

from app.core.config import get_settings
from app.db.session import create_database_engine, create_session_factory
from app.models.enums import ScenarioKey
from app.services.scenarios import ScenarioService


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one deterministic RiskWeave scenario")
    parser.add_argument("scenario", choices=[item.value for item in ScenarioKey])
    args = parser.parse_args()
    settings = get_settings()
    engine = create_database_engine(settings)
    try:
        result = ScenarioService(create_session_factory(engine)).run(ScenarioKey(args.scenario))
        print(json.dumps(asdict(result), default=str, sort_keys=True))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
