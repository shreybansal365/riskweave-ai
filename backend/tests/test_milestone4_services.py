from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.models.domain import CryptoAsset
from app.models.enums import (
    AlgorithmFamily,
    AnalystActionType,
    DataSensitivity,
    MigrationStatus,
    QuantumPriority,
)
from app.schemas.incidents import AnalystActionRequest, IncidentPatchRequest
from app.services.presentation import masked_bank_code, masked_ip, masked_uuid
from app.services.quantum_readiness import QuantumReadinessService


def _asset(
    *,
    algorithm: AlgorithmFamily,
    sensitivity: DataSensitivity,
    years: int,
    pqc_ready: bool,
    migration: MigrationStatus,
) -> CryptoAsset:
    return CryptoAsset(
        crypto_asset_id=uuid4(),
        name=f"Synthetic {uuid4()}",
        algorithm_family=algorithm,
        data_sensitivity=sensitivity,
        confidentiality_years=years,
        pqc_ready=pqc_ready,
        migration_status=migration,
        priority_score=0,
        priority_level=QuantumPriority.LOW,
        assessment_reason="Unit-test synthetic asset.",
        assessed_at=datetime(2026, 7, 14, 9, 0, tzinfo=UTC),
    )


@pytest.mark.parametrize(
    ("asset", "expected_score", "expected_level"),
    (
        (
            _asset(
                algorithm=AlgorithmFamily.ML_KEM,
                sensitivity=DataSensitivity.LOW,
                years=0,
                pqc_ready=True,
                migration=MigrationStatus.PQC_READY,
            ),
            0,
            QuantumPriority.LOW,
        ),
        (
            _asset(
                algorithm=AlgorithmFamily.HYBRID,
                sensitivity=DataSensitivity.LOW,
                years=0,
                pqc_ready=False,
                migration=MigrationStatus.PLANNED,
            ),
            29,
            QuantumPriority.MEDIUM,
        ),
        (
            _asset(
                algorithm=AlgorithmFamily.ECC,
                sensitivity=DataSensitivity.MODERATE,
                years=0,
                pqc_ready=False,
                migration=MigrationStatus.NOT_ASSESSED,
            ),
            65,
            QuantumPriority.HIGH,
        ),
        (
            _asset(
                algorithm=AlgorithmFamily.OTHER,
                sensitivity=DataSensitivity.CRITICAL,
                years=30,
                pqc_ready=False,
                migration=MigrationStatus.NOT_ASSESSED,
            ),
            92,
            QuantumPriority.URGENT,
        ),
    ),
)
def test_quantum_readiness_components_are_explainable_and_bounded(
    asset: CryptoAsset,
    expected_score: int,
    expected_level: QuantumPriority,
) -> None:
    assessment = QuantumReadinessService().assess(asset)
    assert assessment.score == expected_score
    assert assessment.level == expected_level
    assert len(assessment.reasons) == 5
    assert all("points" in reason for reason in assessment.reasons)


def test_display_masking_handles_uuid_ipv4_ipv6_and_short_bank_codes() -> None:
    reference = masked_uuid(uuid4(), prefix="CUS")
    assert reference.startswith("CUS-••••-")
    assert masked_ip("203.0.113.42") == "203.0.xxx.xxx"
    assert masked_ip("2001:db8::1").startswith("2001:0db8:xxxx")
    assert masked_bank_code("AB") == "••"
    assert masked_bank_code("SYNTH001") == "SY••••01"


def test_incident_mutation_schemas_reject_unsafe_or_ambiguous_payloads() -> None:
    with pytest.raises(ValidationError):
        IncidentPatchRequest.model_validate({"status": "open"})
    with pytest.raises(ValidationError):
        AnalystActionRequest.model_validate({"action_type": AnalystActionType.ADD_NOTE})
    normalized = AnalystActionRequest(
        action_type=AnalystActionType.ADD_NOTE,
        note="  bounded note  ",
    )
    assert normalized.note == "bounded note"


def test_business_api_cors_and_cache_headers_support_safe_patch_requests(
    client: TestClient,
) -> None:
    preflight = client.options(
        "/api/incidents/00000000-0000-0000-0000-000000000001",
        headers={
            "Origin": "http://localhost:4173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "authorization,idempotency-key,content-type",
        },
    )
    assert preflight.status_code == 200
    assert "PATCH" in preflight.headers["Access-Control-Allow-Methods"]
    assert "idempotency-key" in preflight.headers["Access-Control-Allow-Headers"].lower()
    protected = client.get("/api/incidents")
    assert protected.status_code == 401
    assert protected.headers["Cache-Control"] == "no-store"
