# TMS Backend — trips.py (API Endpoint)
# Module: 3 — Admin/User Core | Path: app/api/v1/endpoints/trips.py
# Purpose: Trip lifecycle endpoints — original + PATCH status/settle + assign/accept/reject

from typing import Any, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.trip import TripCreate, TripSettle, ReceiptCreate
from app.services.trip_service import (
    list_trips,
    list_my_trips,
    get_trip,
    create_trip,
    start_trip,
    mark_driver_reached,
    complete_trip,
    cancel_trip,
    settle_trip,
    create_receipt,
    get_receipt
)

router = APIRouter()


class TripStatusUpdate(BaseModel):
    status: str


class TripSettlePatch(BaseModel):
    """PATCH /trips/{id} — settlement fields (all optional so partial updates work)."""
    distance_km: Optional[float] = None
    weight_tons: Optional[float] = None
    waiting_hours: Optional[float] = None
    toll_charges: Optional[float] = None
    toll_charge: Optional[float] = None     # frontend alternate name
    extra_charges: Optional[float] = None
    extra_charge: Optional[float] = None    # frontend alternate name
    gst_rate: Optional[float] = None


class TripAssignRequest(BaseModel):
    driver_id: UUID
    vehicle_id: Optional[UUID] = None


class TripRejectRequest(BaseModel):
    reason: Optional[str] = None


# ─── List / Get ───────────────────────────────────────────────────────────────

@router.get("/", status_code=status.HTTP_200_OK)
async def get_trips_list(
    page: int = 1,
    page_size: int = 20,
    trip_status: Optional[str] = None,
    driver_id: Optional[UUID] = None,
    vehicle_id: Optional[UUID] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await list_trips(
        current_user,
        db,
        page,
        page_size,
        trip_status,
        driver_id,
        vehicle_id,
        from_date,
        to_date,
        org_id,
    )


@router.get("/my", status_code=status.HTTP_200_OK)
async def get_my_trips_list(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await list_my_trips(current_user, db, page, page_size)


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_trip_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await get_trip(id, current_user, db)


# ─── Create ───────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_trip(
    payload: TripCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    """Super admins pass `org_id` to create inside the company they manage."""
    return await create_trip(payload, current_user, db, org_id)


# ─── Status transitions ───────────────────────────────────────────────────────

def _handle_status(status_str: str):
    """Shared handler for both PUT and PATCH status updates."""
    return status_str


@router.put("/{id}/status", status_code=status.HTTP_200_OK)
async def update_trip_status_put(
    id: UUID,
    payload: TripStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await _apply_status(id, payload.status, current_user, db)


@router.patch("/{id}/status", status_code=status.HTTP_200_OK)
async def update_trip_status_patch(
    id: UUID,
    payload: TripStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """PATCH alias for status update — the frontend sends PATCH."""
    return await _apply_status(id, payload.status, current_user, db)


async def _apply_status(trip_id: UUID, new_status: str, current_user: User, db: AsyncSession) -> Any:
    # Normalise: frontend may send uppercase (SCHEDULED, IN_PROGRESS…) or lowercase
    s = new_status.lower()
    if s in ("in_progress", "started"):
        return await start_trip(trip_id, current_user, db)
    elif s in ("driver_reached", "reached"):
        return await mark_driver_reached(trip_id, current_user, db)
    elif s in ("completed", "received", "settled"):
        return await complete_trip(trip_id, current_user, db)
    elif s == "cancelled":
        return await cancel_trip(trip_id, current_user, db)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {new_status!r}")


# ─── Settlement ───────────────────────────────────────────────────────────────

@router.post("/{id}/settle", status_code=status.HTTP_200_OK)
async def settle_completed_trip(
    id: UUID,
    payload: TripSettle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await settle_trip(id, payload, current_user, db)


@router.patch("/{id}", status_code=status.HTTP_200_OK)
async def patch_trip(
    id: UUID,
    payload: TripSettlePatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    PATCH /trips/{id} — partial settlement update.

    The frontend calls this with whichever financial fields changed.
    We translate to TripSettle (which requires all fields) by filling in
    the current stored values for anything not provided.
    """
    trip = await get_trip(id, current_user, db)
    from decimal import Decimal

    def _d(val, fallback) -> Decimal:
        return Decimal(str(val)) if val is not None else (fallback or Decimal("0"))

    settle = TripSettle(
        distance_km=_d(payload.distance_km, trip.distance_km),
        weight_tons=_d(payload.weight_tons, trip.weight_tons),
        waiting_hours=_d(payload.waiting_hours, getattr(trip, "waiting_hours", None)),
        toll_charge=_d(payload.toll_charges or payload.toll_charge, trip.toll_charge),
        extra_charge=_d(payload.extra_charges or payload.extra_charge, trip.extra_charge),
        gst_rate=_d(payload.gst_rate, trip.gst_rate),
    )
    return await settle_trip(id, settle, current_user, db)


# ─── Driver assignment ────────────────────────────────────────────────────────

@router.post("/{id}/assign", status_code=status.HTTP_200_OK)
async def assign_trip(
    id: UUID,
    payload: TripAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Admin assigns a driver (and optionally a vehicle) to a trip."""
    from sqlalchemy import select
    from app.models.trip import Trip, TripStatus

    trip = await get_trip(id, current_user, db)
    if payload.driver_id:
        trip.driver_id = payload.driver_id
    if payload.vehicle_id:
        trip.vehicle_id = payload.vehicle_id
    await db.flush()
    return trip


@router.post("/{id}/accept", status_code=status.HTTP_200_OK)
async def accept_trip(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Driver accepts their assignment — moves the trip to SCHEDULED."""
    from sqlalchemy import select
    from app.models.trip import Trip, TripStatus

    trip = await get_trip(id, current_user, db)
    # A driver can only accept their own trip
    from app.models.driver import Driver
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalar_one_or_none()
    if driver and trip.driver_id != driver.id:
        raise HTTPException(status_code=403, detail="You can only accept trips assigned to you.")
    trip.status = TripStatus.upcoming
    await db.flush()
    return trip


@router.post("/{id}/reject", status_code=status.HTTP_200_OK)
async def reject_trip(
    id: UUID,
    payload: TripRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Driver rejects their assignment — clears the driver_id."""
    from app.models.trip import Trip, TripStatus

    trip = await get_trip(id, current_user, db)
    from sqlalchemy import select
    from app.models.driver import Driver

    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalar_one_or_none()
    if driver and trip.driver_id != driver.id:
        raise HTTPException(status_code=403, detail="You can only reject trips assigned to you.")
    trip.driver_id = None
    await db.flush()
    return trip


# ─── Receipt ──────────────────────────────────────────────────────────────────

@router.post("/{id}/receipt", status_code=status.HTTP_201_CREATED)
async def generate_trip_receipt(
    id: UUID,
    payload: ReceiptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await create_receipt(id, payload, current_user, db)


@router.get("/{id}/receipt", status_code=status.HTTP_200_OK)
async def get_trip_receipt_details(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await get_receipt(id, current_user, db)
