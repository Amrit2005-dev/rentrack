# TMS Backend — vehicle.py (Pydantic Schemas)
# Module: 3 — Admin/User Core | Path: app/schemas/vehicle.py

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VehicleCreate(BaseModel):
    registration_no: str = Field(..., max_length=20, description="Vehicle registration plate")
    type: str = Field(..., max_length=100, description="Vehicle type (e.g. Truck, Crane)")
    capacity_tons: Optional[float] = Field(None, ge=0)
    rc_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    pollution_expiry: Optional[date] = None
    rc_number: Optional[str] = Field(None, max_length=50)
    insurance_number: Optional[str] = Field(None, max_length=50)


class VehicleUpdate(BaseModel):
    type: Optional[str] = Field(None, max_length=100)
    capacity_tons: Optional[float] = Field(None, ge=0)
    rc_expiry: Optional[date] = None
    insurance_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    pollution_expiry: Optional[date] = None
    rc_number: Optional[str] = Field(None, max_length=50)
    insurance_number: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = None


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    registration_no: str
    type: str
    capacity_tons: Optional[float]
    rc_expiry: Optional[date]
    insurance_expiry: Optional[date]
    fitness_expiry: Optional[date]
    pollution_expiry: Optional[date]
    status: str
    image_url: Optional[str]
    rc_number: Optional[str] = None
    insurance_number: Optional[str] = None
    rc_document_url: Optional[str] = None
    insurance_document_url: Optional[str] = None
    fitness_document_url: Optional[str] = None
    puc_document_url: Optional[str] = None
    # Computed expiry status fields (set by service layer)
    rc_expiry_status: Optional[str] = None
    insurance_expiry_status: Optional[str] = None
    fitness_expiry_status: Optional[str] = None
    pollution_expiry_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
