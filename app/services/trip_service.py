# TMS Backend — trip_service.py
# Module: 3 — Admin/User Core | Path: app/services/trip_service.py
# Purpose: Full trip lifecycle management with atomic status transitions

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverAvailability
from app.models.trip import Trip, TripReceipt, TripStatus
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleStatus
from app.schemas.trip import TripCreate, TripSettle, ReceiptCreate
from app.services import audit_service
from app.utils.company_scope import target_company_id

logger = logging.getLogger("tms.trip")

# ─── Status Transition Table ──────────────────────────────────────────────────
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "upcoming": ["in_progress", "cancelled"],
    "in_progress": ["driver_reached", "cancelled"],
    "driver_reached": ["completed"],
    # completed and cancelled are terminal states — no allowed transitions
}


def validate_transition(current: str, target: str) -> None:
    """Raise 400 if the status transition is not allowed."""
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{target}'. "
                   f"Allowed transitions: {allowed}",
        )


def _scope_query(q, current_user: User, org_id: UUID | None = None):
    if current_user.role == UserRole.super_admin:
        if org_id:
            q = q.where(Trip.company_id == org_id)
    else:
        q = q.where(Trip.company_id == current_user.company_id)
    return q


# ─── List Trips ───────────────────────────────────────────────────────────────
async def list_trips(
    current_user: User,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    driver_id: UUID | None = None,
    vehicle_id: UUID | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    org_id: UUID | None = None,
) -> dict:
    from app.utils.pagination import paginate

    query = _scope_query(select(Trip), current_user, org_id)
    if status:
        query = query.where(Trip.status == status)
    if driver_id:
        query = query.where(Trip.driver_id == driver_id)
    if vehicle_id:
        query = query.where(Trip.vehicle_id == vehicle_id)
    if from_date:
        query = query.where(Trip.created_at >= from_date)
    if to_date:
        query = query.where(Trip.created_at <= to_date)

    return await paginate(query.order_by(Trip.created_at.desc()), page, page_size, db)


async def list_my_trips(current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20) -> dict:
    """Driver's own trips — filter by driver user_id."""
    from app.utils.pagination import paginate

    query = (
        select(Trip)
        .join(Driver, Driver.id == Trip.driver_id)
        .where(Driver.user_id == current_user.id)
        .where(Trip.company_id == current_user.company_id)
    )
    return await paginate(query.order_by(Trip.created_at.desc()), page, page_size, db)


# ─── Get Single Trip ──────────────────────────────────────────────────────────
async def get_trip(trip_id: UUID, current_user: User, db: AsyncSession) -> Trip:
    query = _scope_query(select(Trip).where(Trip.id == trip_id), current_user)
    trip = await db.scalar(query)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


# ─── Create Trip ──────────────────────────────────────────────────────────────
async def create_trip(
    payload: TripCreate, current_user: User, db: AsyncSession, org_id: UUID | None = None
) -> Trip:
    company_id = target_company_id(current_user, org_id)

    if payload.driver_id:
        driver = await db.get(Driver, payload.driver_id)
        if not driver or driver.company_id != company_id:
            raise HTTPException(status_code=400, detail="Driver not found in this company")
        status_value = getattr(driver.status, "value", driver.status)
        if status_value != "approved":
            raise HTTPException(
                status_code=400,
                detail=f"{driver.full_name} is {status_value}, not approved. Approve them from the driver's page first.",
            )
        availability = getattr(driver.availability, "value", driver.availability)
        if availability != "available":
            raise HTTPException(
                status_code=400,
                detail=f"{driver.full_name} is {availability.replace('_', ' ')}. Choose an available driver.",
            )

    if payload.vehicle_id:
        vehicle = await db.get(Vehicle, payload.vehicle_id)
        if not vehicle or vehicle.company_id != company_id:
            raise HTTPException(status_code=400, detail="Vehicle not found in this company")
        vehicle_status = getattr(vehicle.status, "value", vehicle.status)
        if vehicle_status != "active":
            state = "on another trip" if vehicle_status == "in_trip" else vehicle_status
            raise HTTPException(
                status_code=400,
                detail=f"Vehicle {vehicle.registration_no} is {state}. Choose an active vehicle.",
            )

    trip = Trip(
        company_id=company_id,
        created_by=current_user.id,
        status=TripStatus.upcoming,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(trip)
    # The id is only assigned on flush, and the audit row needs it.
    await db.flush()

    await audit_service.log(
        db=db,
        table_name="trips",
        record_id=trip.id,
        action="create",
        changed_by=current_user.id,
        new_val={"status": "upcoming"},
    )
    await db.flush()
    return trip


# ─── Start Trip ───────────────────────────────────────────────────────────────
async def start_trip(trip_id: UUID, current_user: User, db: AsyncSession) -> Trip:
    trip = await get_trip(trip_id, current_user, db)
    validate_transition(trip.status, "in_progress")

    old_status = trip.status

    # Atomic update: trip status + driver availability + vehicle status
    trip.status = TripStatus.in_progress
    trip.started_at = datetime.now(timezone.utc)

    if trip.driver_id:
        driver = await db.get(Driver, trip.driver_id)
        if driver:
            driver.availability = DriverAvailability.on_trip

    if trip.vehicle_id:
        vehicle = await db.get(Vehicle, trip.vehicle_id)
        if vehicle:
            vehicle.status = VehicleStatus.in_trip

    await audit_service.log(db, "trips", trip.id, "status_change", current_user.id,
                             {"status": old_status}, {"status": "in_progress"})
    await db.flush()
    return trip


# ─── Driver Reached ───────────────────────────────────────────────────────────
async def mark_driver_reached(trip_id: UUID, current_user: User, db: AsyncSession) -> Trip:
    trip = await get_trip(trip_id, current_user, db)
    validate_transition(trip.status, "driver_reached")

    old_status = trip.status
    trip.status = TripStatus.driver_reached
    trip.reached_at = datetime.now(timezone.utc)

    await audit_service.log(db, "trips", trip.id, "status_change", current_user.id,
                             {"status": old_status}, {"status": "driver_reached"})
    await db.flush()
    return trip


# ─── Complete Trip ────────────────────────────────────────────────────────────
async def complete_trip(trip_id: UUID, current_user: User, db: AsyncSession) -> Trip:
    trip = await get_trip(trip_id, current_user, db)
    validate_transition(trip.status, "completed")

    # Require receipt before completing
    receipt = await db.scalar(select(TripReceipt).where(TripReceipt.trip_id == trip_id))
    if receipt is None:
        raise HTTPException(
            status_code=400,
            detail="A delivery receipt must be created before completing the trip",
        )

    old_status = trip.status
    trip.status = TripStatus.completed
    trip.completed_at = datetime.now(timezone.utc)

    # Release driver and vehicle
    if trip.driver_id:
        driver = await db.get(Driver, trip.driver_id)
        if driver:
            driver.availability = DriverAvailability.available

    if trip.vehicle_id:
        vehicle = await db.get(Vehicle, trip.vehicle_id)
        if vehicle:
            vehicle.status = VehicleStatus.active

    await audit_service.log(db, "trips", trip.id, "status_change", current_user.id,
                             {"status": old_status}, {"status": "completed"})
    await db.flush()
    return trip


# ─── Cancel Trip ──────────────────────────────────────────────────────────────
async def cancel_trip(trip_id: UUID, current_user: User, db: AsyncSession) -> Trip:
    trip = await get_trip(trip_id, current_user, db)
    validate_transition(trip.status, "cancelled")

    old_status = trip.status
    trip.status = TripStatus.cancelled

    # Release driver and vehicle if trip was in progress
    if old_status in ("in_progress", "driver_reached"):
        if trip.driver_id:
            driver = await db.get(Driver, trip.driver_id)
            if driver:
                driver.availability = DriverAvailability.available

        if trip.vehicle_id:
            vehicle = await db.get(Vehicle, trip.vehicle_id)
            if vehicle:
                vehicle.status = VehicleStatus.active

    await audit_service.log(db, "trips", trip.id, "status_change", current_user.id,
                             {"status": old_status}, {"status": "cancelled"})
    await db.flush()
    return trip


# ─── Settle Trip ──────────────────────────────────────────────────────────────
async def settle_trip(
    trip_id: UUID, payload: TripSettle, current_user: User, db: AsyncSession
) -> Trip:
    """Calculate and store final revenue on a completed trip."""
    from app.services.revenue_service import RateCard, calculate_trip_amount

    trip = await get_trip(trip_id, current_user, db)

    # Build rate card from trip's existing base_fare (or zero if not set)
    rate_card = RateCard(
        base_fare=trip.base_fare or Decimal("0"),
        per_km_rate=Decimal("0"),  # Could be fetched from rate_cards table
        per_ton_rate=Decimal("0"),
        waiting_rate=Decimal("0"),
    )

    breakdown = await calculate_trip_amount(
        distance_km=payload.distance_km,
        weight_tons=payload.weight_tons,
        waiting_hours=payload.waiting_hours,
        toll=payload.toll_charge,
        extra=payload.extra_charge,
        rate_card=rate_card,
        gst_rate=payload.gst_rate,
    )

    trip.distance_km = payload.distance_km
    trip.weight_tons = payload.weight_tons
    trip.distance_charge = breakdown.distance_charge
    trip.weight_charge = breakdown.weight_charge
    trip.waiting_charge = breakdown.waiting_charge
    trip.toll_charge = breakdown.toll_charge
    trip.extra_charge = breakdown.extra_charge
    trip.gst_rate = payload.gst_rate
    trip.gst_amount = breakdown.gst_amount
    trip.final_amount = breakdown.final_amount

    await audit_service.log(db, "trips", trip.id, "update", current_user.id,
                             None, {"final_amount": str(breakdown.final_amount)})
    await db.flush()
    return trip


# ─── Receipt ──────────────────────────────────────────────────────────────────
async def create_receipt(
    trip_id: UUID, payload: ReceiptCreate, current_user: User, db: AsyncSession
) -> TripReceipt:
    trip = await get_trip(trip_id, current_user, db)

    existing = await db.scalar(select(TripReceipt).where(TripReceipt.trip_id == trip_id))
    if existing:
        raise HTTPException(status_code=409, detail="Receipt already exists for this trip")

    import bcrypt
    otp_hash = None
    if payload.receiver_otp:
        otp_hash = bcrypt.hashpw(payload.receiver_otp.encode(), bcrypt.gensalt()).decode()

    receipt = TripReceipt(
        trip_id=trip_id,
        receiver_name=payload.receiver_name,
        receiver_otp_hash=otp_hash,
        received_at=datetime.now(timezone.utc),
        image_url=payload.image_url,
    )
    db.add(receipt)
    await db.flush()
    return receipt


async def get_receipt(trip_id: UUID, current_user: User, db: AsyncSession) -> TripReceipt:
    await get_trip(trip_id, current_user, db)  # Access check
    receipt = await db.scalar(select(TripReceipt).where(TripReceipt.trip_id == trip_id))
    if receipt is None:
        raise HTTPException(status_code=404, detail="Receipt not found for this trip")
    return receipt
