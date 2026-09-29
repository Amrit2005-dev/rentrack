# TMS Backend — dashboard.py (API Endpoint)
# Purpose: GET /dashboard/stats — aggregated business overview

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.driver import Driver
from app.models.invoice import Invoice
from app.models.registration import RegistrationRequest
from app.models.trip import Trip, TripStatus
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle

router = APIRouter()


async def _count(db: AsyncSession, model, *filters) -> int:
    q = select(func.count()).select_from(model)
    for f in filters:
        q = q.where(f)
    result = await db.execute(q)
    return result.scalar_one() or 0


async def _sum(db: AsyncSession, column, *filters):
    from sqlalchemy import select as sa_select
    q = sa_select(func.coalesce(func.sum(column), 0))
    for f in filters:
        q = q.where(f)
    result = await db.execute(q)
    return float(result.scalar_one() or 0)


@router.get("/stats", status_code=status.HTTP_200_OK)
async def dashboard_stats(
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Aggregated overview counts.

    Super admin: platform-wide (or org-scoped if org_id provided).
    Others: their own company only.
    """
    is_super = current_user.role == UserRole.super_admin
    company_id = org_id if (is_super and org_id) else (
        None if is_super else current_user.company_id
    )

    def co(model):
        """Return company filter if applicable."""
        filters = []
        if company_id:
            filters.append(getattr(model, "company_id") == company_id)
        return filters

    # ── Users ──
    user_filters = []
    if company_id:
        user_filters.append(User.company_id == company_id)
    total_users = await _count(db, User, *user_filters)

    # ── Pending registrations ──
    pending_regs = await _count(db, RegistrationRequest, RegistrationRequest.status == "pending")

    # ── Revenue (sum of invoice final_amount) ──
    inv_filters = co(Invoice)
    total_revenue = await _sum(db, Invoice.final_amount, *inv_filters)

    # ── Trips ──
    trip_filters = co(Trip)
    trips_total     = await _count(db, Trip, *trip_filters)
    # trip_status_enum is lowercase; "scheduled" is the API's name for upcoming,
    # and a driver who has reached the site is still mid-trip.
    trips_scheduled = await _count(db, Trip, *trip_filters, Trip.status == TripStatus.upcoming)
    trips_progress  = await _count(
        db, Trip, *trip_filters,
        Trip.status.in_([TripStatus.in_progress, TripStatus.driver_reached]),
    )
    trips_completed = await _count(db, Trip, *trip_filters, Trip.status == TripStatus.completed)
    trips_cancelled = await _count(db, Trip, *trip_filters, Trip.status == TripStatus.cancelled)

    # ── Vehicles ── (VehicleStatus: active | inactive | in_trip)
    veh_filters = co(Vehicle)
    veh_total    = await _count(db, Vehicle, *veh_filters)
    veh_avail    = await _count(db, Vehicle, *veh_filters, Vehicle.status == "active")
    veh_on_trip  = await _count(db, Vehicle, *veh_filters, Vehicle.status == "in_trip")
    veh_maint    = 0   # no MAINTENANCE status on this model
    veh_retired  = await _count(db, Vehicle, *veh_filters, Vehicle.status == "inactive")

    # ── Drivers ── (DriverAvailability: available | on_trip | off_duty)
    drv_filters = co(Driver)
    drv_total    = await _count(db, Driver, *drv_filters)
    drv_active   = await _count(db, Driver, *drv_filters, Driver.availability == "available")
    drv_on_trip  = await _count(db, Driver, *drv_filters, Driver.availability == "on_trip")
    drv_inactive = await _count(db, Driver, *drv_filters, Driver.availability == "off_duty")

    return {
        "total_users": total_users,
        "pending_registrations": pending_regs,
        "total_revenue": total_revenue,
        "trips": {
            "total": trips_total,
            "scheduled": trips_scheduled,
            "in_progress": trips_progress,
            "completed": trips_completed,
            "cancelled": trips_cancelled,
        },
        "vehicles": {
            "total": veh_total,
            "available": veh_avail,
            "on_trip": veh_on_trip,
            "maintenance": veh_maint,
            "retired": veh_retired,
        },
        "drivers": {
            "total": drv_total,
            "active": drv_active,
            "inactive": max(drv_inactive, 0),
            "available": drv_active,
            "on_trip": drv_on_trip,
        },
    }
