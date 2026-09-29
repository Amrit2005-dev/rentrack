"""Create trips, trip_receipts, notifications tables

Revision ID: 008
Revises: 007
Create Date: 2026-08-14

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── trips ──────────────────────────────────────────────────────────────
    op.create_table(
        "trips",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_id", UUID(as_uuid=True), nullable=True),
        sa.Column("driver_id", UUID(as_uuid=True), nullable=True),
        sa.Column("client_id", UUID(as_uuid=True), nullable=True),
        sa.Column("origin", sa.String(255), nullable=True),
        sa.Column("destination", sa.String(255), nullable=True),
        sa.Column("load_details", JSONB, nullable=True),
        sa.Column("distance_km", sa.Numeric(10, 2), nullable=True),
        sa.Column("weight_tons", sa.Numeric(10, 2), nullable=True),
        sa.Column("base_fare", sa.Numeric(12, 2), nullable=True),
        sa.Column("distance_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("weight_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("waiting_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("toll_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("extra_charge", sa.Numeric(12, 2), nullable=True),
        sa.Column("gst_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("gst_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("final_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "status",
            sa.Enum("upcoming", "in_progress", "driver_reached", "completed", "cancelled", name="trip_status_enum"),
            nullable=False,
            server_default="upcoming",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reached_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_trips_company_id", "trips", ["company_id"])
    op.create_index("ix_trips_driver_id", "trips", ["driver_id"])
    op.create_index("ix_trips_vehicle_id", "trips", ["vehicle_id"])
    op.create_index("ix_trips_status", "trips", ["status"])

    # ── trip_receipts ──────────────────────────────────────────────────────
    op.create_table(
        "trip_receipts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("trip_id", UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("receiver_name", sa.String(200), nullable=True),
        sa.Column("receiver_otp_hash", sa.String(255), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_trip_receipts_trip_id", "trip_receipts", ["trip_id"])

    # ── notifications ──────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column(
            "type",
            sa.Enum("trip", "approval", "system", "account", name="notification_type_enum"),
            nullable=False,
            server_default="system",
        ),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notifications_company_id", "notifications", ["company_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("trip_receipts")
    op.drop_table("trips")
    op.execute("DROP TYPE IF EXISTS trip_status_enum")
    op.execute("DROP TYPE IF EXISTS notification_type_enum")
