"""Add status to companies

Revision ID: 012
Revises: 21f5d7069dd6
Create Date: 2026-09-23

Companies had no state of their own, so an approved company still read as
onboarding. Existing rows are already live, hence the 'active' default.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '012'
down_revision: Union[str, None] = '21f5d7069dd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'companies',
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
    )
    op.create_index('ix_companies_status', 'companies', ['status'])


def downgrade() -> None:
    op.drop_index('ix_companies_status', table_name='companies')
    op.drop_column('companies', 'status')
