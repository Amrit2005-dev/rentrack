# TMS Backend — quotation.py (ORM Model)
# Module: 5 — Quotation | Path: app/models/quotation.py
# Purpose: quotations, terms_templates tables

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class QuotationStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class TermsTemplate(Base):
    __tablename__ = "terms_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company = relationship("Company", lazy="selectin")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    quotation_number = Column(String(30), unique=True, nullable=False, index=True)
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
    machine_type = Column(String(100), nullable=True)
    package_details = Column(Text, nullable=True)
    base_rate = Column(Numeric(12, 2), nullable=True)
    per_km_rate = Column(Numeric(10, 2), nullable=True)
    per_ton_rate = Column(Numeric(10, 2), nullable=True)
    total_rate = Column(Numeric(12, 2), nullable=True)
    validity_date = Column(Date, nullable=True)
    terms_id = Column(
        UUID(as_uuid=True),
        ForeignKey("terms_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    custom_terms = Column(Text, nullable=True)
    status = Column(
        Enum(QuotationStatus, name="quotation_status_enum"),
        nullable=False,
        default=QuotationStatus.draft,
        server_default=QuotationStatus.draft.value,
        index=True,
    )
    # Set when the quotation is converted to a trip
    trip_id = Column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )
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
    terms = relationship("TermsTemplate", lazy="selectin")
    trip = relationship("Trip", foreign_keys=[trip_id], lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")

    def __repr__(self) -> str:
        return f"<Quotation id={self.id} number={self.quotation_number!r} status={self.status}>"
