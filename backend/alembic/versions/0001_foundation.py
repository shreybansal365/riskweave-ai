"""Create the Milestone 1 migration foundation.

Revision ID: 0001_foundation
Revises:
Create Date: 2026-07-14 09:00:00
"""

from collections.abc import Sequence

revision: str = "0001_foundation"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Record the foundation revision without adding business entities."""


def downgrade() -> None:
    """Remove the foundation revision without dropping business entities."""
