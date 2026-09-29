"""Add manager and operator user roles.

Revision ID: 014
Revises: 013
Create Date: 2026-09-29
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'manager'")
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'operator'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values safely in place.
    pass
