from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceStatus
from app.models.trip import Trip, TripStatus
from app.models.user import User, UserRole

logger = logging.getLogger("tms.reports")


def _scope_query(q, model_class, current_user: User, org_id: UUID | None = None):
    if current_user.role == UserRole.super_admin:
        if org_id:
            q = q.where(model_class.company_id == org_id)
    else:
        q = q.where(model_class.company_id == current_user.company_id)
    return q


async def get_revenue_report(
    current_user: User,
    db: AsyncSession,
    start_date: datetime | None,
    end_date: datetime | None,
    org_id: UUID | None = None,
) -> dict:
    query = _scope_query(
        select(func.sum(Invoice.final_amount).label("total_revenue")),
        Invoice,
        current_user,
        org_id,
    )
    if start_date:
        query = query.where(Invoice.created_at >= start_date)
    if end_date:
        query = query.where(Invoice.created_at <= end_date)

    result = await db.scalar(query)
    total_revenue = result if result else 0.0

    return {
        "total_revenue": float(total_revenue),
        # In a real scenario, group by client, vehicle, etc.
        "breakdown": []
    }


async def get_trip_report(
    current_user: User,
    db: AsyncSession,
    start_date: datetime | None,
    end_date: datetime | None,
    org_id: UUID | None = None,
) -> dict:
    query = _scope_query(
        select(Trip.status, func.count(Trip.id).label("count")).group_by(Trip.status),
        Trip,
        current_user,
        org_id,
    )
    
    if start_date:
        query = query.where(Trip.created_at >= start_date)
    if end_date:
        query = query.where(Trip.created_at <= end_date)

    results = await db.execute(query)
    
    breakdown = {}
    total = 0
    for row in results.all():
        count = row.count
        breakdown[row.status.value] = count
        total += count
        
    return {
        "total_trips": total,
        "completed": breakdown.get(TripStatus.completed.value, 0),
        "cancelled": breakdown.get(TripStatus.cancelled.value, 0),
        "in_progress": breakdown.get(TripStatus.in_progress.value, 0),
        "breakdown": breakdown
    }
