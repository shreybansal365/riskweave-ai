from __future__ import annotations

from dataclasses import dataclass
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import PasswordService
from app.models.domain import User
from app.models.enums import UserRole

_DEMO_ID_PREFIX = "https://riskweave.ai/demo/v1/user/"


class SeedConfigurationError(RuntimeError):
    """Raised when deterministic demo-user credentials are unavailable or ambiguous."""


@dataclass(frozen=True, slots=True)
class SeedResult:
    created: int
    updated: int
    unchanged: int
    user_ids: tuple[UUID, UUID]


@dataclass(frozen=True, slots=True)
class _DemoUserDefinition:
    stable_key: str
    email: str
    display_name: str
    role: UserRole
    password: str

    @property
    def user_id(self) -> UUID:
        return uuid5(NAMESPACE_URL, f"{_DEMO_ID_PREFIX}{self.stable_key}")


def seed_demo_users(
    session: Session,
    *,
    settings: Settings,
    password_service: PasswordService,
) -> SeedResult:
    """Create or reconcile the two deterministic demo identities without duplicating rows."""

    if settings.demo_admin_password is None or settings.demo_analyst_password is None:
        raise SeedConfigurationError(
            "DEMO_ADMIN_PASSWORD and DEMO_ANALYST_PASSWORD are required for demo-user seeding"
        )
    if settings.demo_admin_email == settings.demo_analyst_email:
        raise SeedConfigurationError("demo analyst and admin emails must be distinct")

    definitions = (
        _DemoUserDefinition(
            stable_key="admin",
            email=settings.demo_admin_email,
            display_name="RiskWeave Demo Administrator",
            role=UserRole.ADMIN,
            password=settings.demo_admin_password.get_secret_value(),
        ),
        _DemoUserDefinition(
            stable_key="analyst",
            email=settings.demo_analyst_email,
            display_name="RiskWeave Demo Analyst",
            role=UserRole.ANALYST,
            password=settings.demo_analyst_password.get_secret_value(),
        ),
    )

    created = 0
    updated = 0
    unchanged = 0
    for definition in definitions:
        state = _upsert_demo_user(session, definition, password_service)
        if state == "created":
            created += 1
        elif state == "updated":
            updated += 1
        else:
            unchanged += 1

    session.flush()
    return SeedResult(
        created=created,
        updated=updated,
        unchanged=unchanged,
        user_ids=(definitions[0].user_id, definitions[1].user_id),
    )


def _upsert_demo_user(
    session: Session,
    definition: _DemoUserDefinition,
    password_service: PasswordService,
) -> str:
    matches = list(
        session.scalars(
            select(User).where(
                or_(User.user_id == definition.user_id, User.email == definition.email)
            )
        )
    )
    if len(matches) > 1:
        raise SeedConfigurationError(
            f"deterministic identity conflicts with existing email {definition.email}"
        )

    if not matches:
        session.add(
            User(
                user_id=definition.user_id,
                email=definition.email,
                display_name=definition.display_name,
                password_hash=password_service.hash_password(definition.password),
                role=definition.role,
                active=True,
            )
        )
        return "created"

    user = matches[0]
    if user.user_id != definition.user_id:
        raise SeedConfigurationError(
            f"email {definition.email} belongs to a non-demo user identifier"
        )

    changed = False
    desired_values = {
        "email": definition.email,
        "display_name": definition.display_name,
        "role": definition.role,
        "active": True,
    }
    for field_name, desired_value in desired_values.items():
        if getattr(user, field_name) != desired_value:
            setattr(user, field_name, desired_value)
            changed = True

    password_matches = password_service.verify_password(user.password_hash, definition.password)
    if not password_matches or password_service.needs_rehash(user.password_hash):
        user.password_hash = password_service.hash_password(definition.password)
        changed = True

    return "updated" if changed else "unchanged"
