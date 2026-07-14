from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from urllib.parse import urlsplit

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.readiness import ReadinessSnapshot
from app.models.domain import AuditEvent, ScenarioRun
from app.models.enums import AuditEventType, ScenarioRunStatus
from app.schemas.system import (
    AuditIntegrityResponse,
    AuditReferenceResponse,
    BenchmarkIntegrityResponse,
    DatasetIntegrityResponse,
    DatasetState,
    ReadinessReferenceResponse,
    RuntimeContextResponse,
    ScenarioIntegrityResponse,
    SystemContextResponse,
    SystemIntegrityResponse,
)
from app.services.demo_data import (
    DATASET_VERSION,
    EXPECTED_BASELINE_COUNTS,
    SIMULATION_SEED,
    baseline_counts,
    dataset_fingerprint,
)
from risk_engine.anomaly import MODEL_RANDOM_SEED
from risk_engine.benchmark import BENCHMARK_NAME, load_benchmark

_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1", "testserver"}


class SystemIntegrityService:
    """Build a safe, admin-only view of deterministic runtime integrity."""

    def __init__(self, benchmark_fixture: Path | None = None) -> None:
        self._benchmark_fixture = benchmark_fixture or (
            Path(__file__).resolve().parents[2] / "data" / "benchmark" / "cases.json"
        )

    def snapshot(
        self,
        session: Session,
        *,
        settings: Settings,
        readiness: ReadinessSnapshot,
        api_origin: str,
    ) -> SystemIntegrityResponse:
        normalized_origin = api_origin.rstrip("/")
        runtime = _runtime_context(settings, normalized_origin)
        scenarios = session.scalars(select(ScenarioRun).order_by(ScenarioRun.scenario_key)).all()
        latest_reset = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == AuditEventType.SCENARIO_RESET)
            .order_by(AuditEvent.created_at.desc(), AuditEvent.audit_event_id.desc())
            .limit(1)
        )
        latest_event = session.scalar(
            select(AuditEvent)
            .order_by(AuditEvent.created_at.desc(), AuditEvent.audit_event_id.desc())
            .limit(1)
        )
        current_counts = baseline_counts(session)
        current_fingerprint = dataset_fingerprint(session)
        latest_reset_fingerprint = _reset_fingerprint(latest_reset)
        fixture_version, cases = load_benchmark(self._benchmark_fixture)

        return SystemIntegrityResponse(
            service=settings.app_name,
            version=settings.app_version,
            runtime=runtime,
            readiness=ReadinessReferenceResponse(
                database=readiness.database,
                migrations=readiness.migrations,
                revision=readiness.revision,
            ),
            dataset=DatasetIntegrityResponse(
                version=DATASET_VERSION,
                simulation_epoch=settings.simulation_epoch,
                generator_seed=SIMULATION_SEED,
                model_seed=MODEL_RANDOM_SEED,
                expected_baseline_counts=dict(EXPECTED_BASELINE_COUNTS),
                current_counts=current_counts,
                current_fingerprint=current_fingerprint,
                latest_reset_fingerprint=latest_reset_fingerprint,
                exact_baseline_restored=(
                    current_counts == EXPECTED_BASELINE_COUNTS
                    and latest_reset_fingerprint is not None
                    and current_fingerprint == latest_reset_fingerprint
                ),
            ),
            scenarios=[
                ScenarioIntegrityResponse(
                    scenario_key=item.scenario_key,
                    status=item.status,
                    seed=item.seed,
                    simulation_epoch=item.simulation_epoch,
                    result_incident_id=item.result_incident_id,
                    started_at=item.started_at,
                    completed_at=item.completed_at,
                )
                for item in scenarios
            ],
            benchmark=BenchmarkIntegrityResponse(
                fixture_version=fixture_version,
                benchmark_name=BENCHMARK_NAME,
                case_count=len(cases),
            ),
            audit=AuditIntegrityResponse(
                latest_reset=_audit_reference(latest_reset),
                latest_event=_audit_reference(latest_event),
            ),
        )

    def context(
        self,
        session: Session,
        *,
        settings: Settings,
        api_origin: str,
    ) -> SystemContextResponse:
        """Return the minimal safe context shared by analyst and admin shells."""

        runtime = _runtime_context(settings, api_origin.rstrip("/"))
        scenarios = session.scalars(select(ScenarioRun).order_by(ScenarioRun.scenario_key)).all()
        latest_reset = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == AuditEventType.SCENARIO_RESET)
            .order_by(AuditEvent.created_at.desc(), AuditEvent.audit_event_id.desc())
            .limit(1)
        )
        latest_reset_fingerprint = _reset_fingerprint(latest_reset)
        current_fingerprint = dataset_fingerprint(session)
        state, label = _dataset_state(
            scenarios=scenarios,
            current_fingerprint=current_fingerprint,
            latest_reset_fingerprint=latest_reset_fingerprint,
        )
        return SystemContextResponse(
            environment_label=runtime.environment_label,
            deployment_mode=runtime.deployment_mode,
            dataset_version=DATASET_VERSION,
            simulation_epoch=settings.simulation_epoch,
            dataset_state=state,
            dataset_state_label=label,
        )


def _runtime_context(settings: Settings, api_origin: str) -> RuntimeContextResponse:
    hostname = (urlsplit(api_origin).hostname or "").lower()
    is_loopback = hostname in _LOOPBACK_HOSTS
    if settings.app_env == "test":
        deployment_mode = "test"
        environment_label = "Deterministic test environment"
    elif is_loopback:
        deployment_mode = "local_demo"
        environment_label = "Local deterministic demo"
    else:
        deployment_mode = "deployed_demo"
        environment_label = "Deployed deterministic demo"
    return RuntimeContextResponse(
        configured_environment=settings.app_env,
        deployment_mode=deployment_mode,
        environment_label=environment_label,
        api_origin=api_origin,
        api_origin_scope="loopback" if is_loopback else "network",
    )


def _reset_fingerprint(event: AuditEvent | None) -> str | None:
    if event is None:
        return None
    value = event.details.get("fingerprint")
    return value if isinstance(value, str) else None


def _audit_reference(event: AuditEvent | None) -> AuditReferenceResponse | None:
    if event is None:
        return None
    return AuditReferenceResponse(
        audit_event_id=event.audit_event_id,
        event_type=event.event_type,
        created_at=event.created_at,
    )


def _dataset_state(
    *,
    scenarios: Sequence[ScenarioRun],
    current_fingerprint: str,
    latest_reset_fingerprint: str | None,
) -> tuple[DatasetState, str]:
    if latest_reset_fingerprint is None or not scenarios:
        return "uninitialized", "Deterministic dataset not initialized"
    if current_fingerprint == latest_reset_fingerprint:
        return "baseline_restored", "Baseline dataset restored"
    if any(item.status != ScenarioRunStatus.NOT_RUN for item in scenarios):
        return "showcase_active", "Showcase scenarios active"
    return "modified", "Baseline dataset modified"
