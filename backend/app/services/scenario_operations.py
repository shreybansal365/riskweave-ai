from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionFactory
from app.models.domain import ScenarioRun
from app.models.enums import AuditEventType, ScenarioKey, ScenarioRunStatus
from app.schemas.scenarios import (
    ScenarioCatalogResponse,
    ScenarioDefinitionResponse,
    ScenarioExecutionResponse,
    ScenarioExpectedOutcomeResponse,
    ScenarioResetResponse,
)
from app.services.audit import AuditRecorder
from app.services.demo_data import DATASET_VERSION, EXPECTED_BASELINE_COUNTS, DemoDataService
from app.services.scenarios import ScenarioService, expected_showcase_fusion

SYNTHETIC_NOTICE = "All showcase scenarios operate only on deterministic synthetic data."

_SCENARIO_COPY = {
    ScenarioKey.NORMAL_ACTIVITY: (
        "Normal activity",
        "Demonstrates a low-risk permitted transaction from familiar context.",
        ["Known device", "Usual location", "Familiar beneficiary", "Typical amount"],
    ),
    ScenarioKey.LEGITIMATE_NEW_DEVICE: (
        "Legitimate new device",
        "Demonstrates guarded monitoring without a hold or step-up requirement.",
        ["New device", "Successful verification", "Familiar beneficiary", "Typical amount"],
    ),
    ScenarioKey.ACCOUNT_TAKEOVER: (
        "Account takeover",
        "Demonstrates cross-domain evidence leading to a critical held transaction.",
        ["Failed MFA", "Risky network", "Endpoint alert", "New beneficiary", "Velocity spike"],
    ),
}


class ScenarioOperationsService:
    """Expose the deterministic scenario engine without duplicating its business logic."""

    def __init__(self, session_factory: SessionFactory) -> None:
        self._session_factory = session_factory
        self._scenario_service = ScenarioService(session_factory)
        self._data_service = DemoDataService(session_factory)

    def catalog(self, session: Session) -> ScenarioCatalogResponse:
        runs = session.scalars(select(ScenarioRun).order_by(ScenarioRun.scenario_key)).all()

        def definition(run: ScenarioRun) -> ScenarioDefinitionResponse:
            expected = expected_showcase_fusion(run.scenario_key)
            copy = _SCENARIO_COPY[run.scenario_key]
            return ScenarioDefinitionResponse(
                scenario_key=run.scenario_key,
                title=copy[0],
                purpose=copy[1],
                important_signals=copy[2],
                expected_outcome=ScenarioExpectedOutcomeResponse(
                    cyber_score=expected.cyber_score,
                    transaction_score=expected.transaction_score,
                    correlation_bonus=expected.correlation_bonus,
                    raw_fused_score=expected.raw_fused_score,
                    fused_score=expected.fused_score,
                    severity=expected.severity,
                    recommended_action=expected.recommended_action,
                    transaction_status=expected.transaction_status,
                ),
                status=run.status,
                simulation_epoch=run.simulation_epoch,
                started_at=run.started_at,
                completed_at=run.completed_at,
                result_incident_id=run.result_incident_id,
            )

        return ScenarioCatalogResponse(
            items=[definition(run) for run in runs],
            synthetic_data_notice=SYNTHETIC_NOTICE,
        )

    def run(
        self,
        session: Session,
        *,
        scenario_key: ScenarioKey,
        actor_user_id: UUID,
        request_id: str,
    ) -> ScenarioExecutionResponse:
        run_state = session.scalar(
            select(ScenarioRun).where(ScenarioRun.scenario_key == scenario_key)
        )
        idempotent = bool(
            run_state is not None
            and run_state.status == ScenarioRunStatus.COMPLETED
            and run_state.result_incident_id is not None
        )
        result = self._scenario_service.run(
            scenario_key,
            actor_user_id=actor_user_id,
            request_id=request_id,
        )
        if idempotent:
            AuditRecorder().record(
                session,
                event_type=AuditEventType.SCENARIO_COMPLETED,
                entity_type="scenario",
                entity_id=scenario_key.value,
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "idempotent_replay": True,
                    "result_incident_id": str(result.incident_id),
                },
            )
            session.commit()
        return ScenarioExecutionResponse(
            scenario_key=result.scenario_key,
            incident_id=result.incident_id,
            cyber_score=result.cyber_score,
            transaction_score=result.transaction_score,
            correlation_bonus=result.correlation_bonus,
            raw_fused_score=result.raw_fused_score,
            fused_score=result.fused_score,
            severity=result.severity,
            recommended_action=result.recommended_action,
            transaction_status=result.transaction_status,
            idempotent=idempotent,
        )

    def reset(self, *, actor_user_id: UUID, request_id: str) -> ScenarioResetResponse:
        result = self._data_service.reset(
            actor_user_id=actor_user_id,
            request_id=request_id,
        )
        return ScenarioResetResponse(
            dataset_version=DATASET_VERSION,
            counts=result.counts,
            fingerprint=result.fingerprint,
            elapsed_seconds=result.elapsed_seconds,
            exact_baseline_restored=result.counts == EXPECTED_BASELINE_COUNTS,
        )
