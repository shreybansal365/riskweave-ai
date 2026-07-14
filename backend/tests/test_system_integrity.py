from app.core.config import Settings
from app.models.domain import ScenarioRun
from app.models.enums import ScenarioRunStatus
from app.services.system_integrity import (
    _audit_reference,
    _dataset_state,
    _reset_fingerprint,
    _runtime_context,
)


def test_runtime_context_identifies_local_and_deployed_demo_origins() -> None:
    local = _runtime_context(
        Settings(
            _env_file=None,
            app_env="development",
            database_url="postgresql+psycopg://test:test@localhost:5432/riskweave_test",
            cors_origins="http://localhost:4173",
        ),
        "http://127.0.0.1:8000",
    )
    assert local.deployment_mode == "local_demo"
    assert local.environment_label == "Local deterministic demo"
    assert local.api_origin_scope == "loopback"

    deployed = _runtime_context(
        Settings(
            _env_file=None,
            app_env="production",
            database_url="postgresql+psycopg://test:test@example.test:5432/riskweave",
            cors_origins="https://riskweave.example",
            jwt_secret="production-test-secret-with-at-least-32-characters",
        ),
        "https://api.riskweave.example",
    )
    assert deployed.deployment_mode == "deployed_demo"
    assert deployed.environment_label == "Deployed deterministic demo"
    assert deployed.api_origin_scope == "network"


def test_missing_audit_state_is_represented_without_invented_values() -> None:
    assert _reset_fingerprint(None) is None
    assert _audit_reference(None) is None


def test_dataset_state_labels_distinguish_baseline_showcase_and_other_changes() -> None:
    scenario = ScenarioRun(status=ScenarioRunStatus.NOT_RUN)
    assert _dataset_state(
        scenarios=[], current_fingerprint="current", latest_reset_fingerprint=None
    ) == ("uninitialized", "Deterministic dataset not initialized")
    assert _dataset_state(
        scenarios=[scenario],
        current_fingerprint="baseline",
        latest_reset_fingerprint="baseline",
    ) == ("baseline_restored", "Baseline dataset restored")
    assert _dataset_state(
        scenarios=[scenario],
        current_fingerprint="changed",
        latest_reset_fingerprint="baseline",
    ) == ("modified", "Baseline dataset modified")
    scenario.status = ScenarioRunStatus.COMPLETED
    assert _dataset_state(
        scenarios=[scenario],
        current_fingerprint="changed",
        latest_reset_fingerprint="baseline",
    ) == ("showcase_active", "Showcase scenarios active")
