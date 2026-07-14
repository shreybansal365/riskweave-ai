"""add intelligence persistence support

Revision ID: 0003_intelligence_support
Revises: 0002_domain_security
Create Date: 2026-07-14 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_intelligence_support"
down_revision: str | Sequence[str] | None = "0002_domain_security"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add deterministic baseline context and explainable incident persistence."""

    op.add_column(
        "behavioural_baselines",
        sa.Column(
            "known_device_ids",
            postgresql.ARRAY(sa.UUID()),
            server_default=sa.text("'{}'::uuid[]"),
            nullable=False,
        ),
    )
    op.add_column(
        "behavioural_baselines",
        sa.Column(
            "known_beneficiary_ids",
            postgresql.ARRAY(sa.UUID()),
            server_default=sa.text("'{}'::uuid[]"),
            nullable=False,
        ),
    )
    op.add_column(
        "behavioural_baselines",
        sa.Column(
            "usual_destination_risks",
            postgresql.ARRAY(sa.String(length=16)),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
    )
    op.add_column(
        "behavioural_baselines",
        sa.Column(
            "typical_transaction_velocity_30m",
            sa.Numeric(precision=8, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        op.f("ck_behavioural_baselines_velocity_30m_nonnegative"),
        "behavioural_baselines",
        "typical_transaction_velocity_30m >= 0",
    )
    op.create_unique_constraint(
        "uq_behavioural_baselines_customer",
        "behavioural_baselines",
        ["customer_id"],
    )

    op.add_column(
        "incidents",
        sa.Column(
            "raw_fused_score",
            sa.Numeric(precision=6, scale=2),
            server_default=sa.text("0.00"),
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column("summary", sa.Text(), server_default="Legacy incident", nullable=False),
    )
    op.add_column(
        "incidents",
        sa.Column(
            "signal_narrative",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column(
            "decision_explanation",
            sa.Text(),
            server_default="Legacy incident created before Milestone 3",
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column(
            "action_explanation",
            sa.Text(),
            server_default="Review the stored recommendation",
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column("engine_version", sa.String(length=64), server_default="legacy", nullable=False),
    )
    op.add_column(
        "incidents",
        sa.Column("model_version", sa.String(length=64), server_default="legacy", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_incidents_raw_fused_score_range"),
        "incidents",
        "raw_fused_score BETWEEN 0 AND 100",
    )
    for column_name in (
        "raw_fused_score",
        "summary",
        "decision_explanation",
        "action_explanation",
        "engine_version",
        "model_version",
    ):
        op.alter_column("incidents", column_name, server_default=None)

    op.add_column(
        "risk_contributions", sa.Column("source_transaction_id", sa.UUID(), nullable=True)
    )
    op.add_column("risk_contributions", sa.Column("source_baseline_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f("fk_risk_contributions_source_transaction_id_transactions"),
        "risk_contributions",
        "transactions",
        ["source_transaction_id"],
        ["transaction_id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("fk_risk_contributions_source_baseline_id_behavioural_baselines"),
        "risk_contributions",
        "behavioural_baselines",
        ["source_baseline_id"],
        ["baseline_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Remove Milestone 3 persistence additions."""

    op.drop_constraint(
        op.f("fk_risk_contributions_source_baseline_id_behavioural_baselines"),
        "risk_contributions",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("fk_risk_contributions_source_transaction_id_transactions"),
        "risk_contributions",
        type_="foreignkey",
    )
    op.drop_column("risk_contributions", "source_baseline_id")
    op.drop_column("risk_contributions", "source_transaction_id")

    op.drop_constraint(op.f("ck_incidents_raw_fused_score_range"), "incidents", type_="check")
    op.drop_column("incidents", "model_version")
    op.drop_column("incidents", "engine_version")
    op.drop_column("incidents", "action_explanation")
    op.drop_column("incidents", "decision_explanation")
    op.drop_column("incidents", "signal_narrative")
    op.drop_column("incidents", "summary")
    op.drop_column("incidents", "raw_fused_score")

    op.drop_constraint("uq_behavioural_baselines_customer", "behavioural_baselines", type_="unique")
    op.drop_constraint(
        op.f("ck_behavioural_baselines_velocity_30m_nonnegative"),
        "behavioural_baselines",
        type_="check",
    )
    op.drop_column("behavioural_baselines", "typical_transaction_velocity_30m")
    op.drop_column("behavioural_baselines", "usual_destination_risks")
    op.drop_column("behavioural_baselines", "known_beneficiary_ids")
    op.drop_column("behavioural_baselines", "known_device_ids")
