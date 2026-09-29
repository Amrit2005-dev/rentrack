from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdateStatus
from app.services.invoice_service import (
    list_invoices,
    get_invoice,
    create_invoice,
    update_invoice_status
)

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_invoices(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_invoices(current_user, db, page, page_size)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await create_invoice(payload, current_user, db)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_invoice_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_invoice(id, current_user, db)

@router.put("/{id}/status", status_code=status.HTTP_200_OK)
async def update_status(
    id: UUID,
    payload: InvoiceUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await update_invoice_status(id, payload, current_user, db)
