from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from app.models.user import User, UserRole
from app.schemas.invoice import InvoiceCreate, InvoiceUpdateStatus

logger = logging.getLogger("tms.invoice")


def _scope_query(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(Invoice.company_id == current_user.company_id)
    return q


async def list_invoices(
    current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    from app.utils.pagination import paginate

    query = _scope_query(select(Invoice), current_user)
    return await paginate(query.order_by(Invoice.created_at.desc()), page, page_size, db)


async def get_invoice(invoice_id: UUID, current_user: User, db: AsyncSession) -> Invoice:
    query = _scope_query(select(Invoice).where(Invoice.id == invoice_id), current_user)
    invoice = await db.scalar(query)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


async def create_invoice(payload: InvoiceCreate, current_user: User, db: AsyncSession) -> Invoice:
    # Basic math for total
    total_amount = sum(item.amount for item in payload.items)
    gst_amount = (total_amount * payload.gst_percentage) / 100
    tds_amount = (total_amount * payload.tds_percentage) / 100
    final_amount = total_amount + gst_amount - tds_amount

    # Timestamp plus a random suffix: the timestamp alone collides when two
    # invoices are created in the same second (unique index -> 500).
    invoice_number = f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"

    invoice = Invoice(
        company_id=current_user.company_id,
        client_id=payload.client_id,
        invoice_number=invoice_number,
        status=InvoiceStatus.draft,
        total_amount=total_amount,
        gst_amount=gst_amount,
        tds_amount=tds_amount,
        final_amount=final_amount,
        due_date=payload.due_date,
        notes=payload.notes,
    )
    db.add(invoice)
    await db.flush()

    for item in payload.items:
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            description=item.description,
            amount=item.amount,
            trip_id=item.trip_id,
            challan_id=item.challan_id,
        )
        db.add(inv_item)
        
    await db.flush()
    return invoice


async def update_invoice_status(
    invoice_id: UUID, payload: InvoiceUpdateStatus, current_user: User, db: AsyncSession
) -> Invoice:
    invoice = await get_invoice(invoice_id, current_user, db)
    
    if payload.status:
        try:
            invoice.status = InvoiceStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")

    if payload.paid_amount is not None:
        invoice.paid_amount = payload.paid_amount
        if invoice.paid_amount >= invoice.final_amount:
            invoice.status = InvoiceStatus.paid
        elif invoice.paid_amount > 0:
            invoice.status = InvoiceStatus.partial
            
    await db.flush()
    return invoice
