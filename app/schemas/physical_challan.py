from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PhysicalChallanCreate(BaseModel):
    challan_number: str = Field(..., max_length=50)
    challan_date: date
    client_id: Optional[UUID] = None
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=500)


class PhysicalChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    challan_number: str
    challan_date: date
    client_id: Optional[UUID]
    vehicle_id: Optional[UUID]
    driver_id: Optional[UUID]
    status: str
    image_url: Optional[str]
    notes: Optional[str]
    verified_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
