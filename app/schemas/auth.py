# TMS Backend — auth.py (Pydantic Schemas)
# Module: 1 — Login | Path: app/schemas/auth.py
# Purpose: Request/response schemas for authentication endpoints

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ─── Requests ─────────────────────────────────────────────────────────────────
class SendOTPRequest(BaseModel):
    """Request body for POST /auth/send-otp"""
    mobile_number: str = Field(
        ...,
        min_length=10,
        max_length=15,
        description="Mobile number (10-digit Indian format, starts with 6–9)",
        examples=["9876543210"],
    )


class VerifyOTPRequest(BaseModel):
    """Request body for POST /auth/verify-otp"""
    mobile_number: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")


class RefreshRequest(BaseModel):
    """Request body for POST /auth/refresh"""
    refresh_token: str = Field(..., description="Opaque refresh token from /verify-otp")


class LogoutRequest(BaseModel):
    """Optional body for POST /auth/logout — refresh_token to revoke"""
    refresh_token: Optional[str] = Field(None, description="Refresh token to revoke on logout")


# ─── Responses ────────────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    """Returned on successful OTP verification or token refresh"""
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: UUID


class UserResponse(BaseModel):
    """Returned on GET /auth/me"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    mobile_number: str
    email: Optional[str] = None
    first_name: Optional[str]
    last_name: Optional[str]
    company_id: Optional[UUID]
    role: str
    status: str
    created_at: datetime
    updated_at: datetime
