from __future__ import annotations

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.challan import Challan, ChallanItem, ChallanStatus
from app.models.rate_card import RateCard
from app.models.vehicle import Vehicle
from app.models.user import User, UserRole
from app.schemas.challan import ChallanCreate

logger = logging.getLogger("tms.challan")


def _scope_query(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(Challan.company_id == current_user.company_id)
    return q


async def list_challans(
    current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    from app.utils.pagination import paginate

    query = _scope_query(select(Challan), current_user)
    return await paginate(query.order_by(Challan.created_at.desc()), page, page_size, db)


async def get_challan(challan_id: UUID, current_user: User, db: AsyncSession) -> Challan:
    query = _scope_query(select(Challan).where(Challan.id == challan_id), current_user)
    challan = await db.scalar(query)
    if not challan:
        raise HTTPException(status_code=404, detail="Challan not found")
    return challan


async def _hourly_rate(vehicle_id: UUID | None, client_id: UUID | None, company_id, db: AsyncSession) -> Decimal:
    """per_hour_rate for the vehicle's type: the client's own card first, then the company default."""
    if not vehicle_id:
        return Decimal("0")
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle or vehicle.company_id != company_id:
        raise HTTPException(status_code=400, detail="Vehicle not found")
    cards = (
        await db.scalars(
            select(RateCard).where(
                RateCard.company_id == company_id,
                func.lower(RateCard.vehicle_type) == vehicle.type.lower(),
                or_(RateCard.client_id == client_id, RateCard.client_id.is_(None)),
            )
        )
    ).all()
    # A client-specific card beats the company-wide one.
    card = next((c for c in cards if c.client_id is not None), None) or next(iter(cards), None)
    return Decimal(card.per_hour_rate) if card else Decimal("0")


async def create_challan(payload: ChallanCreate, current_user: User, db: AsyncSession) -> Challan:
    challan = Challan(
        company_id=current_user.company_id,
        client_id=payload.client_id,
        challan_date=payload.challan_date,
        status=ChallanStatus.draft,
        created_by=current_user.id,
    )
    total_hours = Decimal("0")
    total_amount = Decimal("0")
    for item in payload.items:
        rate = await _hourly_rate(item.vehicle_id, payload.client_id, current_user.company_id, db)
        amount = (item.running_hours * rate).quantize(Decimal("0.01"))
        challan.items.append(
            ChallanItem(
                vehicle_id=item.vehicle_id,
                driver_id=item.driver_id,
                running_hours=item.running_hours,
                amount=amount,
            )
        )
        total_hours += item.running_hours
        total_amount += amount
    challan.total_hours = total_hours
    challan.total_amount = total_amount
    db.add(challan)
    await db.flush()
    return challan


async def notify_client_challan(challan_id: UUID, current_user: User, db: AsyncSession) -> None:
    challan = await get_challan(challan_id, current_user, db)
    logger.info(f"Notification triggered for challan {challan.id}")
    # Integration with SMS service placeholder
    # sms_service.dispatch_sms(client.mobile, f"New challan {challan.id}")
