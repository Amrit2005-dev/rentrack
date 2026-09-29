"""Create ledger_entries stub table

Revision ID: 005
Revises: 004
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ledger_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "entry_type",
            sa.Enum("debit", "credit", "invoice", "payment", name="ledger_entry_type_enum"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("reference_no", sa.String(255), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_ledger_entries_client_id", "ledger_entries", ["client_id"])


def downgrade() -> None:
    op.drop_table("ledger_entries")
    op.execute("DROP TYPE IF EXISTS ledger_entry_type_enum")
