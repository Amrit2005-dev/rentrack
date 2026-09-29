from typing import Any, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.reports_service import (
    get_revenue_report,
    get_trip_report
)

router = APIRouter()

@router.get("/revenue", status_code=status.HTTP_200_OK)
async def revenue_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_revenue_report(current_user, db, start_date, end_date, org_id)

@router.get("/trips", status_code=status.HTTP_200_OK)
async def trip_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_trip_report(current_user, db, start_date, end_date, org_id)
