"""Add email and password_hash to users table for email+password 2FA auth

Revision ID: 011
Revises: 010
Create Date: 2026-09-20

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column — nullable so existing OTP-only rows are unaffected.
    # The unique index is partial (WHERE email IS NOT NULL) to allow multiple
    # NULL rows while still enforcing uniqueness for real email values.
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password_hash', sa.Text(), nullable=True))

    # Create unique index for email (only where not null)
    op.create_index(
        'ix_users_email',
        'users',
        ['email'],
        unique=True,
        postgresql_where=sa.text('email IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')
