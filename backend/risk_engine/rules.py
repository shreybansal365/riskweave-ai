from __future__ import annotations

from app.models.enums import ContributionCategory, CyberEventType, RiskLevel
from risk_engine.anomaly import IsolationForestSupport
from risk_engine.types import (
    Contribution,
    CyberFeatures,
    RiskStreamResult,
    TransactionFeatures,
)

CYBER_BASELINE = "cyber.baseline_exposure"
CYBER_NEW_DEVICE = "cyber.new_device"
CYBER_FIRST_SEEN_FINGERPRINT = "cyber.first_seen_fingerprint"
CYBER_UNTRUSTED_POSTURE = "cyber.untrusted_device_posture"
CYBER_FAILED_MFA = "cyber.failed_mfa"
CYBER_RISKY_NETWORK = "cyber.risky_network"
CYBER_UNUSUAL_LOCATION = "cyber.unusual_location"
CYBER_IMPOSSIBLE_TRAVEL = "cyber.impossible_travel"
CYBER_ENDPOINT_ALERT = "cyber.endpoint_alert"
CYBER_UNUSUAL_LOGIN_TIME = "cyber.unusual_login_time"
CYBER_SESSION_TOKEN_ANOMALY = "cyber.session_token_anomaly"

TRANSACTION_BASELINE = "transaction.baseline_exposure"
TRANSACTION_NEW_BENEFICIARY = "transaction.new_beneficiary"
TRANSACTION_RECENT_BENEFICIARY = "transaction.recent_beneficiary"
TRANSACTION_HIGH_AMOUNT = "transaction.high_amount"
TRANSACTION_AMOUNT_DEVIATION = "transaction.amount_deviation"
TRANSACTION_VELOCITY_SPIKE = "transaction.velocity_spike"
TRANSACTION_DESTINATION_RISK = "transaction.destination_risk"
TRANSACTION_UNUSUAL_CHANNEL = "transaction.unusual_channel"
TRANSACTION_HISTORICAL_DEVIATION = "transaction.historical_deviation"


class CyberRiskEngine:
    def __init__(self, anomaly_support: IsolationForestSupport | None = None) -> None:
        self._anomaly = anomaly_support or IsolationForestSupport()

    def evaluate(self, features: CyberFeatures) -> RiskStreamResult:
        contributions: list[Contribution] = []
        events = features.event_types

        if CyberEventType.NEW_DEVICE in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.NEW_DEVICE,
                    CYBER_NEW_DEVICE,
                    "New device",
                    12,
                    "The session used a device not previously observed in this customer's "
                    "behavioural history.",
                )
            )
        if not features.fingerprint_known:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.NEW_DEVICE,
                    CYBER_FIRST_SEEN_FINGERPRINT,
                    "First-seen fingerprint",
                    8,
                    "The browser and device fingerprint had not appeared in the "
                    "customer's history.",
                )
            )
        if not features.device_trusted:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.NEW_DEVICE,
                    CYBER_UNTRUSTED_POSTURE,
                    "Untrusted device posture",
                    6,
                    "The device had not yet established a trusted security posture.",
                )
            )
        if CyberEventType.MFA_FAILED in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.MFA_FAILED,
                    CYBER_FAILED_MFA,
                    "Failed MFA",
                    14,
                    "Multi-factor authentication failed during the correlated session.",
                )
            )
        risky_type = (
            CyberEventType.RISKY_IP
            if CyberEventType.RISKY_IP in events
            else CyberEventType.PROXY_DETECTED
        )
        if risky_type in events:
            contributions.append(
                self._event(
                    features,
                    risky_type,
                    CYBER_RISKY_NETWORK,
                    "Risky network",
                    10,
                    "The session originated from a risky IP address or proxy.",
                )
            )
        if CyberEventType.UNUSUAL_LOCATION in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.UNUSUAL_LOCATION,
                    CYBER_UNUSUAL_LOCATION,
                    "Unusual location",
                    8,
                    "The login city was outside the customer's usual location history.",
                )
            )
        if CyberEventType.IMPOSSIBLE_TRAVEL in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.IMPOSSIBLE_TRAVEL,
                    CYBER_IMPOSSIBLE_TRAVEL,
                    "Impossible travel",
                    16,
                    "The elapsed time could not plausibly explain the distance from "
                    "the previous login.",
                )
            )
        if CyberEventType.ENDPOINT_ALERT in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.ENDPOINT_ALERT,
                    CYBER_ENDPOINT_ALERT,
                    "Endpoint alert",
                    18,
                    "Endpoint telemetry reported compromise indicators on the session device.",
                )
            )
        if CyberEventType.UNUSUAL_LOGIN_TIME in events:
            points = 4 if features.unusual_login_time_hours <= 2 else 6
            contributions.append(
                self._event(
                    features,
                    CyberEventType.UNUSUAL_LOGIN_TIME,
                    CYBER_UNUSUAL_LOGIN_TIME,
                    "Unusual login time",
                    points,
                    f"The login occurred {features.unusual_login_time_hours} hours "
                    "outside the customer's usual window.",
                )
            )
        if CyberEventType.SESSION_TOKEN_ANOMALY in events:
            contributions.append(
                self._event(
                    features,
                    CyberEventType.SESSION_TOKEN_ANOMALY,
                    CYBER_SESSION_TOKEN_ANOMALY,
                    "Session-token anomaly",
                    16,
                    "The session token changed in a way that did not match normal token rotation.",
                )
            )

        if not contributions:
            contributions.append(
                Contribution(
                    category=ContributionCategory.CYBER_RULE,
                    code=CYBER_BASELINE,
                    label="Ordinary session exposure",
                    points=10,
                    explanation=(
                        "Authentication and device telemetry matched the customer's "
                        "established baseline."
                    ),
                    source_baseline_id=features.baseline_id,
                )
            )

        rule_points = min(100, sum(item.points for item in contributions))
        anomaly_points = self._anomaly.points(
            "cyber", features.anomaly_vector, features.anomaly_deviations
        )
        if anomaly_points:
            representative_event_type = next(
                iter(sorted(features.event_ids, key=lambda item: item.value)),
                None,
            )
            contributions.append(
                Contribution(
                    category=ContributionCategory.CYBER_ANOMALY,
                    code="cyber.behavioural_deviation",
                    label="Session behaviour deviation",
                    points=anomaly_points,
                    explanation="Behaviour differed from history: "
                    + "; ".join(features.anomaly_deviations)
                    + ".",
                    source_event_id=(
                        features.event_ids.get(representative_event_type)
                        if representative_event_type is not None
                        else None
                    ),
                    source_baseline_id=features.baseline_id,
                    occurred_at=(
                        features.event_times.get(representative_event_type)
                        if representative_event_type is not None
                        else None
                    ),
                )
            )
        return RiskStreamResult(
            rule_points=rule_points,
            anomaly_points=anomaly_points,
            score=min(100, rule_points + anomaly_points),
            contributions=tuple(contributions),
        )

    @staticmethod
    def _event(
        features: CyberFeatures,
        event_type: CyberEventType,
        code: str,
        label: str,
        points: int,
        explanation: str,
    ) -> Contribution:
        return Contribution(
            category=ContributionCategory.CYBER_RULE,
            code=code,
            label=label,
            points=points,
            explanation=explanation,
            source_event_id=features.event_ids.get(event_type),
            source_baseline_id=features.baseline_id,
            occurred_at=features.event_times.get(event_type),
        )


class TransactionRiskEngine:
    def __init__(self, anomaly_support: IsolationForestSupport | None = None) -> None:
        self._anomaly = anomaly_support or IsolationForestSupport()

    def evaluate(self, features: TransactionFeatures) -> RiskStreamResult:
        contributions: list[Contribution] = []

        if not features.beneficiary_known and features.beneficiary_age_days <= 1:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_NEW_BENEFICIARY,
                    "New beneficiary",
                    15,
                    "The beneficiary was created less than one day before the transfer.",
                )
            )
        elif features.beneficiary_age_days < 7:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_RECENT_BENEFICIARY,
                    "Recently added beneficiary",
                    8,
                    f"The beneficiary was only {features.beneficiary_age_days} days old.",
                )
            )

        if features.amount_ratio >= 5:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_HIGH_AMOUNT,
                    "Unusually high amount",
                    18,
                    f"The amount was {features.amount_ratio}x the customer's median transaction.",
                )
            )
        elif features.amount_ratio >= 3:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_AMOUNT_DEVIATION,
                    "Amount deviation",
                    10,
                    f"The amount was {features.amount_ratio}x the customer's median transaction.",
                )
            )

        if features.velocity_ratio >= 3:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_VELOCITY_SPIKE,
                    "Transaction velocity spike",
                    14,
                    f"Thirty-minute transaction velocity was {features.velocity_ratio}x "
                    "the baseline.",
                )
            )
        elif features.velocity_ratio >= 2:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_VELOCITY_SPIKE,
                    "Elevated transaction velocity",
                    8,
                    f"Thirty-minute transaction velocity was {features.velocity_ratio}x "
                    "the baseline.",
                )
            )

        if features.destination_risk == RiskLevel.HIGH:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_DESTINATION_RISK,
                    "High-risk destination",
                    10,
                    "The destination was marked high risk in the synthetic beneficiary context.",
                )
            )
        elif features.destination_risk == RiskLevel.MEDIUM:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_DESTINATION_RISK,
                    "Elevated destination",
                    5,
                    "The destination was outside the customer's low-risk destination history.",
                )
            )

        if not features.channel_known:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_UNUSUAL_CHANNEL,
                    "Unusual channel",
                    8,
                    "The transfer used a channel absent from the customer's behaviour baseline.",
                )
            )

        if features.historical_deviation_mad >= 5:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_HISTORICAL_DEVIATION,
                    "Historical deviation",
                    12,
                    f"The amount was {features.historical_deviation_mad} median absolute "
                    "deviations from history.",
                )
            )
        elif features.historical_deviation_mad >= 3:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_HISTORICAL_DEVIATION,
                    "Historical deviation",
                    7,
                    f"The amount was {features.historical_deviation_mad} median absolute "
                    "deviations from history.",
                )
            )

        if not contributions:
            contributions.append(
                self._contribution(
                    features,
                    TRANSACTION_BASELINE,
                    "Ordinary transaction exposure",
                    10,
                    "Amount, beneficiary, velocity, destination, and channel matched "
                    "the customer baseline.",
                )
            )

        rule_points = min(100, sum(item.points for item in contributions))
        anomaly_points = self._anomaly.points(
            "transaction", features.anomaly_vector, features.anomaly_deviations
        )
        if anomaly_points:
            contributions.append(
                Contribution(
                    category=ContributionCategory.TRANSACTION_ANOMALY,
                    code="transaction.behavioural_deviation",
                    label="Transaction behaviour deviation",
                    points=anomaly_points,
                    explanation="Behaviour differed from history: "
                    + "; ".join(features.anomaly_deviations)
                    + ".",
                    source_transaction_id=features.transaction_id,
                    source_baseline_id=features.baseline_id,
                    occurred_at=features.occurred_at,
                )
            )
        return RiskStreamResult(
            rule_points=rule_points,
            anomaly_points=anomaly_points,
            score=min(100, rule_points + anomaly_points),
            contributions=tuple(contributions),
        )

    @staticmethod
    def _contribution(
        features: TransactionFeatures,
        code: str,
        label: str,
        points: int,
        explanation: str,
    ) -> Contribution:
        return Contribution(
            category=ContributionCategory.TRANSACTION_RULE,
            code=code,
            label=label,
            points=points,
            explanation=explanation,
            source_transaction_id=features.transaction_id,
            source_baseline_id=features.baseline_id,
            occurred_at=features.occurred_at,
        )
