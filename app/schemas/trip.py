# TMS Backend — trip.py (Pydantic Schemas)
# Module: 3 — Admin/User Core | Path: app/schemas/trip.py

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TripCreate(BaseModel):
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    client_id: Optional[UUID] = None
    origin: Optional[str] = Field(None, max_length=255)
    destination: Optional[str] = Field(None, max_length=255)
    load_details: Optional[Dict[str, Any]] = None
    distance_km: Optional[Decimal] = Field(None, ge=0)
    weight_tons: Optional[Decimal] = Field(None, ge=0)
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    toll_charge: Optional[Decimal] = Field(None, ge=0)
    extra_charge: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    # Optional: pre-fill base_fare from quotation conversion
    base_fare: Optional[Decimal] = Field(None, ge=0)
    scheduled_at: Optional[datetime] = None


class TripSettle(BaseModel):
    """Used on POST /trips/{id}/settle to finalize financial fields"""
    distance_km: Decimal = Field(..., ge=0)
    weight_tons: Decimal = Field(..., ge=0)
    waiting_hours: Decimal = Field(Decimal("0"), ge=0)
    toll_charge: Decimal = Field(Decimal("0"), ge=0)
    extra_charge: Decimal = Field(Decimal("0"), ge=0)
    gst_rate: Decimal = Field(Decimal("0"), ge=0, le=100)


class ReceiptCreate(BaseModel):
    receiver_name: Optional[str] = Field(None, max_length=200)
    receiver_otp: Optional[str] = Field(None, min_length=4, max_length=8)
    image_url: Optional[str] = Field(None, max_length=512)


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vehicle_id: Optional[UUID]
    driver_id: Optional[UUID]
    client_id: Optional[UUID]
    origin: Optional[str]
    destination: Optional[str]
    load_details: Optional[Dict[str, Any]]
    distance_km: Optional[Decimal]
    weight_tons: Optional[Decimal]
    base_fare: Optional[Decimal]
    distance_charge: Optional[Decimal]
    weight_charge: Optional[Decimal]
    waiting_charge: Optional[Decimal]
    toll_charge: Optional[Decimal]
    extra_charge: Optional[Decimal]
    gst_rate: Optional[Decimal]
    gst_amount: Optional[Decimal]
    final_amount: Optional[Decimal]
    status: str
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    reached_at: Optional[datetime]
    completed_at: Optional[datetime]
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class ReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    receiver_name: Optional[str]
    received_at: Optional[datetime]
    image_url: Optional[str]
    created_at: datetime
