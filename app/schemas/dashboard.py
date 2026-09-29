# TMS Backend — dashboard.py (Pydantic Schemas)
# Module: 3 — Admin/User Core | Path: app/schemas/dashboard.py

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TripStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total: int = 0
    upcoming: int = 0
    in_progress: int = 0
    completed_today: int = 0
    cancelled_today: int = 0


class FleetStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total_vehicles: int = 0
    active: int = 0
    in_trip: int = 0
    inactive: int = 0
    expiring_soon: int = 0


class DriverStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    total: int = 0
    available: int = 0
    on_trip: int = 0
    off_duty: int = 0


class RevenueStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    today: Decimal = Decimal("0")
    this_month: Decimal = Decimal("0")
    this_year: Decimal = Decimal("0")


class AdminDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    trips: TripStats
    fleet: FleetStats
    drivers: DriverStats
    revenue: RevenueStats
    pending_approvals: Optional[int] = None  # super_admin only


class RevenueBreakdown(BaseModel):
    """Returned by revenue_service.calculate_trip_amount"""
    base_fare: Decimal
    distance_charge: Decimal
    weight_charge: Decimal
    waiting_charge: Decimal
    toll_charge: Decimal
    extra_charge: Decimal
    gst_amount: Decimal
    final_amount: Decimal


class UserDashboardResponse(BaseModel):
    """Simplified dashboard for drivers/users"""
    model_config = ConfigDict(from_attributes=True)
    total_trips: int = 0
    completed_trips: int = 0
    upcoming_trips: int = 0
    assigned_vehicle_id: Optional[str] = None
    assigned_vehicle_reg: Optional[str] = None
