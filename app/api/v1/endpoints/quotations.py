from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.quotation import QuotationCreate
from app.services.quotation_service import (
    list_quotations,
    get_quotation,
    create_quotation,
    update_quotation_status
)

router = APIRouter()

class QuotationStatusUpdate(BaseModel):
    status: str

@router.get("/", status_code=status.HTTP_200_OK)
async def get_quotations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_quotations(current_user, db, page, page_size)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_quotation(
    payload: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await create_quotation(payload, current_user, db)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_quotation_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_quotation(id, current_user, db)

@router.put("/{id}/status", status_code=status.HTTP_200_OK)
async def update_status(
    id: UUID,
    payload: QuotationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await update_quotation_status(id, payload.status, current_user, db)
