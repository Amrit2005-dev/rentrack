# TMS Backend — vehicle_service.py
# Module: 3 — Admin/User Core | Path: app/services/vehicle_service.py
# Purpose: Vehicle CRUD, expiry status, S3 image upload

from __future__ import annotations

import logging
from datetime import date
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.vehicle import VehicleCreate, VehicleUpdate
from app.utils import storage
from app.utils.company_scope import target_company_id

logger = logging.getLogger("tms.vehicle")


# ─── Expiry Status Helper ─────────────────────────────────────────────────────
def get_expiry_status(expiry_date: date | None) -> str | None:
    """
    Compute document expiry status relative to today.
    Returns 'expired', 'expiring_soon' (within 30 days), 'valid', or None if no date.
    """
    if expiry_date is None:
        return None
    days_left = (expiry_date - date.today()).days
    if days_left < 0:
        return "expired"
    if days_left <= 30:
        return "expiring_soon"
    return "valid"


def _enrich_vehicle(vehicle: Vehicle) -> dict:
    """Convert ORM Vehicle to dict with computed expiry status fields."""
    data = {c.name: getattr(vehicle, c.name) for c in vehicle.__table__.columns}
    data["rc_expiry_status"] = get_expiry_status(vehicle.rc_expiry)
    data["insurance_expiry_status"] = get_expiry_status(vehicle.insurance_expiry)
    data["fitness_expiry_status"] = get_expiry_status(vehicle.fitness_expiry)
    data["pollution_expiry_status"] = get_expiry_status(vehicle.pollution_expiry)
    return data


def _scope_query(q, current_user: User, org_id: UUID | None = None):
    """Apply company_id scoping to a vehicle query."""
    if current_user.role == UserRole.super_admin:
        if org_id:
            q = q.where(Vehicle.company_id == org_id)
    else:
        q = q.where(Vehicle.company_id == current_user.company_id)
    return q


# ─── List Vehicles ────────────────────────────────────────────────────────────
async def list_vehicles(
    current_user: User,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    vehicle_type: str | None = None,
    org_id: UUID | None = None,
) -> dict:
    from app.utils.pagination import paginate

    query = select(Vehicle).where(Vehicle.status != VehicleStatus.inactive)
    query = _scope_query(query, current_user, org_id)

    if status:
        query = query.where(Vehicle.status == status)
    if vehicle_type:
        query = query.where(Vehicle.type == vehicle_type)

    result = await paginate(query.order_by(Vehicle.created_at.desc()), page, page_size, db)
    result["items"] = [_enrich_vehicle(v) for v in result["items"]]
    return result


# ─── Get Single Vehicle ───────────────────────────────────────────────────────
async def get_vehicle(vehicle_id: UUID, current_user: User, db: AsyncSession) -> dict:
    query = _scope_query(select(Vehicle).where(Vehicle.id == vehicle_id), current_user)
    vehicle = await db.scalar(query)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return _enrich_vehicle(vehicle)


# ─── Create Vehicle ───────────────────────────────────────────────────────────
async def create_vehicle(
    payload: VehicleCreate, current_user: User, db: AsyncSession, org_id: UUID | None = None
) -> dict:
    # Check registration number uniqueness
    existing = await db.scalar(
        select(Vehicle).where(Vehicle.registration_no == payload.registration_no)
    )
    if existing:
        raise HTTPException(status_code=409, detail="Vehicle with this registration number already exists")

    vehicle = Vehicle(
        company_id=target_company_id(current_user, org_id),
        **payload.model_dump(),
    )
    db.add(vehicle)
    await db.flush()
    return _enrich_vehicle(vehicle)


# ─── Update Vehicle ───────────────────────────────────────────────────────────
async def update_vehicle(
    vehicle_id: UUID, payload: VehicleUpdate, current_user: User, db: AsyncSession
) -> dict:
    query = _scope_query(select(Vehicle).where(Vehicle.id == vehicle_id), current_user)
    vehicle = await db.scalar(query)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)

    await db.flush()
    return _enrich_vehicle(vehicle)


# ─── Soft Delete Vehicle ──────────────────────────────────────────────────────
async def deactivate_vehicle(vehicle_id: UUID, current_user: User, db: AsyncSession) -> None:
    query = _scope_query(select(Vehicle).where(Vehicle.id == vehicle_id), current_user)
    vehicle = await db.scalar(query)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.status = VehicleStatus.inactive
    await db.flush()


# ─── Upload Vehicle Image ─────────────────────────────────────────────────────
async def upload_vehicle_image(
    vehicle_id: UUID, file: UploadFile, current_user: User, db: AsyncSession
) -> str:
    query = _scope_query(select(Vehicle).where(Vehicle.id == vehicle_id), current_user)
    vehicle = await db.scalar(query)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    file_bytes = await file.read()
    key = storage.vehicle_image_key(str(current_user.company_id), str(vehicle_id))
    url = await storage.upload_file(file_bytes, key, file.content_type or "image/jpeg")

    vehicle.image_url = url
    await db.flush()
    return url


# ─── Compliance Documents ─────────────────────────────────────────────────────
VEHICLE_DOCUMENT_COLUMNS = {
    "rc": "rc_document_url",
    "insurance": "insurance_document_url",
    "fitness": "fitness_document_url",
    "puc": "puc_document_url",
}


async def upload_vehicle_document(
    vehicle_id: UUID, kind: str, file: UploadFile, current_user: User, db: AsyncSession
) -> dict:
    column = VEHICLE_DOCUMENT_COLUMNS.get(kind)
    if column is None:
        raise HTTPException(status_code=404, detail="Unknown document type")
    query = _scope_query(select(Vehicle).where(Vehicle.id == vehicle_id), current_user)
    vehicle = await db.scalar(query)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data, content_type, ext = await storage.read_document(file)
    key = storage.vehicle_document_key(str(vehicle.company_id), str(vehicle.id), kind, ext)
    setattr(vehicle, column, await storage.upload_file(data, key, content_type))
    await db.flush()
    return _enrich_vehicle(vehicle)
