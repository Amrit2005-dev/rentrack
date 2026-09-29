from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.tds import TDSCreate, TDSUpdate
from app.services.tds_service import (
    list_tds_records,
    get_tds_record,
    create_tds_record,
    update_tds_record
)

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_tds_records(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_tds_records(current_user, db, page, page_size)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_tds_record(
    payload: TDSCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await create_tds_record(payload, current_user, db)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_tds_record_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_tds_record(id, current_user, db)

@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_existing_tds_record(
    id: UUID,
    payload: TDSUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await update_tds_record(id, payload, current_user, db)
