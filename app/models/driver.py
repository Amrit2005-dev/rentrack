# TMS Backend — driver.py (ORM Model)
# Module: 3 — Admin/User Core | Path: app/models/driver.py
# Purpose: drivers table

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DriverStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    inactive = "inactive"


class DriverAvailability(str, enum.Enum):
    available = "available"
    on_trip = "on_trip"
    off_duty = "off_duty"


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional link to a TMS user account
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    full_name = Column(String(200), nullable=False)
    mobile = Column(String(15), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False, index=True)
    license_expiry = Column(Date, nullable=True)
    license_document_url = Column(String(500), nullable=True)
    assigned_vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    availability = Column(
        Enum(DriverAvailability, name="driver_availability_enum"),
        nullable=False,
        default=DriverAvailability.available,
        server_default=DriverAvailability.available.value,
    )
    status = Column(
        Enum(DriverStatus, name="driver_status_enum"),
        nullable=False,
        default=DriverStatus.pending,
        server_default=DriverStatus.pending.value,
    )
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_mobile = Column(String(15), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    assigned_vehicle = relationship(
        "Vehicle", back_populates="drivers", foreign_keys=[assigned_vehicle_id], lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Driver id={self.id} name={self.full_name!r} availability={self.availability}>"
