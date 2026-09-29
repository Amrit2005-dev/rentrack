from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    description: str = Field(..., max_length=255)
    amount: float = Field(..., ge=0)
    trip_id: Optional[UUID] = None
    challan_id: Optional[UUID] = None


class InvoiceCreate(BaseModel):
    client_id: UUID
    due_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)
    items: List[InvoiceItemCreate] = Field(..., min_length=1)
    # GST and TDS percentages can be supplied if calculated at creation
    gst_percentage: float = Field(0.0, ge=0)
    tds_percentage: float = Field(0.0, ge=0)


class InvoiceUpdateStatus(BaseModel):
    status: str = Field(..., description="E.g., paid, partial, cancelled")
    paid_amount: Optional[float] = Field(None, ge=0)


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    description: str
    amount: float
    trip_id: Optional[UUID]
    challan_id: Optional[UUID]


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    client_id: UUID
    invoice_number: str
    status: str
    total_amount: float
    gst_amount: float
    tds_amount: float
    final_amount: float
    paid_amount: float
    due_date: Optional[datetime]
    notes: Optional[str]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    items: List[InvoiceItemResponse]
