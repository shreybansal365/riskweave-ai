from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.domain import CryptoAsset
from app.models.enums import (
    AlgorithmFamily,
    DataSensitivity,
    MigrationStatus,
    QuantumPriority,
)
from app.schemas.quantum import (
    QuantumAssetResponse,
    QuantumAssetsResponse,
    QuantumChannelResponse,
    QuantumPriorityCountsResponse,
    QuantumSummaryResponse,
)

FRAUD_RISK_SEPARATION_NOTICE = (
    "Cryptographic readiness is contextual inventory data and never changes fraud-risk scores."
)
QUANTUM_ATTACK_DISCLAIMER = (
    "RiskWeave assesses migration readiness; it does not detect an active quantum attack."
)
SYNTHETIC_NOTICE = (
    "All cryptographic assets and channel relationships are synthetic prototype data."
)


@dataclass(frozen=True, slots=True)
class ReadinessAssessment:
    score: int
    level: QuantumPriority
    reasons: tuple[str, ...]


_ALGORITHM_POINTS = {
    AlgorithmFamily.RSA: 30,
    AlgorithmFamily.ECC: 30,
    AlgorithmFamily.SYMMETRIC: 8,
    AlgorithmFamily.ML_KEM: 0,
    AlgorithmFamily.ML_DSA: 0,
    AlgorithmFamily.HYBRID: 8,
    AlgorithmFamily.OTHER: 20,
}
_SENSITIVITY_POINTS = {
    DataSensitivity.LOW: 0,
    DataSensitivity.MODERATE: 8,
    DataSensitivity.HIGH: 15,
    DataSensitivity.CRITICAL: 25,
}
_MIGRATION_POINTS = {
    MigrationStatus.NOT_ASSESSED: 12,
    MigrationStatus.PLANNED: 6,
    MigrationStatus.IN_PROGRESS: 3,
    MigrationStatus.PQC_READY: 0,
}


class QuantumReadinessService:
    """Explain a deterministic crypto-migration priority independent of fraud scoring."""

    def assess(self, asset: CryptoAsset) -> ReadinessAssessment:
        algorithm_points = _ALGORITHM_POINTS[asset.algorithm_family]
        sensitivity_points = _SENSITIVITY_POINTS[asset.data_sensitivity]
        lifetime_points = min(asset.confidentiality_years, 20)
        pqc_points = -8 if asset.pqc_ready else 15
        migration_points = _MIGRATION_POINTS[asset.migration_status]
        score = max(
            0,
            min(
                100,
                algorithm_points
                + sensitivity_points
                + lifetime_points
                + pqc_points
                + migration_points,
            ),
        )
        level = _priority_for_score(score)
        reasons = (
            _algorithm_reason(asset.algorithm_family, algorithm_points),
            (
                f"{asset.data_sensitivity.value} synthetic-data sensitivity contributes "
                f"{sensitivity_points} readiness-priority points."
            ),
            (
                f"A {asset.confidentiality_years}-year confidentiality horizon contributes "
                f"{lifetime_points} points."
            ),
            (
                "The asset is marked post-quantum ready, reducing migration priority by 8 points."
                if asset.pqc_ready
                else (
                    "The asset is not marked post-quantum ready, adding 15 "
                    "migration-priority points."
                )
            ),
            (
                f"Migration status '{asset.migration_status.value}' contributes "
                f"{migration_points} points."
            ),
        )
        return ReadinessAssessment(score=score, level=level, reasons=reasons)

    def list_assets(self, session: Session) -> QuantumAssetsResponse:
        assets = session.scalars(
            select(CryptoAsset)
            .options(selectinload(CryptoAsset.channels))
            .order_by(CryptoAsset.crypto_asset_id)
        ).all()
        items = [self.to_response(asset) for asset in assets]
        items.sort(key=lambda item: (-item.readiness_priority_score, str(item.crypto_asset_id)))
        return QuantumAssetsResponse(
            items=items,
            synthetic_data_notice=SYNTHETIC_NOTICE,
            active_attack_detection_disclaimer=QUANTUM_ATTACK_DISCLAIMER,
        )

    def summary(self, session: Session) -> QuantumSummaryResponse:
        assets_response = self.list_assets(session)
        priorities = Counter(item.readiness_priority_level.value for item in assets_response.items)
        migration_statuses = Counter(item.migration_status.value for item in assets_response.items)
        return QuantumSummaryResponse(
            total_assets=len(assets_response.items),
            linked_transaction_channels=sum(
                len(item.linked_channels) for item in assets_response.items
            ),
            pqc_ready_assets=sum(item.pqc_ready for item in assets_response.items),
            migration_status_counts=dict(sorted(migration_statuses.items())),
            readiness_priority_counts=QuantumPriorityCountsResponse(
                low=priorities[QuantumPriority.LOW.value],
                medium=priorities[QuantumPriority.MEDIUM.value],
                high=priorities[QuantumPriority.HIGH.value],
                urgent=priorities[QuantumPriority.URGENT.value],
            ),
            highest_priority_assets=assets_response.items[:3],
            fraud_risk_separation_notice=FRAUD_RISK_SEPARATION_NOTICE,
            active_attack_detection_disclaimer=QUANTUM_ATTACK_DISCLAIMER,
        )

    def to_response(self, asset: CryptoAsset) -> QuantumAssetResponse:
        assessment = self.assess(asset)
        return QuantumAssetResponse(
            crypto_asset_id=asset.crypto_asset_id,
            name=asset.name,
            algorithm_family=asset.algorithm_family,
            data_sensitivity=asset.data_sensitivity,
            confidentiality_years=asset.confidentiality_years,
            pqc_ready=asset.pqc_ready,
            migration_status=asset.migration_status,
            readiness_priority_score=assessment.score,
            readiness_priority_level=assessment.level,
            migration_priority_reasons=list(assessment.reasons),
            assessed_at=asset.assessed_at,
            linked_channels=[
                QuantumChannelResponse(
                    channel_id=channel.channel_id,
                    channel_code=channel.channel_code.value,
                    display_name=channel.display_name,
                    active=channel.active,
                )
                for channel in sorted(asset.channels, key=lambda item: item.channel_code.value)
            ],
            fraud_risk_separation_notice=FRAUD_RISK_SEPARATION_NOTICE,
        )


def _priority_for_score(score: int) -> QuantumPriority:
    if score >= 75:
        return QuantumPriority.URGENT
    if score >= 50:
        return QuantumPriority.HIGH
    if score >= 25:
        return QuantumPriority.MEDIUM
    return QuantumPriority.LOW


def _algorithm_reason(algorithm: AlgorithmFamily, points: int) -> str:
    if algorithm in {AlgorithmFamily.RSA, AlgorithmFamily.ECC}:
        description = "legacy public-key family"
    elif algorithm in {AlgorithmFamily.ML_KEM, AlgorithmFamily.ML_DSA}:
        description = "post-quantum family"
    elif algorithm == AlgorithmFamily.HYBRID:
        description = "hybrid migration family"
    else:
        description = "cryptographic family"
    return (
        f"Algorithm '{algorithm.value}' is treated as a {description} "
        f"and contributes {points} points."
    )
