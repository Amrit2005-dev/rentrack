# TMS Backend — auth.py (API Endpoint)
# Module: 1 — Auth | Path: app/api/v1/endpoints/auth.py
# Purpose: Email+password 2FA login, OTP-only login, forgot/reset password,
#          /auth/me, user CRUD under /auth/users

from __future__ import annotations

import logging
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole, UserStatus
from app.redis_client import get_redis
from app.schemas.auth import (
    LogoutRequest,
    RefreshRequest,
    SendOTPRequest,
    TokenResponse,
    UserResponse,
    VerifyOTPRequest,
)
from app.services.jwt_service import (
    create_access_token,
    create_refresh_token,
    revoke_refresh_token,
    verify_refresh_token,
)
from app.services.otp_service import generate_and_store_otp, verify_otp
from app.services.password_service import hash_password, verify_password
from app.services.sms_service import send_sms
from app.services.email_service import send_email_otp

logger = logging.getLogger("tms.auth")

router = APIRouter()


# ─── Pydantic request/response models (auth-specific) ─────────────────────────

class EmailLoginRequest(BaseModel):
    """Step 1 of 2FA: email + password."""
    email: EmailStr
    password: str


class LoginVerifyRequest(BaseModel):
    """Step 2 of 2FA: email + OTP that was sent after password check."""
    email: EmailStr
    otp: str


class LoginStep1Response(BaseModel):
    """Returned from POST /auth/login on success — tells the client to enter OTP."""
    message: str
    mobile_hint: str   # e.g. "***4321"  — enough to know where the SMS went
    otp: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    mobile_number: str


class ResetPasswordRequest(BaseModel):
    mobile_number: str
    otp: str
    new_password: str


class UserCreateRequest(BaseModel):
    mobile_number: str
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "user"
    driver_id: Optional[UUID] = None   # links a DRIVER account to its driver record


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_active_user_by_mobile(mobile: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.mobile_number == mobile))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
    if user.status not in (UserStatus.active, UserStatus.approved):
        raise HTTPException(status_code=403, detail="User account is inactive or pending approval.")
    return user


async def _build_token_response(user: User, db: AsyncSession) -> TokenResponse:
    access_token = create_access_token(user_id=user.id, role=user.role.value, company_id=user.company_id)
    refresh_token = await create_refresh_token(user_id=user.id, db=db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role.value,
        user_id=user.id,
    )


# ─── Existing OTP-only routes (kept for backward compat / mobile sign-in) ─────

@router.post("/request-otp", status_code=status.HTTP_200_OK)
async def request_otp(
    payload: SendOTPRequest,
    background_tasks: BackgroundTasks,
    redis: Redis = Depends(get_redis),
):
    otp = await generate_and_store_otp(payload.mobile_number, redis)
    message = f"Your RentTrack OTP is {otp}. It is valid for 10 minutes."
    logger.info("Dispatching SMS OTP for mobile +91****%s", payload.mobile_number[-4:])
    background_tasks.add_task(send_sms, payload.mobile_number, message)
    response = {"message": "OTP sent successfully"}
    if settings.SHOW_TEST_OTP:
        response["otp"] = otp
    return response


@router.post("/verify-otp", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def verify_otp_endpoint(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    await verify_otp(payload.mobile_number, payload.otp, redis)
    user = await _get_active_user_by_mobile(payload.mobile_number, db)
    return await _build_token_response(user, db)


# ─── Email + password 2FA login (new) ─────────────────────────────────────────

@router.post("/login", response_model=LoginStep1Response, status_code=status.HTTP_200_OK)
async def email_login(
    payload: EmailLoginRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Step 1 of email+password 2FA.

    Verifies email + password, then dispatches an OTP to the user's registered
    mobile number. The client should navigate to the OTP verify screen and call
    POST /auth/login/verify next.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Deliberately vague: don't reveal whether the email exists
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if user.status not in (UserStatus.active, UserStatus.approved):
        raise HTTPException(status_code=403, detail="Account is inactive or pending approval.")

    otp = await generate_and_store_otp(user.mobile_number, redis)
    masked_email = f"***{user.email.split('@')[-1]}" if "@" in user.email else "***"
    logger.info("Dispatching login OTP for email %s", masked_email)
    
    # We must ensure background task is added correctly
    # Note: send_email_otp is synchronous, but BackgroundTasks will run it in a threadpool
    background_tasks.add_task(send_email_otp, user.email, otp, "login")

    # Send a hint to the UI
    hint = f"***{user.email.split('@')[-1]}" if '@' in user.email else "***"
    return LoginStep1Response(
        message="Verification code sent to your email.",
        mobile_hint=hint,
        otp=otp if settings.SHOW_TEST_OTP else None,
    )


@router.post("/login/verify", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def email_login_verify(
    payload: LoginVerifyRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Step 2 of email+password 2FA.

    Verifies the OTP that was dispatched in step 1 and issues the session tokens.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await verify_otp(user.mobile_number, payload.otp, redis)

    if user.status not in (UserStatus.active, UserStatus.approved):
        raise HTTPException(status_code=403, detail="Account is inactive or pending approval.")

    return await _build_token_response(user, db)


# ─── Forgot / reset password ──────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Sends a password-reset OTP to the given mobile number.

    Always returns 200 to avoid user-enumeration — even if the number is not
    registered, the response is the same.
    """
    result = await db.execute(select(User).where(User.mobile_number == payload.mobile_number))
    user = result.scalar_one_or_none()
    if user:
        otp = await generate_and_store_otp(payload.mobile_number, redis)
        msg = f"Your RentTrack password reset code is {otp}. Valid for 10 minutes."
        logger.info("Dispatching password reset SMS for mobile +91****%s", payload.mobile_number[-4:])
        background_tasks.add_task(send_sms, payload.mobile_number, msg)

    return {"message": "If that number is registered, a reset code has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Verifies the OTP and sets a new password."""
    await verify_otp(payload.mobile_number, payload.otp, redis)

    result = await db.execute(select(User).where(User.mobile_number == payload.mobile_number))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    user.password_hash = hash_password(payload.new_password)
    await db.flush()
    return {"message": "Password updated successfully. Please sign in."}


# ─── Current user profile ─────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)) -> Any:
    """Returns the authenticated user's profile."""
    return current_user


# ─── Token management ─────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token_endpoint(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        rt = await verify_refresh_token(payload.refresh_token, db)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    await revoke_refresh_token(payload.refresh_token, db)

    result = await db.execute(select(User).where(User.id == rt.user_id))
    user = result.scalar_one_or_none()
    if not user or user.status not in (UserStatus.active, UserStatus.approved):
        raise HTTPException(status_code=403, detail="User not active")

    return await _build_token_response(user, db)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    payload: LogoutRequest,
    db: AsyncSession = Depends(get_db),
):
    if payload.refresh_token:
        try:
            await revoke_refresh_token(payload.refresh_token, db)
        except Exception:
            pass
    return {"message": "Logged out successfully"}


# ─── User management (admin+) under /auth/users ───────────────────────────────

@router.get("/users", status_code=status.HTTP_200_OK)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Lists users in the caller's organisation (admin+) or any org (super_admin)."""
    from app.utils.pagination import paginate

    query = select(User)
    if current_user.role == UserRole.super_admin:
        if org_id:
            query = query.where(User.company_id == org_id)
    else:
        query = query.where(User.company_id == current_user.company_id)

    result = await paginate(query.order_by(User.created_at.desc()), page, page_size, db)
    # ORM rows don't serialise, and must not: they carry password_hash.
    result["items"] = [UserResponse.model_validate(u) for u in result["items"]]
    return result


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    """Creates a sign-in account. `driver_id` links a DRIVER account to its driver record."""
    # Check uniqueness
    dup = await db.execute(select(User).where(User.mobile_number == payload.mobile_number))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A user with that mobile number already exists.")

    if payload.email:
        dup_email = await db.execute(select(User).where(User.email == payload.email))
        if dup_email.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A user with that email already exists.")

    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid role: {payload.role!r}")

    # Super admins can create inside any company; admins only inside their own
    company_id = org_id if (current_user.role == UserRole.super_admin and org_id) else current_user.company_id

    user = User(
        mobile_number=payload.mobile_number,
        email=payload.email,
        password_hash=hash_password(payload.password) if payload.password else None,
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=role,
        company_id=company_id,
        status=UserStatus.active,
    )
    db.add(user)
    await db.flush()

    if payload.driver_id:
        from app.models.driver import Driver

        driver = await db.get(Driver, payload.driver_id)
        if driver is None or driver.company_id != company_id:
            raise HTTPException(status_code=404, detail="Driver not found in this company.")
        driver.user_id = user.id
        await db.flush()
    return user


@router.put("/users/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Admins can only update users in their own company
    if current_user.role != UserRole.super_admin and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Cannot update users outside your organisation.")

    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.role is not None:
        try:
            user.role = UserRole(payload.role)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid role: {payload.role!r}")
    if payload.status is not None:
        try:
            user.status = UserStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {payload.status!r}")

    await db.flush()
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if current_user.role != UserRole.super_admin and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Cannot delete users outside your organisation.")
    await db.delete(user)
