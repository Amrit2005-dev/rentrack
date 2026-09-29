from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payment_mode: str = Field(..., max_length=50)
    reference_no: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)
    invoice_id: Optional[UUID] = None


class LedgerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    client_id: UUID
    entry_type: str  # 'debit' or 'credit'
    amount: float
    balance_after: float
    reference_id: Optional[UUID]
    reference_type: Optional[str]  # e.g., 'invoice', 'payment'
    notes: Optional[str]
    created_at: datetime
