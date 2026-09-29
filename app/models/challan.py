# TMS Backend — challan.py (ORM Model)
# Module: 4 — Challan | Path: app/models/challan.py
# Purpose: challans, challan_items tables

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ChallanStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    approved = "approved"


class Challan(Base):
    __tablename__ = "challans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    challan_date = Column(Date, nullable=False, index=True)
    total_hours = Column(Numeric(8, 2), nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=False, server_default="0")
    status = Column(
        Enum(ChallanStatus, name="challan_status_enum"),
        nullable=False,
        default=ChallanStatus.draft,
        server_default=ChallanStatus.draft.value,
        index=True,
    )
    sms_sent_at = Column(DateTime(timezone=True), nullable=True)
    pdf_url = Column(String(512), nullable=True)
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
    client = relationship("Client", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    items = relationship("ChallanItem", back_populates="challan", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Challan id={self.id} date={self.challan_date} status={self.status}>"


class ChallanItem(Base):
    __tablename__ = "challan_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    challan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("challans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
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
    running_hours = Column(Numeric(8, 2), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    challan = relationship("Challan", back_populates="items")
    vehicle = relationship("Vehicle", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ChallanItem challan={self.challan_id} hours={self.running_hours} amount={self.amount}>"
