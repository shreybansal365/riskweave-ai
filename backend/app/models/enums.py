from enum import StrEnum


class UserRole(StrEnum):
    ANALYST = "analyst"
    ADMIN = "admin"


class RiskSegment(StrEnum):
    STANDARD = "standard"
    HEIGHTENED = "heightened"


class AccountType(StrEnum):
    SAVINGS = "savings"
    CURRENT = "current"


class AccountStatus(StrEnum):
    ACTIVE = "active"
    RESTRICTED = "restricted"
    CLOSED = "closed"


class DeviceType(StrEnum):
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"


class DevicePosture(StrEnum):
    TRUSTED = "trusted"
    UNKNOWN = "unknown"
    COMPROMISED = "compromised"


class SessionStatus(StrEnum):
    ACTIVE = "active"
    ENDED = "ended"
    REVOKED = "revoked"


class CyberEventType(StrEnum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    MFA_SUCCESS = "mfa_success"
    MFA_FAILED = "mfa_failed"
    NEW_DEVICE = "new_device"
    RISKY_IP = "risky_ip"
    PROXY_DETECTED = "proxy_detected"
    UNUSUAL_LOCATION = "unusual_location"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    UNUSUAL_LOGIN_TIME = "unusual_login_time"
    ENDPOINT_ALERT = "endpoint_alert"
    SESSION_TOKEN_ANOMALY = "session_token_anomaly"


class EventSeverity(StrEnum):
    INFORMATIONAL = "informational"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TransactionChannelCode(StrEnum):
    WEB_BANKING = "web_banking"
    MOBILE_BANKING = "mobile_banking"


class TransactionStatus(StrEnum):
    PENDING = "pending"
    PERMITTED = "permitted"
    HELD = "held"
    RELEASED = "released"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class IncidentStatus(StrEnum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    CONFIRMED_FRAUD = "confirmed_fraud"
    LEGITIMATE = "legitimate"
    CLOSED = "closed"


class Severity(StrEnum):
    LOW = "low"
    GUARDED = "guarded"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendedAction(StrEnum):
    ALLOW = "allow"
    ALLOW_AND_MONITOR = "allow_and_monitor"
    STEP_UP_AUTHENTICATION = "step_up_authentication"
    HOLD_FOR_REVIEW = "hold_for_review"
    HOLD_AND_OPEN_CRITICAL_INCIDENT = "hold_and_open_critical_incident"


class ContributionCategory(StrEnum):
    CYBER_RULE = "cyber_rule"
    CYBER_ANOMALY = "cyber_anomaly"
    TRANSACTION_RULE = "transaction_rule"
    TRANSACTION_ANOMALY = "transaction_anomaly"
    CORRELATION = "correlation"


class AnalystActionType(StrEnum):
    ADD_NOTE = "add_note"
    START_REVIEW = "start_review"
    MARK_CONFIRMED_FRAUD = "mark_confirmed_fraud"
    MARK_LEGITIMATE = "mark_legitimate"
    SIMULATE_HOLD = "simulate_hold"
    SIMULATE_RELEASE = "simulate_release"
    SIMULATE_DECLINE = "simulate_decline"
    CLOSE_INCIDENT = "close_incident"


class ScenarioKey(StrEnum):
    NORMAL_ACTIVITY = "normal_activity"
    LEGITIMATE_NEW_DEVICE = "legitimate_new_device"
    ACCOUNT_TAKEOVER = "account_takeover"


class ScenarioRunStatus(StrEnum):
    NOT_RUN = "not_run"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AlgorithmFamily(StrEnum):
    RSA = "rsa"
    ECC = "ecc"
    SYMMETRIC = "symmetric"
    ML_KEM = "ml_kem"
    ML_DSA = "ml_dsa"
    HYBRID = "hybrid"
    OTHER = "other"


class DataSensitivity(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class MigrationStatus(StrEnum):
    NOT_ASSESSED = "not_assessed"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    PQC_READY = "pqc_ready"


class QuantumPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AuditEventType(StrEnum):
    AUTHENTICATION_SUCCEEDED = "authentication_succeeded"
    AUTHENTICATION_FAILED = "authentication_failed"
    AUTHORIZATION_DENIED = "authorization_denied"
    INCIDENT_CREATED = "incident_created"
    SCORE_GENERATED = "score_generated"
    RECOMMENDATION_GENERATED = "recommendation_generated"
    ANALYST_ACTION_RECORDED = "analyst_action_recorded"
    SCENARIO_STARTED = "scenario_started"
    SCENARIO_COMPLETED = "scenario_completed"
    SCENARIO_FAILED = "scenario_failed"
    SCENARIO_RESET = "scenario_reset"
