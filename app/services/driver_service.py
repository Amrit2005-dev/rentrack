# TMS Backend — driver_service.py
# Module: 3 — Admin/User Core | Path: app/services/driver_service.py
# Purpose: Driver CRUD and availability management

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverAvailability, DriverStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.driver import DriverCreate, DriverUpdate
from app.services.password_service import hash_password
from app.utils.company_scope import target_company_id

logger = logging.getLogger("tms.driver")


def _scope_query(q, current_user: User, org_id: UUID | None = None):
    if current_user.role == UserRole.super_admin:
        if org_id:
            q = q.where(Driver.company_id == org_id)
    else:
        q = q.where(Driver.company_id == current_user.company_id)
    return q


async def list_drivers(
    current_user: User,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    availability: str | None = None,
    status: str | None = None,
    org_id: UUID | None = None,
) -> dict:
    from app.utils.pagination import paginate

    query = select(Driver)
    query = _scope_query(query, current_user, org_id)
    if availability:
        query = query.where(Driver.availability == availability)
    if status:
        query = query.where(Driver.status == status)

    return await paginate(query.order_by(Driver.created_at.desc()), page, page_size, db)


async def get_available_drivers(
    current_user: User, db: AsyncSession, org_id: UUID | None = None
) -> list[Driver]:
    """Return all available drivers for trip assignment."""
    query = (
        _scope_query(select(Driver), current_user, org_id)
        .where(Driver.availability == DriverAvailability.available)
        .where(Driver.status == DriverStatus.approved)
    )
    result = await db.execute(query)
    return result.scalars().all()


async def get_driver(driver_id: UUID, current_user: User, db: AsyncSession) -> Driver:
    query = _scope_query(select(Driver).where(Driver.id == driver_id), current_user)
    driver = await db.scalar(query)
    if driver is None:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


async def create_driver(
    payload: DriverCreate, current_user: User, db: AsyncSession, org_id: UUID | None = None
) -> Driver:
    """
    Creates the driver and, when `login` is given, its sign-in account in the
    same transaction: if either is refused, neither is saved. Doing this as two
    calls from the client left a half-made driver behind whenever the account
    failed, and every retry then hit the licence-number conflict.
    """
    company_id = target_company_id(current_user, org_id)
    license_number = payload.license_number.strip().upper()

    existing = await db.scalar(select(Driver).where(Driver.license_number == license_number))
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A driver with licence number {license_number} already exists ({existing.full_name}).",
        )

    user = None
    if payload.login:
        if await db.scalar(select(User).where(User.mobile_number == payload.mobile)):
            raise HTTPException(status_code=409, detail="A sign-in account already uses this mobile number.")
        if await db.scalar(select(User).where(User.email == payload.login.email)):
            raise HTTPException(status_code=409, detail="A sign-in account already uses this email.")
        first, _, last = payload.full_name.strip().partition(" ")
        user = User(
            mobile_number=payload.mobile,
            email=payload.login.email,
            password_hash=hash_password(payload.login.password),
            first_name=first or None,
            last_name=last or None,
            role=UserRole.user,
            company_id=company_id,
            status=UserStatus.active,
        )
        db.add(user)
        await db.flush()

    driver = Driver(
        company_id=company_id,
        **payload.model_dump(exclude={"login", "license_number", "user_id"}),
        license_number=license_number,
        user_id=user.id if user else payload.user_id,
    )
    db.add(driver)
    await db.flush()
    return driver


async def update_driver(
    driver_id: UUID, payload: DriverUpdate, current_user: User, db: AsyncSession
) -> Driver:
    driver = await get_driver(driver_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(driver, field, value)
    await db.flush()
    return driver


async def deactivate_driver(driver_id: UUID, current_user: User, db: AsyncSession) -> None:
    driver = await get_driver(driver_id, current_user, db)
    driver.availability = DriverAvailability.off_duty
    await db.flush()


async def update_driver_licence_document(
    driver_id: UUID, file_bytes: bytes, ext: str, content_type: str, current_user: User, db: AsyncSession
) -> Driver:
    from app.utils.storage import upload_file, driver_licence_key
    
    driver = await get_driver(driver_id, current_user, db)
    
    key = driver_licence_key(str(driver.company_id), str(driver.id), ext=ext)
    
    public_url = await upload_file(file_bytes, key, content_type=content_type)
    
    driver.license_document_url = public_url
    await db.flush()
    return driver
