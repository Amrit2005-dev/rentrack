# TMS Backend — notification_service.py
# Module: 3 — Admin/User Core | Path: app/services/notification_service.py
# Purpose: In-app notification creation and dispatch

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import Notification, NotificationType
from app.services.sms_service import send_sms

logger = logging.getLogger("tms.notifications")


async def create_notification(
    db: AsyncSession,
    company_id: UUID,
    title: str,
    body: str,
    notification_type: NotificationType,
    user_id: UUID | None = None,  # None = broadcast to all company users
) -> Notification:
    """Create an in-app notification record."""
    notif = Notification(
        company_id=company_id,
        user_id=user_id,
        title=title,
        body=body,
        type=notification_type,
        is_read=False,
    )
    db.add(notif)
    await db.flush()
    return notif


async def list_notifications(
    company_id: UUID,
    user_id: UUID,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Return notifications for a user (own + broadcast)."""
    from app.utils.pagination import paginate
    from sqlalchemy import or_

    query = (
        select(Notification)
        .where(Notification.company_id == company_id)
        .where(
            or_(Notification.user_id == user_id, Notification.user_id.is_(None))
        )
        .order_by(Notification.created_at.desc())
    )
    return await paginate(query, page, page_size, db)


async def mark_as_read(notif_id: UUID, user_id: UUID, db: AsyncSession) -> None:
    from fastapi import HTTPException

    notif = await db.get(Notification, notif_id)
    if notif is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.flush()


async def mark_all_read(company_id: UUID, user_id: UUID, db: AsyncSession) -> None:
    from sqlalchemy import or_, update

    await db.execute(
        update(Notification)
        .where(Notification.company_id == company_id)
        .where(or_(Notification.user_id == user_id, Notification.user_id.is_(None)))
        .values(is_read=True)
    )
    await db.flush()


async def send_trip_sms(mobile: str, message: str) -> None:
    """Fire-and-forget SMS for trip events. Called as a BackgroundTask."""
    await send_sms(mobile, message)
