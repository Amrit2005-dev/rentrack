"""Create companies, registration_requests, approval_history + add FK from users.company_id

Revision ID: 002
Revises: 001
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── companies ──────────────────────────────────────────────────────────
    op.create_table(
        "companies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_companies_name", "companies", ["name"])

    # Now add the FK from users.company_id → companies.id
    op.create_foreign_key(
        "fk_users_company_id",
        "users",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ── registration_requests ──────────────────────────────────────────────
    op.create_table(
        "registration_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="registration_status_enum"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("rejection_reason", sa.String(500), nullable=True),
        sa.Column("reviewed_by", UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_registration_requests_user_id", "registration_requests", ["user_id"])
    op.create_index("ix_registration_requests_company_id", "registration_requests", ["company_id"])

    # ── approval_history ───────────────────────────────────────────────────
    op.create_table(
        "approval_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("registration_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "action",
            sa.Enum("submitted", "approved", "rejected", "role_changed", name="approval_action_enum"),
            nullable=False,
        ),
        sa.Column("performed_by", UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["registration_id"], ["registration_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["performed_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_approval_history_registration_id", "approval_history", ["registration_id"])


def downgrade() -> None:
    op.drop_table("approval_history")
    op.drop_table("registration_requests")
    op.drop_constraint("fk_users_company_id", "users", type_="foreignkey")
    op.drop_table("companies")
    op.execute("DROP TYPE IF EXISTS registration_status_enum")
    op.execute("DROP TYPE IF EXISTS approval_action_enum")
