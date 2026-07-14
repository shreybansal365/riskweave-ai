from __future__ import annotations

from ipaddress import ip_address
from uuid import UUID


def masked_uuid(value: UUID, *, prefix: str) -> str:
    """Return a stable display reference without presenting a full identifier."""

    return f"{prefix}-••••-{value.hex[-8:].upper()}"


def masked_ip(value: str) -> str:
    """Mask a documentation-safe IP while retaining enough context for an analyst."""

    parsed = ip_address(value)
    if parsed.version == 4:
        parts = value.split(".")
        return f"{parts[0]}.{parts[1]}.xxx.xxx"
    exploded = parsed.exploded.split(":")
    return ":".join([*exploded[:2], "xxxx", "xxxx", "xxxx", "xxxx", "xxxx", "xxxx"])


def masked_bank_code(value: str) -> str:
    if len(value) <= 4:
        return "•" * len(value)
    return f"{value[:2]}{'•' * (len(value) - 4)}{value[-2:]}"
