from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserRole
from app.redis_client import get_redis
from app.schemas.registration import RegisterRequest, ApproveRequest, RejectRequest
from app.services.jwt_service import create_mobile_verification_token
from app.services.otp_service import generate_and_store_otp, verify_otp
from app.services.registration_service import (
    register_user,
    list_pending_registrations,
    approve_registration,
    reject_registration,
    get_status_by_mobile
)
from app.services.sms_service import send_sms

router = APIRouter()


# ── Mobile OTP helpers for registration ───────────────────────────────────────

class _SendOtpBody(BaseModel):
    mobile_number: str


class _VerifyMobileBody(BaseModel):
    mobile_number: str
    otp: str


@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_registration_otp(
    payload: _SendOtpBody,
    background_tasks: BackgroundTasks,
    redis: Redis = Depends(get_redis),
) -> Any:
    """
    Step 1 of mobile OTP verification for registration (Option A).
    Generates an OTP, stores it in Redis, and sends it via SMS (Twilio).
    Rate-limited: 3 requests per 10 minutes per mobile number.
    """
    otp = await generate_and_store_otp(payload.mobile_number, redis)
    msg = f"Your RentTrack registration code is {otp}. Valid for 10 minutes. Do not share."
    background_tasks.add_task(send_sms, payload.mobile_number, msg)
    response = {"message": "OTP sent to your mobile number."}
    if settings.SHOW_TEST_OTP:
        response["otp"] = otp
    return response


@router.post("/verify-mobile", status_code=status.HTTP_200_OK)
async def verify_registration_mobile(
    payload: _VerifyMobileBody,
    redis: Redis = Depends(get_redis),
) -> Any:
    """
    Step 2 of mobile OTP verification for registration (Option A).
    Verifies the OTP and returns a short-lived mobile_verification_token (15 min JWT).
    The token must be included in POST /registration/ to prove mobile ownership.
    """
    await verify_otp(payload.mobile_number, payload.otp, redis)
    token = create_mobile_verification_token(payload.mobile_number)
    return {"mobile_verification_token": token}


# ── Registration CRUD ──────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db)
) -> Any:
    return await register_user(payload, db)

@router.get("/status", status_code=status.HTTP_200_OK)
async def get_status(
    mobile_number: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    return await get_status_by_mobile(mobile_number, db)

@router.get("/requests", status_code=status.HTTP_200_OK)
async def list_requests(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin))
) -> Any:
    return await list_pending_registrations(current_user, db, page, page_size)

@router.post("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_request(
    id: UUID,
    payload: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin))
) -> Any:
    return await approve_registration(id, payload, current_user, db)

@router.post("/{id}/reject", status_code=status.HTTP_200_OK)
async def reject_request(
    id: UUID,
    payload: RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin))
) -> Any:
    return await reject_registration(id, payload, current_user, db)
