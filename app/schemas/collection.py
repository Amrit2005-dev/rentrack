from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CollectionCreate(BaseModel):
    driver_id: UUID
    trip_id: Optional[UUID] = None
    collection_date: date
    amount: float = Field(..., gt=0)
    payment_mode: str = Field(..., max_length=50)
    reference_no: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    driver_id: UUID
    trip_id: Optional[UUID]
    collection_date: date
    amount: float
    payment_mode: str
    reference_no: Optional[str]
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
