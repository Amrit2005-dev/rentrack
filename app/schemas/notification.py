# TMS Backend — notification.py (Pydantic Schemas)
# Module: 3 — Admin/User Core | Path: app/schemas/notification.py

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    user_id: Optional[UUID]
    title: str
    body: str
    type: str
    is_read: bool
    created_at: datetime
