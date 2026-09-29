from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.ledger import PaymentCreate
from app.services.ledger_service import (
    list_ledger_entries,
    record_payment
)

router = APIRouter()

@router.get("/{client_id}", status_code=status.HTTP_200_OK)
async def get_ledger_entries(
    client_id: UUID,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_ledger_entries(client_id, current_user, db, page, page_size)

@router.post("/{client_id}/payment", status_code=status.HTTP_201_CREATED)
async def create_payment(
    client_id: UUID,
    payload: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await record_payment(client_id, payload, current_user, db)
