"""Add RC/insurance numbers and document scans to vehicles

Revision ID: 013
Revises: 012
Create Date: 2026-09-23

The vehicle form collected RC and insurance numbers with nowhere to store
them, and had no way to attach the documents themselves.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNS = [
    ('rc_number', 50),
    ('insurance_number', 50),
    ('rc_document_url', 512),
    ('insurance_document_url', 512),
    ('fitness_document_url', 512),
    ('puc_document_url', 512),
]


def upgrade() -> None:
    for name, length in COLUMNS:
        op.add_column('vehicles', sa.Column(name, sa.String(length=length), nullable=True))


def downgrade() -> None:
    for name, _ in reversed(COLUMNS):
        op.drop_column('vehicles', name)
