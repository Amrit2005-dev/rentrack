"""Create rate_cards stub table (with per_hour_rate for challan billing)

Revision ID: 004
Revises: 003
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rate_cards",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), nullable=True),
        sa.Column("vehicle_type", sa.String(100), nullable=False),
        sa.Column("base_fare", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("per_km_rate", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("per_ton_rate", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("per_hour_rate", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("waiting_rate", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_rate_cards_company_id", "rate_cards", ["company_id"])
    op.create_index("ix_rate_cards_client_id", "rate_cards", ["client_id"])


def downgrade() -> None:
    op.drop_table("rate_cards")
