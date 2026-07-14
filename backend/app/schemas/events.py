from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CyberEventType, DevicePosture


class EventAttributes(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginSuccessAttributes(EventAttributes):
    authentication_method: Literal["password_mfa"] = "password_mfa"
    browser_fingerprint: str = Field(min_length=8, max_length=128)


class LoginFailedAttributes(EventAttributes):
    reason: Literal["invalid_credentials", "locked_account"] = "invalid_credentials"


class MfaSuccessAttributes(EventAttributes):
    method: Literal["totp", "push"] = "totp"


class MfaFailedAttributes(EventAttributes):
    attempts: int = Field(ge=1, le=10)


class NewDeviceAttributes(EventAttributes):
    first_seen_fingerprint: bool
    device_posture: DevicePosture


class RiskyIpAttributes(EventAttributes):
    risk_source: Literal["reputation_fixture"] = "reputation_fixture"


class ProxyAttributes(EventAttributes):
    proxy_type: Literal["hosting", "anonymous"]


class UnusualLocationAttributes(EventAttributes):
    previous_city: str = Field(min_length=1, max_length=100)
    distance_km: int = Field(ge=1, le=20000)


class ImpossibleTravelAttributes(EventAttributes):
    distance_km: int = Field(ge=1, le=20000)
    elapsed_minutes: int = Field(ge=1, le=1440)


class UnusualLoginTimeAttributes(EventAttributes):
    deviation_hours: float = Field(gt=0, le=24)


class EndpointAlertAttributes(EventAttributes):
    alert_code: Literal["synthetic_malware_indicator"] = "synthetic_malware_indicator"


class SessionTokenAnomalyAttributes(EventAttributes):
    anomaly_type: Literal["unexpected_reuse", "rotation_mismatch"]


_ATTRIBUTE_SCHEMAS: dict[CyberEventType, type[EventAttributes]] = {
    CyberEventType.LOGIN_SUCCESS: LoginSuccessAttributes,
    CyberEventType.LOGIN_FAILED: LoginFailedAttributes,
    CyberEventType.MFA_SUCCESS: MfaSuccessAttributes,
    CyberEventType.MFA_FAILED: MfaFailedAttributes,
    CyberEventType.NEW_DEVICE: NewDeviceAttributes,
    CyberEventType.RISKY_IP: RiskyIpAttributes,
    CyberEventType.PROXY_DETECTED: ProxyAttributes,
    CyberEventType.UNUSUAL_LOCATION: UnusualLocationAttributes,
    CyberEventType.IMPOSSIBLE_TRAVEL: ImpossibleTravelAttributes,
    CyberEventType.UNUSUAL_LOGIN_TIME: UnusualLoginTimeAttributes,
    CyberEventType.ENDPOINT_ALERT: EndpointAlertAttributes,
    CyberEventType.SESSION_TOKEN_ANOMALY: SessionTokenAnomalyAttributes,
}


def validate_event_attributes(
    event_type: CyberEventType,
    attributes: dict[str, object],
) -> dict[str, object]:
    """Validate event-specific JSON before persistence."""

    model = _ATTRIBUTE_SCHEMAS[event_type].model_validate(attributes)
    return model.model_dump(mode="json")
