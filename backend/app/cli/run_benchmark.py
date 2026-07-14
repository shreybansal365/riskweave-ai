from __future__ import annotations

import json
from pathlib import Path

from risk_engine.benchmark import evaluate_benchmark


def main() -> None:
    fixture_path = Path(__file__).resolve().parents[2] / "data" / "benchmark" / "cases.json"
    report = evaluate_benchmark(fixture_path)
    print(json.dumps(report.as_dict(), default=str, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
