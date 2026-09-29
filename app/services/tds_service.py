from __future__ import annotations

import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tds_record import TDSRecord
from app.models.user import User, UserRole
from app.schemas.tds import TDSCreate, TDSUpdate

logger = logging.getLogger("tms.tds")


def _scope_query(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(TDSRecord.company_id == current_user.company_id)
    return q


async def list_tds_records(
    current_user: User, db: AsyncSession, page: int = 1, page_size: int = 20
) -> dict:
    from app.utils.pagination import paginate

    query = _scope_query(select(TDSRecord), current_user)
    return await paginate(query.order_by(TDSRecord.created_at.desc()), page, page_size, db)


async def get_tds_record(tds_id: UUID, current_user: User, db: AsyncSession) -> TDSRecord:
    query = _scope_query(select(TDSRecord).where(TDSRecord.id == tds_id), current_user)
    record = await db.scalar(query)
    if not record:
        raise HTTPException(status_code=404, detail="TDS Record not found")
    return record


async def create_tds_record(payload: TDSCreate, current_user: User, db: AsyncSession) -> TDSRecord:
    record = TDSRecord(
        company_id=current_user.company_id,
        client_id=payload.client_id,
        invoice_id=payload.invoice_id,
        financial_year=payload.financial_year,
        tds_percentage=payload.tds_percentage,
        deducted_amount=payload.deducted_amount,
        certificate_number=payload.certificate_number,
    )
    db.add(record)
    await db.flush()
    return record


async def update_tds_record(
    tds_id: UUID, payload: TDSUpdate, current_user: User, db: AsyncSession
) -> TDSRecord:
    record = await get_tds_record(tds_id, current_user, db)
    if payload.certificate_number is not None:
        record.certificate_number = payload.certificate_number
    await db.flush()
    return record
