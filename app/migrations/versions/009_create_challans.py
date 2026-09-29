"""Create challans, challan_items tables

Revision ID: 009
Revises: 008
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── challans ───────────────────────────────────────────────────────────
    op.create_table(
        "challans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), nullable=True),
        sa.Column("challan_date", sa.Date, nullable=False),
        sa.Column("total_hours", sa.Numeric(8, 2), nullable=True),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum("draft", "sent", "approved", name="challan_status_enum"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("sms_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_url", sa.String(512), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_challans_company_id", "challans", ["company_id"])
    op.create_index("ix_challans_challan_date", "challans", ["challan_date"])
    op.create_index("ix_challans_status", "challans", ["status"])

    # ── challan_items ──────────────────────────────────────────────────────
    op.create_table(
        "challan_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("challan_id", UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_id", UUID(as_uuid=True), nullable=True),
        sa.Column("driver_id", UUID(as_uuid=True), nullable=True),
        sa.Column("running_hours", sa.Numeric(8, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["challan_id"], ["challans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_challan_items_challan_id", "challan_items", ["challan_id"])


def downgrade() -> None:
    op.drop_table("challan_items")
    op.drop_table("challans")
    op.execute("DROP TYPE IF EXISTS challan_status_enum")
