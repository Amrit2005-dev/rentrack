# TMS Backend — registration.py (Pydantic Schemas)
# Module: 2 — Registration | Path: app/schemas/registration.py
# Purpose: Request/response schemas for registration endpoints

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ─── Requests ─────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    """Request body for POST /registration/register"""
    mobile_number: str = Field(..., description="10-digit Indian mobile number")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    company_name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["admin", "user"] = "user"
    company_id: Optional[UUID] = None
    mobile_verification_token: str = Field(
        ...,
        description="Short-lived JWT returned by POST /registration/verify-mobile. "
                    "Proves the mobile number was OTP-verified before this form was submitted.",
    )

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        """Validates 10-digit Indian mobile number (prefix 6–9)."""
        v = v.strip()
        if not re.match(r"^[6-9]\d{9}$", v):
            raise ValueError(
                "Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9."
            )
        return v



class ApproveRequest(BaseModel):
    """Request body for PATCH /registration/{id}/approve"""
    role: str = Field(..., description="Role to assign: 'admin' or 'user'")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "manager", "operator", "user"):
            raise ValueError("Role must be 'admin', 'manager', 'operator', or 'user'")
        return v


class RejectRequest(BaseModel):
    """Request body for PATCH /registration/{id}/reject"""
    reason: str = Field(..., min_length=1, max_length=500, description="Rejection reason")


# ─── Responses ────────────────────────────────────────────────────────────────
class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    city: Optional[str]
    created_at: datetime


class RegistrationUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    mobile_number: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    status: str


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    user: RegistrationUserResponse
    company: CompanyResponse
    rejection_reason: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class RegistrationStatusResponse(BaseModel):
    """Lightweight status response for public polling endpoint"""
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    status: str
    message: str
