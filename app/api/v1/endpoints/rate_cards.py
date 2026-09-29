# TMS Backend — rate_cards.py (API Endpoint)
# Purpose: Full CRUD for /rate-cards/ — RateCard model already exists

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.rate_card import RateCard
from app.models.user import User, UserRole

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class RateCardCreate(BaseModel):
    vehicle_type: str
    client_id: Optional[UUID] = None   # None = company-wide default
    base_fare: float = 0
    per_km_rate: float = 0
    per_ton_rate: float = 0
    per_hour_rate: float = 0
    waiting_rate: float = 0


class RateCardUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    client_id: Optional[UUID] = None
    base_fare: Optional[float] = None
    per_km_rate: Optional[float] = None
    per_ton_rate: Optional[float] = None
    per_hour_rate: Optional[float] = None
    waiting_rate: Optional[float] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _scope(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(RateCard.company_id == current_user.company_id)
    return q


async def _get_or_404(card_id: UUID, current_user: User, db: AsyncSession) -> RateCard:
    q = _scope(select(RateCard).where(RateCard.id == card_id), current_user)
    card = await db.scalar(q)
    if not card:
        raise HTTPException(status_code=404, detail="Rate card not found.")
    return card


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", status_code=status.HTTP_200_OK)
async def list_rate_cards(
    org_id: Optional[UUID] = None,
    client_id: Optional[UUID] = None,
    vehicle_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    q = select(RateCard)
    if current_user.role == UserRole.super_admin and org_id:
        q = q.where(RateCard.company_id == org_id)
    else:
        q = _scope(q, current_user)

    if client_id:
        q = q.where(RateCard.client_id == client_id)
    if vehicle_type:
        q = q.where(RateCard.vehicle_type.ilike(vehicle_type))

    from sqlalchemy import func
    result = await db.execute(q.order_by(RateCard.vehicle_type))
    rows = result.scalars().all()
    # Return a bare list — the frontend wraps it in toPage()
    return rows


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_rate_card(
    payload: RateCardCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    company_id = (
        org_id
        if (current_user.role == UserRole.super_admin and org_id)
        else current_user.company_id
    )
    card = RateCard(
        company_id=company_id,
        client_id=payload.client_id,
        vehicle_type=payload.vehicle_type,
        base_fare=payload.base_fare,
        per_km_rate=payload.per_km_rate,
        per_ton_rate=payload.per_ton_rate,
        per_hour_rate=payload.per_hour_rate,
        waiting_rate=payload.waiting_rate,
    )
    db.add(card)
    await db.flush()
    return card


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_rate_card(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await _get_or_404(id, current_user, db)


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_rate_card(
    id: UUID,
    payload: RateCardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    card = await _get_or_404(id, current_user, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(card, field, val)
    await db.flush()
    return card


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rate_card(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> None:
    card = await _get_or_404(id, current_user, db)
    await db.delete(card)
