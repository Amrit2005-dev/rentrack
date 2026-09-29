# TMS Backend — trip.py (ORM Model)
# Module: 3 — Admin/User Core | Path: app/models/trip.py
# Purpose: trips, trip_receipts, notifications tables

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ─── Trip Status Enum ─────────────────────────────────────────────────────────
class TripStatus(str, enum.Enum):
    upcoming = "upcoming"
    in_progress = "in_progress"
    driver_reached = "driver_reached"
    completed = "completed"
    cancelled = "cancelled"


# ─── Notification Type Enum ───────────────────────────────────────────────────
class NotificationType(str, enum.Enum):
    trip = "trip"
    approval = "approval"
    system = "system"
    account = "account"


# ─── Trip ─────────────────────────────────────────────────────────────────────
class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Route
    origin = Column(String(255), nullable=True)
    destination = Column(String(255), nullable=True)
    load_details = Column(JSONB, nullable=True)   # {"description": "...", "items": [...]}

    # Metrics
    distance_km = Column(Numeric(10, 2), nullable=True)
    weight_tons = Column(Numeric(10, 2), nullable=True)

    # Revenue breakdown — all stored for immutable financial records
    base_fare = Column(Numeric(12, 2), nullable=True)
    distance_charge = Column(Numeric(12, 2), nullable=True)
    weight_charge = Column(Numeric(12, 2), nullable=True)
    waiting_charge = Column(Numeric(12, 2), nullable=True)
    toll_charge = Column(Numeric(12, 2), nullable=True)
    extra_charge = Column(Numeric(12, 2), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=True)
    gst_amount = Column(Numeric(12, 2), nullable=True)
    final_amount = Column(Numeric(12, 2), nullable=True)

    # Status lifecycle
    status = Column(
        Enum(TripStatus, name="trip_status_enum"),
        nullable=False,
        default=TripStatus.upcoming,
        server_default=TripStatus.upcoming.value,
        index=True,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    reached_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    vehicle = relationship("Vehicle", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")
    client = relationship("Client", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    receipt = relationship("TripReceipt", back_populates="trip", uselist=False, lazy="selectin")

    def __repr__(self) -> str:
        return f"<Trip id={self.id} status={self.status}>"


# ─── Trip Receipt ─────────────────────────────────────────────────────────────
class TripReceipt(Base):
    __tablename__ = "trip_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    trip_id = Column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one receipt per trip
        index=True,
    )
    receiver_name = Column(String(200), nullable=True)
    receiver_otp_hash = Column(String(255), nullable=True)  # OTP verified at delivery
    received_at = Column(DateTime(timezone=True), nullable=True)
    image_url = Column(String(512), nullable=True)          # S3 URL for receipt photo
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="receipt")


# ─── Notification ─────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # nullable = broadcast to all company users
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(
        Enum(NotificationType, name="notification_type_enum"),
        nullable=False,
        default=NotificationType.system,
    )
    is_read = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<Notification id={self.id} type={self.type} read={self.is_read}>"
