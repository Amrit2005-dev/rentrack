# TMS Backend — registration_service.py
# Module: 2 — Registration | Path: app/services/registration_service.py
# Purpose: All registration business logic

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, CompanyStatus
from app.models.registration import ApprovalHistory, ApprovalAction, RegistrationRequest, RegistrationStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.registration import RegisterRequest, ApproveRequest, RejectRequest, RegistrationResponse
from app.services.password_service import hash_password
from app.services import sms_service
from app.services.jwt_service import decode_mobile_verification_token

logger = logging.getLogger("tms.registration")

# ─── SMS Templates ────────────────────────────────────────────────────────────
_MSG_SUBMITTED = "Welcome to TMS. Your registration is under review. You will be notified within 24 hours."
_MSG_APPROVED = "Your TMS account has been approved. You can now login with mobile: {mobile}."
_MSG_REJECTED = "Your TMS registration was not approved. Reason: {reason}. Contact support for help."
_MSG_APPROVER = "New registration request from {name} ({company}). Review at TMS admin."


# ─── Register User ────────────────────────────────────────────────────────────
async def register_user(payload: RegisterRequest, db: AsyncSession) -> dict:
    """
    Register a new user:
    0. Validate mobile_verification_token → 401 if invalid/expired/mismatched
    1. Validate mobile not already registered → 409
    2. Detect/create company
    3. Create user (status=pending)
    4. Create registration_request
    5. Background notifications handled by caller (router) as BackgroundTask

    Returns dict with user_id, status, company_id, is_new_company.
    """
    # 0. Verify the mobile was OTP-confirmed before this form was submitted
    verified_mobile = decode_mobile_verification_token(payload.mobile_verification_token)
    if verified_mobile != payload.mobile_number:
        raise HTTPException(
            status_code=401,
            detail="Mobile verification token does not match the submitted mobile number.",
        )

    # 1. Check duplicate mobile
    existing = await db.scalar(
        select(User).where(User.mobile_number == payload.mobile_number)
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Mobile number already registered")

    existing_email = await db.scalar(select(User).where(User.email == payload.email))
    if existing_email is not None:
        raise HTTPException(status_code=409, detail="Email address already registered")

    # 2. Detect/create company
    if payload.role == "user" and payload.company_id is None:
        raise HTTPException(status_code=400, detail="Choose a company when registering as a driver.")

    company = await db.get(Company, payload.company_id) if payload.company_id else None
    if company is not None:
        if company.status != CompanyStatus.active.value:
            raise HTTPException(status_code=400, detail="That company is not accepting driver registrations.")
        is_new_company = False
    else:
        company = await db.scalar(select(Company).where(Company.name == payload.company_name))
        is_new_company = company is None
        if company is None:
            company = Company(
                name=payload.company_name,
                city=payload.city,
                status=CompanyStatus.pending.value,
            )
            db.add(company)
            await db.flush()

    # 3. Create user
    user = User(
        mobile_number=payload.mobile_number,
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        company_id=company.id,
        status=UserStatus.pending,
        role=UserRole(payload.role),
    )
    db.add(user)
    await db.flush()

    # 4. Create registration request
    reg = RegistrationRequest(
        user_id=user.id,
        company_id=company.id,
        status=RegistrationStatus.pending,
    )
    db.add(reg)
    await db.flush()

    # 5. Append initial history entry
    history = ApprovalHistory(
        registration_id=reg.id,
        action=ApprovalAction.submitted,
        performed_by=user.id,
        note="Self-registration submitted",
    )
    db.add(history)
    await db.flush()

    logger.info(
        "New registration: user=****%s company=%r new_company=%s",
        payload.mobile_number[-4:],
        payload.company_name,
        is_new_company,
    )

    return {
        "user_id": user.id,
        "status": "pending",
        "company_id": company.id,
        "is_new_company": is_new_company,
        "message": "Registration submitted. You will be notified once reviewed.",
    }


# ─── Status by Mobile ─────────────────────────────────────────────────────────
async def get_status_by_mobile(mobile: str, db: AsyncSession) -> dict:
    """Public endpoint to poll registration status by mobile number."""
    user = await db.scalar(select(User).where(User.mobile_number == mobile))
    if user is None:
        raise HTTPException(status_code=404, detail="Mobile number not registered")

    reg = await db.scalar(
        select(RegistrationRequest)
        .where(RegistrationRequest.user_id == user.id)
        .order_by(RegistrationRequest.created_at.desc())
    )
    status = reg.status if reg else "unknown"
    return {
        "user_id": user.id,
        "status": status,
        "message": _status_message(status),
    }


def _status_message(status: str) -> str:
    return {
        "pending": "Your registration is under review.",
        "approved": "Registration approved. You can now login.",
        "rejected": "Registration rejected. Please contact support.",
    }.get(status, "Unknown status.")


# ─── List Pending ─────────────────────────────────────────────────────────────
async def list_pending_registrations(
    current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    """Return pending registrations scoped by caller's role."""
    query = (
        select(RegistrationRequest)
        .where(RegistrationRequest.status == RegistrationStatus.pending)
    )
    if current_user.role == UserRole.admin:
        # Admin can only see their company's registrations
        query = query.where(RegistrationRequest.company_id == current_user.company_id)

    from app.utils.pagination import paginate
    res = await paginate(query, page, page_size, db)
    res["items"] = [RegistrationResponse.model_validate(item) for item in res["items"]]
    return res


# ─── Get Single Registration ──────────────────────────────────────────────────
async def get_registration(
    reg_id: UUID, current_user: User, db: AsyncSession
) -> RegistrationRequest:
    reg = await db.scalar(
        select(RegistrationRequest).where(RegistrationRequest.id == reg_id)
    )
    if reg is None:
        raise HTTPException(status_code=404, detail="Registration not found")

    # RBAC: admin can only see own company
    if current_user.role == UserRole.admin and reg.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return reg


# ─── Approve Registration ─────────────────────────────────────────────────────
async def approve_registration(
    reg_id: UUID, payload: ApproveRequest, current_user: User, db: AsyncSession
) -> dict:
    """
    Approve a registration:
    1. Fetch → 404
    2. RBAC: admin can only approve own company users
    3. Update user status + role
    4. Update registration_request
    5. Insert approval_history
    """
    reg = await get_registration(reg_id, current_user, db)

    if reg.status != RegistrationStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending registrations can be approved")

    # Admin can only approve within own company
    if current_user.role == UserRole.admin and reg.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Cannot approve users from a different company")

    # Update user
    user = await db.get(User, reg.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = UserStatus.active
    user.role = UserRole(payload.role)

    # Approving the first applicant of a new company is what brings it live.
    company = await db.get(Company, reg.company_id) if reg.company_id else None
    if company is not None and company.status == CompanyStatus.pending.value:
        if current_user.role != UserRole.super_admin:
            raise HTTPException(status_code=403, detail="Only a super admin can approve a new company")
        company.status = CompanyStatus.active.value

    # Update registration
    reg.status = RegistrationStatus.approved
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.now(timezone.utc)

    # History
    history = ApprovalHistory(
        registration_id=reg.id,
        action=ApprovalAction.approved,
        performed_by=current_user.id,
        note=f"Approved with role: {payload.role}",
    )
    db.add(history)
    await db.flush()

    return {"user_id": user.id, "status": "approved", "role": payload.role}


# ─── Reject Registration ──────────────────────────────────────────────────────
async def reject_registration(
    reg_id: UUID, payload: RejectRequest, current_user: User, db: AsyncSession
) -> dict:
    reg = await get_registration(reg_id, current_user, db)

    if reg.status != RegistrationStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending registrations can be rejected")

    if current_user.role == UserRole.admin and reg.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Cannot reject users from a different company")

    reg.status = RegistrationStatus.rejected
    reg.rejection_reason = payload.reason
    reg.reviewed_by = current_user.id
    reg.reviewed_at = datetime.now(timezone.utc)

    history = ApprovalHistory(
        registration_id=reg.id,
        action=ApprovalAction.rejected,
        performed_by=current_user.id,
        note=payload.reason,
    )
    db.add(history)
    await db.flush()

    return {"user_id": reg.user_id, "status": "rejected"}
