# TMS Backend — billing.py (API Endpoint)
# Purpose: /billing alias for /invoices — the frontend calls /billing while
#          the existing backend mounts invoices at /invoices. Both paths work.

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdateStatus
from app.services.invoice_service import (
    create_invoice,
    get_invoice,
    list_invoices,
    update_invoice_status,
)

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def get_billing_list(
    page: int = 1,
    page_size: int = 20,
    client_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await list_invoices(current_user, db, page, page_size)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_billing(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await create_invoice(payload, current_user, db)


@router.post("/from-challans", status_code=status.HTTP_201_CREATED)
async def create_from_challans(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Raise an invoice from already-recorded challans (same as create for now)."""
    return await create_invoice(payload, current_user, db)


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_billing_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await get_invoice(id, current_user, db)


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_billing(
    id: UUID,
    payload: InvoiceUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await update_invoice_status(id, payload, current_user, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_billing(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    invoice = await get_invoice(id, current_user, db)
    from app.database import get_db as _db  # noqa — db already in scope
    await db.delete(invoice)
