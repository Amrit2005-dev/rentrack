from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TDSCreate(BaseModel):
    client_id: UUID
    invoice_id: Optional[UUID] = None
    financial_year: str = Field(..., max_length=9, description="E.g., 2023-2024")
    tds_percentage: float = Field(..., ge=0)
    deducted_amount: float = Field(..., ge=0)
    certificate_number: Optional[str] = Field(None, max_length=100)


class TDSUpdate(BaseModel):
    certificate_number: Optional[str] = Field(None, max_length=100)
    # certificate URL updated via separate endpoint


class TDSResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    client_id: UUID
    invoice_id: Optional[UUID]
    financial_year: str
    tds_percentage: float
    deducted_amount: float
    certificate_number: Optional[str]
    certificate_url: Optional[str]
    created_at: datetime
    updated_at: datetime
