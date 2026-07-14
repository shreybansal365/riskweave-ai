from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.domain import AuditEvent
from app.models.enums import AuditEventType


class AuditRecorder:
    """Append security-relevant events without owning the caller's transaction."""

    def record(
        self,
        session: Session,
        *,
        event_type: AuditEventType,
        entity_type: str,
        entity_id: str,
        request_id: str,
        actor_user_id: UUID | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            actor_user_id=actor_user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            request_id=request_id,
            details=details or {},
        )
        session.add(event)
        return event
