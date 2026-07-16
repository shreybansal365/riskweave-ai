from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from app.core.config import Settings
from app.core.security import PasswordService
from app.db.session import SessionFactory
from app.services.demo_data import (
    DATASET_VERSION,
    EXPECTED_BASELINE_COUNTS,
    DemoDataService,
    baseline_counts,
    dataset_fingerprint,
)
from app.services.seeding import SeedConfigurationError, SeedResult, seed_demo_users

EXPECTED_CONFIRMATION = DATASET_VERSION
DatasetAction = Literal["initialized", "verified"]


class ReleaseBootstrapError(RuntimeError):
    """Raised when a hosted bootstrap would be unsafe or non-deterministic."""


@dataclass(frozen=True, slots=True)
class ReleaseBootstrapResult:
    dataset_action: DatasetAction
    counts: dict[str, int]
    fingerprint: str
    users: SeedResult


@dataclass(frozen=True, slots=True)
class _Manifest:
    version: str
    counts: dict[str, int]
    fingerprint: str


class ReleaseBootstrapService:
    """Initialize an empty hosted database once, or verify an exact baseline safely."""

    def __init__(
        self,
        session_factory: SessionFactory,
        *,
        manifest_path: Path | None = None,
        password_service: PasswordService | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._manifest_path = manifest_path or (
            Path(__file__).resolve().parents[2] / "data" / "seeds" / "baseline_manifest.json"
        )
        self._password_service = password_service or PasswordService()

    def run(self, *, settings: Settings) -> ReleaseBootstrapResult:
        self._validate_guard(settings)
        manifest = self._load_manifest()

        with self._session_factory() as session:
            current_counts = baseline_counts(session)

        if all(count == 0 for count in current_counts.values()):
            snapshot = DemoDataService(self._session_factory).reset(
                request_id="release-bootstrap-initialize"
            )
            action: DatasetAction = "initialized"
            current_counts = snapshot.counts
            current_fingerprint = snapshot.fingerprint
        elif current_counts == manifest.counts:
            with self._session_factory() as session:
                current_fingerprint = dataset_fingerprint(session)
            action = "verified"
        else:
            raise ReleaseBootstrapError(
                "Refusing release bootstrap because the database contains partial or unexpected "
                f"deterministic state: {current_counts}"
            )

        self._verify_dataset(
            counts=current_counts,
            fingerprint=current_fingerprint,
            manifest=manifest,
        )

        try:
            with self._session_factory.begin() as session:
                users = seed_demo_users(
                    session,
                    settings=settings,
                    password_service=self._password_service,
                )
        except SeedConfigurationError as error:
            raise ReleaseBootstrapError(str(error)) from error

        with self._session_factory() as session:
            final_counts = baseline_counts(session)
            final_fingerprint = dataset_fingerprint(session)
        self._verify_dataset(
            counts=final_counts,
            fingerprint=final_fingerprint,
            manifest=manifest,
        )
        return ReleaseBootstrapResult(
            dataset_action=action,
            counts=final_counts,
            fingerprint=final_fingerprint,
            users=users,
        )

    @staticmethod
    def _validate_guard(settings: Settings) -> None:
        if settings.app_env != "production":
            raise ReleaseBootstrapError("Release bootstrap requires APP_ENV=production")
        if settings.release_bootstrap_confirm != EXPECTED_CONFIRMATION:
            raise ReleaseBootstrapError(
                f"RELEASE_BOOTSTRAP_CONFIRM must equal {EXPECTED_CONFIRMATION}"
            )
        if settings.demo_admin_password is None or settings.demo_analyst_password is None:
            raise ReleaseBootstrapError(
                "Both demo-user passwords are required for release bootstrap"
            )

    def _load_manifest(self) -> _Manifest:
        payload = json.loads(self._manifest_path.read_text(encoding="utf-8"))
        version = payload.get("dataset_version")
        counts = payload.get("counts")
        fingerprint = payload.get("fingerprint")
        if version != DATASET_VERSION:
            raise ReleaseBootstrapError("Baseline manifest version does not match the application")
        if counts != EXPECTED_BASELINE_COUNTS:
            raise ReleaseBootstrapError("Baseline manifest counts do not match the application")
        if not isinstance(fingerprint, str) or len(fingerprint) != 64:
            raise ReleaseBootstrapError("Baseline manifest fingerprint is missing or malformed")
        return _Manifest(version=version, counts=dict(counts), fingerprint=fingerprint)

    @staticmethod
    def _verify_dataset(
        *,
        counts: dict[str, int],
        fingerprint: str,
        manifest: _Manifest,
    ) -> None:
        if counts != manifest.counts or fingerprint != manifest.fingerprint:
            raise ReleaseBootstrapError(
                "Deterministic baseline verification failed; no corrective reset was attempted"
            )
