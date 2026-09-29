# TMS Backend — driver.py (Pydantic Schemas)
# Module: 3 — Admin/User Core | Path: app/schemas/driver.py

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DriverLogin(BaseModel):
    """Sign-in details for the driver app, created together with the driver."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class DriverCreate(BaseModel):
    full_name: str = Field(..., max_length=200)
    mobile: str = Field(..., max_length=15)
    license_number: str = Field(..., max_length=50)
    license_expiry: Optional[date] = None
    user_id: Optional[UUID] = Field(None, description="Link to TMS user account (optional)")
    assigned_vehicle_id: Optional[UUID] = None
    availability: Optional[str] = "available"
    # Added by an admin, who is the approver — so approved unless they say otherwise.
    status: Optional[str] = "approved"
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_mobile: Optional[str] = Field(None, max_length=15)
    login: Optional[DriverLogin] = None


class DriverUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    mobile: Optional[str] = Field(None, max_length=15)
    license_number: Optional[str] = Field(None, max_length=50)
    license_expiry: Optional[date] = None
    assigned_vehicle_id: Optional[UUID] = None
    availability: Optional[str] = None
    status: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_mobile: Optional[str] = Field(None, max_length=15)


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    user_id: Optional[UUID]
    full_name: str
    mobile: str
    license_number: str
    license_expiry: Optional[date]
    license_document_url: Optional[str]
    assigned_vehicle_id: Optional[UUID]
    availability: str
    status: str
    emergency_contact_name: Optional[str]
    emergency_contact_mobile: Optional[str]
    created_at: datetime
    updated_at: datetime
