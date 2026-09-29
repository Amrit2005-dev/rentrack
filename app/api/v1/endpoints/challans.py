from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.challan import ChallanCreate
from app.services.challan_service import (
    list_challans,
    get_challan,
    create_challan,
    notify_client_challan
)

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_challans(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_challans(current_user, db, page, page_size)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_challan(
    payload: ChallanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await create_challan(payload, current_user, db)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_challan_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_challan(id, current_user, db)

@router.post("/{id}/notify", status_code=status.HTTP_200_OK)
async def notify_client(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    await notify_client_challan(id, current_user, db)
    return {"message": "Notification sent successfully"}
