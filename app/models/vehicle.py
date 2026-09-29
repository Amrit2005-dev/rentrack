# TMS Backend — vehicle.py (ORM Model)
# Module: 3 — Admin/User Core | Path: app/models/vehicle.py
# Purpose: vehicles table

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class VehicleStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    in_trip = "in_trip"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    registration_no = Column(String(20), unique=True, nullable=False, index=True)
    type = Column(String(100), nullable=False)                   # e.g. "Truck", "Crane"
    capacity_tons = Column(Numeric(8, 2), nullable=True)
    rc_expiry = Column(Date, nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    pollution_expiry = Column(Date, nullable=True)
    status = Column(
        Enum(VehicleStatus, name="vehicle_status_enum"),
        nullable=False,
        default=VehicleStatus.active,
        server_default=VehicleStatus.active.value,
    )
    image_url = Column(String(512), nullable=True)
    rc_number = Column(String(50), nullable=True)
    insurance_number = Column(String(50), nullable=True)
    # Scans (image or PDF) of each compliance document
    rc_document_url = Column(String(512), nullable=True)
    insurance_document_url = Column(String(512), nullable=True)
    fitness_document_url = Column(String(512), nullable=True)
    puc_document_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    drivers = relationship("Driver", back_populates="assigned_vehicle", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} reg={self.registration_no!r} status={self.status}>"
