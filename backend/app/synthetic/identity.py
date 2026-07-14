from uuid import NAMESPACE_URL, UUID, uuid5

IDENTITY_PREFIX = "https://riskweave.ai/demo/v1"


def deterministic_uuid(entity_type: str, stable_key: str) -> UUID:
    """Return the repository-wide UUIDv5 identity for synthetic records."""

    return uuid5(NAMESPACE_URL, f"{IDENTITY_PREFIX}/{entity_type}/{stable_key}")
