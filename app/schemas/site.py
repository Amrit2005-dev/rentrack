from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SiteCreate(BaseModel):
    site_name: str = Field(..., max_length=255)
    address_line_1: str = Field(..., max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., max_length=100)
    state: str = Field(..., max_length=100)
    pincode: str = Field(..., max_length=20)
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=20)


class SiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    client_id: UUID
    site_name: str
    address_line_1: str
    address_line_2: Optional[str]
    city: str
    state: str
    pincode: str
    contact_person: Optional[str]
    contact_number: Optional[str]
    created_at: datetime
    updated_at: datetime
