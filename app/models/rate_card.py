# TMS Backend — rate_card.py (ORM Model — STUB)
# Module: Stub for Modules 4+5 FK integrity | Path: app/models/rate_card.py
# Purpose: rate_cards table stub — will be expanded in Module 11

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class RateCard(Base):
    """
    Minimal rate_cards stub. Full version added in Module 11.
    Required now because Challan service looks up rate_card.per_hour_rate.
    """
    __tablename__ = "rate_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    # nullable → company-wide default rate card
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    vehicle_type = Column(String(100), nullable=False)
    base_fare = Column(Numeric(10, 2), default=0, nullable=False, server_default="0")
    per_km_rate = Column(Numeric(10, 2), default=0, nullable=False, server_default="0")
    per_ton_rate = Column(Numeric(10, 2), default=0, nullable=False, server_default="0")
    # per_hour_rate is used by challan calculation (not in original spec stub, added here)
    per_hour_rate = Column(Numeric(10, 2), default=0, nullable=False, server_default="0")
    waiting_rate = Column(Numeric(10, 2), default=0, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    client = relationship("Client", back_populates="rate_cards", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RateCard id={self.id} vehicle_type={self.vehicle_type!r}>"
