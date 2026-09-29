"""Create audit_logs table

Revision ID: 006
Revises: 005
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "action",
            sa.Enum("create", "update", "delete", "status_change", name="audit_action_enum"),
            nullable=False,
        ),
        sa.Column("changed_by", UUID(as_uuid=True), nullable=True),
        sa.Column("old_value", JSONB, nullable=True),
        sa.Column("new_value", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["changed_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_logs_table_name", "audit_logs", ["table_name"])
    op.create_index("ix_audit_logs_record_id", "audit_logs", ["record_id"])
    op.create_index("ix_audit_logs_changed_by", "audit_logs", ["changed_by"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.execute("DROP TYPE IF EXISTS audit_action_enum")
