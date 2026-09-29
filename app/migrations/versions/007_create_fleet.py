"""Create vehicles, drivers tables

Revision ID: 007
Revises: 006
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vehicles ───────────────────────────────────────────────────────────
    op.create_table(
        "vehicles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("registration_no", sa.String(20), unique=True, nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("capacity_tons", sa.Numeric(8, 2), nullable=True),
        sa.Column("rc_expiry", sa.Date, nullable=True),
        sa.Column("insurance_expiry", sa.Date, nullable=True),
        sa.Column("fitness_expiry", sa.Date, nullable=True),
        sa.Column("pollution_expiry", sa.Date, nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "inactive", "in_trip", name="vehicle_status_enum"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_vehicles_company_id", "vehicles", ["company_id"])
    op.create_index("ix_vehicles_registration_no", "vehicles", ["registration_no"])

    # ── drivers ────────────────────────────────────────────────────────────
    op.create_table(
        "drivers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("mobile", sa.String(15), nullable=False),
        sa.Column("license_number", sa.String(50), unique=True, nullable=False),
        sa.Column("license_expiry", sa.Date, nullable=True),
        sa.Column("assigned_vehicle_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "availability",
            sa.Enum("available", "on_trip", "off_duty", name="driver_availability_enum"),
            nullable=False,
            server_default="available",
        ),
        sa.Column("emergency_contact_name", sa.String(100), nullable=True),
        sa.Column("emergency_contact_mobile", sa.String(15), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["assigned_vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_drivers_company_id", "drivers", ["company_id"])
    op.create_index("ix_drivers_license_number", "drivers", ["license_number"])


def downgrade() -> None:
    op.drop_table("drivers")
    op.drop_table("vehicles")
    op.execute("DROP TYPE IF EXISTS vehicle_status_enum")
    op.execute("DROP TYPE IF EXISTS driver_availability_enum")
