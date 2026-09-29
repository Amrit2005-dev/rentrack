"""Create quotations, terms_templates tables

Revision ID: 010
Revises: 009
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── terms_templates ────────────────────────────────────────────────────
    op.create_table(
        "terms_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_terms_templates_company_id", "terms_templates", ["company_id"])

    # ── quotations ─────────────────────────────────────────────────────────
    op.create_table(
        "quotations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("quotation_number", sa.String(30), unique=True, nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), nullable=True),
        sa.Column("machine_type", sa.String(100), nullable=True),
        sa.Column("package_details", sa.Text, nullable=True),
        sa.Column("base_rate", sa.Numeric(12, 2), nullable=True),
        sa.Column("per_km_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("per_ton_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column("total_rate", sa.Numeric(12, 2), nullable=True),
        sa.Column("validity_date", sa.Date, nullable=True),
        sa.Column("terms_id", UUID(as_uuid=True), nullable=True),
        sa.Column("custom_terms", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "sent", "accepted", "rejected", "expired", name="quotation_status_enum"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("trip_id", UUID(as_uuid=True), nullable=True),
        sa.Column("pdf_url", sa.String(512), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["terms_id"], ["terms_templates.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_quotations_company_id", "quotations", ["company_id"])
    op.create_index("ix_quotations_status", "quotations", ["status"])
    op.create_index("ix_quotations_quotation_number", "quotations", ["quotation_number"])


def downgrade() -> None:
    op.drop_table("quotations")
    op.drop_table("terms_templates")
    op.execute("DROP TYPE IF EXISTS quotation_status_enum")
