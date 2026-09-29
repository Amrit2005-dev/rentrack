from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DriverCollection(Base):
    __tablename__ = "driver_collections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    trip_id = Column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    collection_date = Column(Date, default=date.today, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_mode = Column(String(50), nullable=False)  # e.g., "cash", "upi"
    reference_no = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    company = relationship("Company")
    driver = relationship("Driver")
    trip = relationship("Trip")
    creator = relationship("User")
