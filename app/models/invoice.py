from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    partial = "partial"
    paid = "paid"
    cancelled = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    status = Column(
        Enum(InvoiceStatus, name="invoice_status_enum"),
        nullable=False,
        default=InvoiceStatus.draft,
    )
    
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    gst_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tds_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    final_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    due_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(500), nullable=True)
    pdf_url = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    company = relationship("Company", backref="invoices")
    client = relationship("Client", backref="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    invoice_id = Column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Could link to trip_id or challan_id depending on the billing model
    trip_id = Column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
    )
    challan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("challans.id", ondelete="SET NULL"),
        nullable=True,
    )
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    trip = relationship("Trip")
    challan = relationship("Challan")
