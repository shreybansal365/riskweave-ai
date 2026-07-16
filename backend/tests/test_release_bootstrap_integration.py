from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import delete, select

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.models.domain import Incident, User
from app.services.demo_data import (
    EXPECTED_BASELINE_COUNTS,
    DemoDataService,
    _clear_demo_domain,
    baseline_counts,
    dataset_fingerprint,
)
from app.services.release_bootstrap import ReleaseBootstrapError, ReleaseBootstrapService

EXPECTED_FINGERPRINT = "2ac2c997d21246cc7380ce1f53e121bb58c79891ea98229e47e6f2ec998ef0ca"


def _release_settings(settings: Settings, *, confirmation: str = "baseline-v1") -> Settings:
    return settings.model_copy(
        update={
            "app_env": "production",
            "release_bootstrap_confirm": confirmation,
        }
    )


@pytest.mark.integration
def test_release_bootstrap_initializes_empty_database_and_is_idempotent(
    postgres_session_factory: SessionFactory,
    postgres_settings: Settings,
    password_service: PasswordService,
) -> None:
    service = ReleaseBootstrapService(
        postgres_session_factory,
        password_service=password_service,
    )
    settings = _release_settings(postgres_settings)
    try:
        with postgres_session_factory.begin() as session:
            _clear_demo_domain(session)

        initialized = service.run(settings=settings)
        verified = service.run(settings=settings)

        assert initialized.dataset_action == "initialized"
        assert verified.dataset_action == "verified"
        assert initialized.counts == verified.counts == EXPECTED_BASELINE_COUNTS
        assert initialized.fingerprint == verified.fingerprint == EXPECTED_FINGERPRINT
        assert len(verified.users.user_ids) == 2
        with postgres_session_factory() as session:
            seeded_users = session.scalars(
                select(User).where(User.user_id.in_(verified.users.user_ids))
            ).all()
            assert {user.user_id for user in seeded_users} == set(verified.users.user_ids)
            assert baseline_counts(session) == EXPECTED_BASELINE_COUNTS
            assert dataset_fingerprint(session) == EXPECTED_FINGERPRINT
    finally:
        DemoDataService(postgres_session_factory).reset(request_id="release-bootstrap-test-restore")


@pytest.mark.integration
def test_release_bootstrap_refuses_bad_guard_and_partial_state(
    postgres_session_factory: SessionFactory,
    postgres_settings: Settings,
    password_service: PasswordService,
) -> None:
    service = ReleaseBootstrapService(
        postgres_session_factory,
        password_service=password_service,
    )
    DemoDataService(postgres_session_factory).reset(request_id="release-bootstrap-partial-base")
    try:
        with pytest.raises(ReleaseBootstrapError, match="RELEASE_BOOTSTRAP_CONFIRM"):
            service.run(settings=_release_settings(postgres_settings, confirmation="wrong"))

        with postgres_session_factory.begin() as session:
            incident_id = session.scalar(select(Incident.incident_id).limit(1))
            assert incident_id is not None
            session.execute(delete(Incident).where(Incident.incident_id == incident_id))

        with pytest.raises(ReleaseBootstrapError, match="partial or unexpected"):
            service.run(settings=_release_settings(postgres_settings))
    finally:
        DemoDataService(postgres_session_factory).reset(
            request_id="release-bootstrap-partial-restore"
        )


def test_release_bootstrap_rejects_malformed_manifest(
    tmp_path: Path,
    postgres_session_factory: SessionFactory,
    postgres_settings: Settings,
) -> None:
    manifest = tmp_path / "manifest.json"
    manifest.write_text('{"dataset_version":"baseline-v1","counts":{}}', encoding="utf-8")
    service = ReleaseBootstrapService(postgres_session_factory, manifest_path=manifest)

    with pytest.raises(ReleaseBootstrapError, match="counts"):
        service.run(settings=_release_settings(postgres_settings))
