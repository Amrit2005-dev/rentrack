# TMS Backend — driver_collections.py (API Endpoint)
# Purpose: CRUD for /driver-collections/ — DriverCollection model already exists.
#          Drivers can read/create their own; admins see the whole company.

from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.driver import Driver
from app.models.driver_collection import DriverCollection
from app.models.user import User, UserRole

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CollectionCreate(BaseModel):
    driver_id: UUID
    trip_id: Optional[UUID] = None
    collection_date: Optional[date] = None
    amount: float
    payment_mode: str          # CASH | UPI | BANK_TRANSFER | CHEQUE
    reference_no: Optional[str] = None
    notes: Optional[str] = None


class CollectionUpdate(BaseModel):
    amount: Optional[float] = None
    payment_mode: Optional[str] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_or_404(col_id: UUID, current_user: User, db: AsyncSession) -> DriverCollection:
    q = select(DriverCollection).where(DriverCollection.id == col_id)
    if current_user.role != UserRole.super_admin:
        q = q.where(DriverCollection.company_id == current_user.company_id)
    col = await db.scalar(q)
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return col


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", status_code=status.HTTP_200_OK)
async def list_collections(
    org_id: Optional[UUID] = None,
    driver_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    q = select(DriverCollection)
    if current_user.role == UserRole.super_admin:
        if org_id:
            q = q.where(DriverCollection.company_id == org_id)
    else:
        q = q.where(DriverCollection.company_id == current_user.company_id)
        # Drivers see only their own collections
        if current_user.role == UserRole.user:
            driver_result = await db.execute(
                select(Driver).where(Driver.user_id == current_user.id)
            )
            driver = driver_result.scalar_one_or_none()
            if driver:
                q = q.where(DriverCollection.driver_id == driver.id)

    if driver_id:
        q = q.where(DriverCollection.driver_id == driver_id)

    result = await db.execute(q.order_by(DriverCollection.collection_date.desc()))
    rows = result.scalars().all()
    return rows


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    company_id = (
        org_id
        if (current_user.role == UserRole.super_admin and org_id)
        else current_user.company_id
    )
    col = DriverCollection(
        company_id=company_id,
        driver_id=payload.driver_id,
        trip_id=payload.trip_id,
        collection_date=payload.collection_date or date.today(),
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        reference_no=payload.reference_no,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(col)
    await db.flush()
    return col


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_collection(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await _get_or_404(id, current_user, db)


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_collection(
    id: UUID,
    payload: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    col = await _get_or_404(id, current_user, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(col, field, val)
    await db.flush()
    return col


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> None:
    col = await _get_or_404(id, current_user, db)
    await db.delete(col)
