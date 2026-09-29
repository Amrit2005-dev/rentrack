from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import Quotation, QuotationStatus
from app.models.user import User, UserRole
from app.schemas.quotation import QuotationCreate

logger = logging.getLogger("tms.quotation")


def _scope_query(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(Quotation.company_id == current_user.company_id)
    return q


async def list_quotations(
    current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    from app.utils.pagination import paginate

    query = _scope_query(select(Quotation), current_user)
    return await paginate(query.order_by(Quotation.created_at.desc()), page, page_size, db)


async def get_quotation(quotation_id: UUID, current_user: User, db: AsyncSession) -> Quotation:
    query = _scope_query(select(Quotation).where(Quotation.id == quotation_id), current_user)
    quotation = await db.scalar(query)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


async def create_quotation(payload: QuotationCreate, current_user: User, db: AsyncSession) -> Quotation:
    # Same timestamp scheme as invoice numbers, plus a suffix so two quotations
    # created in the same second don't collide on the unique index.
    quotation_number = f"QT-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
    quotation = Quotation(
        quotation_number=quotation_number,
        company_id=current_user.company_id,
        status=QuotationStatus.draft,
        created_by=current_user.id,
        **payload.model_dump(exclude_unset=True),
    )
    db.add(quotation)
    await db.flush()
    return quotation


async def update_quotation_status(
    quotation_id: UUID, status: str, current_user: User, db: AsyncSession
) -> Quotation:
    quotation = await get_quotation(quotation_id, current_user, db)
    try:
        quotation.status = QuotationStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.flush()
    return quotation
