# TMS Backend — quotation.py (Pydantic Schemas)
# Module: 5 — Quotation | Path: app/schemas/quotation.py

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuotationCreate(BaseModel):
    client_id: Optional[UUID] = None
    machine_type: Optional[str] = Field(None, max_length=100)
    package_details: Optional[str] = None
    base_rate: Optional[Decimal] = Field(None, ge=0)
    per_km_rate: Optional[Decimal] = Field(None, ge=0)
    per_ton_rate: Optional[Decimal] = Field(None, ge=0)
    total_rate: Optional[Decimal] = Field(None, ge=0)
    validity_date: Optional[date] = None
    terms_id: Optional[UUID] = None
    custom_terms: Optional[str] = None


class QuotationUpdate(BaseModel):
    """Only draft quotations can be updated"""
    machine_type: Optional[str] = Field(None, max_length=100)
    package_details: Optional[str] = None
    base_rate: Optional[Decimal] = Field(None, ge=0)
    per_km_rate: Optional[Decimal] = Field(None, ge=0)
    per_ton_rate: Optional[Decimal] = Field(None, ge=0)
    total_rate: Optional[Decimal] = Field(None, ge=0)
    validity_date: Optional[date] = None
    terms_id: Optional[UUID] = None
    custom_terms: Optional[str] = None


class QuotationSend(BaseModel):
    """Body for PATCH /quotations/{id}/send"""
    share_channel: str = Field("email", description="'email' or 'whatsapp'")
    recipient_email: Optional[str] = None
    recipient_whatsapp: Optional[str] = None


class QuotationConvert(BaseModel):
    """Additional trip fields required when converting quotation → trip"""
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    origin: Optional[str] = Field(None, max_length=255)
    destination: Optional[str] = Field(None, max_length=255)


class QuotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quotation_number: str
    company_id: UUID
    client_id: Optional[UUID]
    machine_type: Optional[str]
    package_details: Optional[str]
    base_rate: Optional[Decimal]
    per_km_rate: Optional[Decimal]
    per_ton_rate: Optional[Decimal]
    total_rate: Optional[Decimal]
    validity_date: Optional[date]
    custom_terms: Optional[str]
    status: str
    trip_id: Optional[UUID]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime


class RateSuggestionResponse(BaseModel):
    base_fare: Optional[Decimal]
    per_km_rate: Optional[Decimal]
    per_ton_rate: Optional[Decimal]
    waiting_rate: Optional[Decimal]
    source: str  # "client_specific" | "company_default" | "none"


class TermsTemplateCreate(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    is_default: bool = False


class TermsTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    title: str
    content: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
