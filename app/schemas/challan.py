# TMS Backend — challan.py (Pydantic Schemas)
# Module: 4 — Challan | Path: app/schemas/challan.py

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChallanItemCreate(BaseModel):
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    running_hours: Decimal = Field(..., ge=0)


class ChallanCreate(BaseModel):
    client_id: Optional[UUID] = None
    challan_date: date
    items: List[ChallanItemCreate] = Field(..., min_length=1)


class ChallanItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: Optional[UUID]
    driver_id: Optional[UUID]
    running_hours: Decimal
    amount: Decimal
    created_at: datetime


class ChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    client_id: Optional[UUID]
    challan_date: date
    total_hours: Optional[Decimal]
    total_amount: Decimal
    status: str
    sms_sent_at: Optional[datetime]
    pdf_url: Optional[str]
    items: List[ChallanItemResponse] = []
    created_at: datetime
    updated_at: datetime


class CalendarEntry(BaseModel):
    """Per-day summary for the calendar view"""
    challan_date: date
    challan_count: int
    total_amount: Decimal
    statuses: List[str]


class ChallanUpdate(BaseModel):
    """Only draft challans can be edited"""
    client_id: Optional[UUID] = None
    challan_date: Optional[date] = None
    items: Optional[List[ChallanItemCreate]] = None
