from __future__ import annotations

import enum
from datetime import date
from uuid import uuid4

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PhysicalChallanStatus(str, enum.Enum):
    pending_verification = "pending_verification"
    verified = "verified"
    rejected = "rejected"


class PhysicalChallan(Base):
    __tablename__ = "physical_challans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    challan_number = Column(String(50), nullable=False, index=True)
    challan_date = Column(Date, default=date.today, nullable=False)
    
    # Optional mapping if it belongs to an existing client/vehicle
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    status = Column(
        Enum(PhysicalChallanStatus, name="physical_challan_status_enum"),
        nullable=False,
        default=PhysicalChallanStatus.pending_verification,
    )
    
    image_url = Column(String(255), nullable=True)
    notes = Column(String(500), nullable=True)
    
    verified_by = Column(
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
    company = relationship("Company")
    client = relationship("Client")
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
    verifier = relationship("User", foreign_keys=[verified_by])
