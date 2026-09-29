# TMS Backend — ledger.py (ORM Model — STUB)
# Module: Stub for Module 4 FK integrity | Path: app/models/ledger.py
# Purpose: ledger_entries table stub — will be expanded in Module 6

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class LedgerEntryType(str, enum.Enum):
    debit = "debit"
    credit = "credit"
    invoice = "invoice"
    payment = "payment"


class LedgerEntry(Base):
    """Minimal ledger entry stub. Full version in Module 6."""
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entry_type = Column(
        Enum(LedgerEntryType, name="ledger_entry_type_enum"),
        nullable=False,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    reference_no = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    entry_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<LedgerEntry id={self.id} type={self.entry_type} amount={self.amount}>"
