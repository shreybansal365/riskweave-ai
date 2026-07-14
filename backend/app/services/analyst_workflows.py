from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.domain import AnalystAction, Incident, Transaction, User
from app.models.enums import (
    AnalystActionType,
    AuditEventType,
    IncidentStatus,
    TransactionStatus,
)
from app.schemas.incidents import AnalystActionResponse, IncidentMutationResponse
from app.services.audit import AuditRecorder
from app.synthetic.identity import deterministic_uuid


class WorkflowNotFoundError(LookupError):
    """Raised when an incident workflow target does not exist."""


class WorkflowConflictError(RuntimeError):
    """Raised when a transition, concurrency token, or idempotency key conflicts."""


_PATCH_ACTION = {
    IncidentStatus.IN_REVIEW: AnalystActionType.START_REVIEW,
    IncidentStatus.CONFIRMED_FRAUD: AnalystActionType.MARK_CONFIRMED_FRAUD,
    IncidentStatus.LEGITIMATE: AnalystActionType.MARK_LEGITIMATE,
    IncidentStatus.CLOSED: AnalystActionType.CLOSE_INCIDENT,
}

_INCIDENT_TRANSITIONS = {
    AnalystActionType.START_REVIEW: ({IncidentStatus.OPEN}, IncidentStatus.IN_REVIEW),
    AnalystActionType.MARK_CONFIRMED_FRAUD: (
        {IncidentStatus.OPEN, IncidentStatus.IN_REVIEW},
        IncidentStatus.CONFIRMED_FRAUD,
    ),
    AnalystActionType.MARK_LEGITIMATE: (
        {IncidentStatus.OPEN, IncidentStatus.IN_REVIEW},
        IncidentStatus.LEGITIMATE,
    ),
    AnalystActionType.CLOSE_INCIDENT: (
        {
            IncidentStatus.IN_REVIEW,
            IncidentStatus.CONFIRMED_FRAUD,
            IncidentStatus.LEGITIMATE,
        },
        IncidentStatus.CLOSED,
    ),
}


class AnalystWorkflowService:
    """Apply explicit, locked analyst transitions under a database row lock."""

    def patch_status(
        self,
        session: Session,
        *,
        incident_id: UUID,
        target_status: IncidentStatus,
        note: str | None,
        expected_updated_at: datetime | None,
        idempotency_key: str,
        analyst: User,
        request_id: str,
    ) -> IncidentMutationResponse:
        action_type = _PATCH_ACTION.get(target_status)
        if action_type is None:
            raise WorkflowConflictError(f"unsupported target status: {target_status.value}")
        return self.apply_action(
            session,
            incident_id=incident_id,
            action_type=action_type,
            note=note,
            expected_updated_at=expected_updated_at,
            idempotency_key=idempotency_key,
            analyst=analyst,
            request_id=request_id,
        )

    def apply_action(
        self,
        session: Session,
        *,
        incident_id: UUID,
        action_type: AnalystActionType,
        note: str | None,
        expected_updated_at: datetime | None,
        idempotency_key: str,
        analyst: User,
        request_id: str,
    ) -> IncidentMutationResponse:
        incident = session.scalar(
            select(Incident).where(Incident.incident_id == incident_id).with_for_update()
        )
        if incident is None:
            raise WorkflowNotFoundError(str(incident_id))
        transaction = session.scalar(
            select(Transaction)
            .where(Transaction.transaction_id == incident.transaction_id)
            .with_for_update()
        )
        if transaction is None:
            raise WorkflowNotFoundError(f"transaction for {incident_id}")

        action_id = deterministic_uuid(
            "analyst-action",
            f"{incident_id}/{analyst.user_id}/{idempotency_key}",
        )
        existing = session.get(AnalystAction, action_id)
        if existing is not None:
            if existing.action_type != action_type or existing.note != note:
                raise WorkflowConflictError(
                    "the idempotency key was already used for a different action"
                )
            return _mutation_response(
                incident=incident,
                transaction=transaction,
                action=existing,
                analyst=analyst,
                idempotent_replay=True,
            )

        if expected_updated_at is not None and _utc(incident.updated_at) != _utc(
            expected_updated_at
        ):
            raise WorkflowConflictError("incident changed after the supplied concurrency token")

        previous_incident_status = incident.status
        previous_transaction_status = transaction.status
        new_incident_status, new_transaction_status = _transition(
            incident.status,
            transaction.status,
            action_type,
        )
        now = datetime.now(UTC)
        incident.status = new_incident_status
        incident.updated_at = now
        transaction.status = new_transaction_status
        action = AnalystAction(
            analyst_action_id=action_id,
            incident_id=incident.incident_id,
            analyst_id=analyst.user_id,
            action_type=action_type,
            note=note,
            previous_incident_status=previous_incident_status,
            new_incident_status=new_incident_status,
            previous_transaction_status=previous_transaction_status,
            new_transaction_status=new_transaction_status,
            created_at=now,
        )
        session.add(action)
        AuditRecorder().record(
            session,
            event_type=AuditEventType.ANALYST_ACTION_RECORDED,
            entity_type="incident",
            entity_id=str(incident.incident_id),
            request_id=request_id,
            actor_user_id=analyst.user_id,
            details={
                "action_type": action_type.value,
                "previous_incident_status": previous_incident_status.value,
                "new_incident_status": new_incident_status.value,
                "previous_transaction_status": previous_transaction_status.value,
                "new_transaction_status": new_transaction_status.value,
                "idempotency_key_fingerprint": str(action_id),
            },
        )
        session.commit()
        return _mutation_response(
            incident=incident,
            transaction=transaction,
            action=action,
            analyst=analyst,
            idempotent_replay=False,
        )


def _transition(
    incident_status: IncidentStatus,
    transaction_status: TransactionStatus,
    action_type: AnalystActionType,
) -> tuple[IncidentStatus, TransactionStatus]:
    incident_transition = _INCIDENT_TRANSITIONS.get(action_type)
    if incident_transition is not None:
        allowed_from, target = incident_transition
        if incident_status not in allowed_from:
            raise WorkflowConflictError(
                f"{action_type.value} is invalid from incident status {incident_status.value}"
            )
        return target, transaction_status

    if action_type == AnalystActionType.ADD_NOTE:
        return incident_status, transaction_status
    if incident_status == IncidentStatus.CLOSED:
        raise WorkflowConflictError("a simulated response cannot modify a closed incident")
    if action_type == AnalystActionType.SIMULATE_HOLD:
        if transaction_status not in {
            TransactionStatus.PENDING,
            TransactionStatus.PERMITTED,
            TransactionStatus.RELEASED,
        }:
            raise WorkflowConflictError(
                f"simulate_hold is invalid from transaction status {transaction_status.value}"
            )
        return incident_status, TransactionStatus.HELD
    if action_type == AnalystActionType.SIMULATE_RELEASE:
        if transaction_status != TransactionStatus.HELD:
            raise WorkflowConflictError(
                f"simulate_release is invalid from transaction status {transaction_status.value}"
            )
        return incident_status, TransactionStatus.RELEASED
    if action_type == AnalystActionType.SIMULATE_DECLINE:
        if transaction_status not in {TransactionStatus.PENDING, TransactionStatus.HELD}:
            raise WorkflowConflictError(
                f"simulate_decline is invalid from transaction status {transaction_status.value}"
            )
        return incident_status, TransactionStatus.DECLINED
    raise WorkflowConflictError(f"unsupported action: {action_type.value}")


def _mutation_response(
    *,
    incident: Incident,
    transaction: Transaction,
    action: AnalystAction,
    analyst: User,
    idempotent_replay: bool,
) -> IncidentMutationResponse:
    return IncidentMutationResponse(
        incident_id=incident.incident_id,
        status=incident.status,
        transaction_status=transaction.status,
        updated_at=incident.updated_at,
        recorded_action=AnalystActionResponse(
            analyst_action_id=action.analyst_action_id,
            analyst_id=action.analyst_id,
            analyst_display_name=analyst.display_name,
            action_type=action.action_type,
            note=action.note,
            previous_incident_status=action.previous_incident_status,
            new_incident_status=action.new_incident_status,
            previous_transaction_status=action.previous_transaction_status,
            new_transaction_status=action.new_transaction_status,
            created_at=action.created_at,
        ),
        idempotent_replay=idempotent_replay,
    )


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
