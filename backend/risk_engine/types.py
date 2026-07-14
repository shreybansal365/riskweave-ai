from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from types import MappingProxyType
from uuid import UUID

from app.models.enums import (
    ContributionCategory,
    CyberEventType,
    RecommendedAction,
    RiskLevel,
    Severity,
    TransactionStatus,
)


@dataclass(frozen=True, slots=True)
class Contribution:
    category: ContributionCategory
    code: str
    label: str
    points: int
    explanation: str
    source_event_id: UUID | None = None
    source_transaction_id: UUID | None = None
    source_baseline_id: UUID | None = None
    occurred_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class CyberFeatures:
    event_types: frozenset[CyberEventType]
    event_ids: Mapping[CyberEventType, UUID]
    event_times: Mapping[CyberEventType, datetime]
    baseline_id: UUID | None
    device_known: bool = True
    fingerprint_known: bool = True
    device_trusted: bool = True
    unusual_login_time_hours: Decimal = Decimal("0")
    location_distance_km: Decimal = Decimal("0")
    anomaly_deviations: tuple[str, ...] = ()

    @classmethod
    def create(
        cls,
        *,
        event_types: frozenset[CyberEventType],
        event_ids: Mapping[CyberEventType, UUID] | None = None,
        event_times: Mapping[CyberEventType, datetime] | None = None,
        baseline_id: UUID | None = None,
        device_known: bool = True,
        fingerprint_known: bool = True,
        device_trusted: bool = True,
        unusual_login_time_hours: Decimal = Decimal("0"),
        location_distance_km: Decimal = Decimal("0"),
        anomaly_deviations: tuple[str, ...] = (),
    ) -> CyberFeatures:
        return cls(
            event_types=event_types,
            event_ids=MappingProxyType(dict(event_ids or {})),
            event_times=MappingProxyType(dict(event_times or {})),
            baseline_id=baseline_id,
            device_known=device_known,
            fingerprint_known=fingerprint_known,
            device_trusted=device_trusted,
            unusual_login_time_hours=unusual_login_time_hours,
            location_distance_km=location_distance_km,
            anomaly_deviations=anomaly_deviations,
        )

    @property
    def anomaly_vector(self) -> tuple[float, ...]:
        events = self.event_types
        return (
            float(self.device_known),
            float(self.fingerprint_known),
            float(self.device_trusted),
            float(CyberEventType.MFA_FAILED in events),
            float(CyberEventType.RISKY_IP in events or CyberEventType.PROXY_DETECTED in events),
            float(CyberEventType.UNUSUAL_LOCATION in events),
            float(self.unusual_login_time_hours),
            float(CyberEventType.ENDPOINT_ALERT in events),
            float(CyberEventType.SESSION_TOKEN_ANOMALY in events),
        )


@dataclass(frozen=True, slots=True)
class TransactionFeatures:
    transaction_id: UUID | None
    baseline_id: UUID | None
    beneficiary_known: bool = True
    beneficiary_age_days: Decimal = Decimal("365")
    amount_ratio: Decimal = Decimal("1")
    velocity_ratio: Decimal = Decimal("1")
    destination_risk: RiskLevel = RiskLevel.LOW
    channel_known: bool = True
    historical_deviation_mad: Decimal = Decimal("0")
    occurred_at: datetime | None = None
    anomaly_deviations: tuple[str, ...] = ()

    @property
    def anomaly_vector(self) -> tuple[float, ...]:
        destination_value = {
            RiskLevel.LOW: 0.0,
            RiskLevel.MEDIUM: 1.0,
            RiskLevel.HIGH: 2.0,
        }[self.destination_risk]
        return (
            float(self.amount_ratio),
            float(self.velocity_ratio),
            min(float(self.beneficiary_age_days), 365.0) / 365.0,
            destination_value,
            float(self.channel_known),
            float(self.historical_deviation_mad),
        )


@dataclass(frozen=True, slots=True)
class RiskStreamResult:
    rule_points: int
    anomaly_points: int
    score: int
    contributions: tuple[Contribution, ...]


@dataclass(frozen=True, slots=True)
class InteractionResult:
    bonus: int
    contributions: tuple[Contribution, ...]


@dataclass(frozen=True, slots=True)
class FusionResult:
    cyber_score: int
    transaction_score: int
    correlation_bonus: int
    raw_fused_score: Decimal
    fused_score: int
    severity: Severity
    recommended_action: RecommendedAction
    transaction_status: TransactionStatus


@dataclass(frozen=True, slots=True)
class ExplanationBundle:
    summary: str
    signal_narrative: tuple[dict[str, str | int], ...]
    decision_explanation: str
    action_explanation: str


@dataclass(frozen=True, slots=True)
class CorrelatableEvent:
    event_id: UUID
    event_type: CyberEventType
    event_time: datetime
    customer_id: UUID
    account_id: UUID
    session_id: UUID
    device_id: UUID | None


@dataclass(frozen=True, slots=True)
class TransactionCorrelationContext:
    transaction_id: UUID
    transaction_time: datetime
    customer_id: UUID
    account_id: UUID
    session_id: UUID
    device_id: UUID | None
