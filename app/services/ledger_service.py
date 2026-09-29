from __future__ import annotations

import logging
from datetime import date
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.ledger import LedgerEntry, LedgerEntryType
from app.models.user import User, UserRole
from app.schemas.ledger import PaymentCreate

logger = logging.getLogger("tms.ledger")


async def _get_client(client_id: UUID, current_user: User, db: AsyncSession) -> Client:
    # ledger_entries has no company_id of its own; the client row carries it.
    query = select(Client).where(Client.id == client_id)
    if current_user.role != UserRole.super_admin:
        query = query.where(Client.company_id == current_user.company_id)
    client = await db.scalar(query)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


async def list_ledger_entries(
    client_id: UUID, current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    from app.utils.pagination import paginate

    await _get_client(client_id, current_user, db)
    query = select(LedgerEntry).where(LedgerEntry.client_id == client_id)
    return await paginate(query.order_by(LedgerEntry.created_at.desc()), page, page_size, db)


async def record_payment(
    client_id: UUID, payload: PaymentCreate, current_user: User, db: AsyncSession
) -> LedgerEntry:
    await _get_client(client_id, current_user, db)
    # The table has no columns for payment mode or invoice, so they ride along
    # in reference_no / note rather than being dropped.
    note = f"[{payload.payment_mode}] {payload.notes}" if payload.notes else f"[{payload.payment_mode}]"
    entry = LedgerEntry(
        client_id=client_id,
        entry_type=LedgerEntryType.payment,
        amount=payload.amount,
        reference_no=payload.reference_no or (str(payload.invoice_id) if payload.invoice_id else None),
        note=note,
        entry_date=date.today(),
    )
    db.add(entry)
    await db.flush()
    return entry
