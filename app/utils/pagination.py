# TMS Backend — pagination.py
# Module: Bootstrap | Path: app/utils/pagination.py
# Purpose: Generic pagination helper for all list endpoints

from __future__ import annotations

import math
from typing import Any, Generic, List, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated list container returned by all list endpoints."""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


async def paginate(
    query,
    page: int,
    page_size: int,
    db: AsyncSession,
) -> dict:
    """
    Execute a count query and a paginated data query.

    Args:
        query: A SQLAlchemy Select statement (without offset/limit).
        page: 1-based page number.
        page_size: Items per page.
        db: AsyncSession.

    Returns:
        dict suitable for wrapping in success() response envelope.
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    # Count total matching rows
    count_query = select(func.count()).select_from(query.subquery())
    total: int = await db.scalar(count_query) or 0

    # Fetch the page
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    items = result.scalars().all()

    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
