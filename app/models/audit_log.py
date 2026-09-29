# TMS Backend — audit_log.py (ORM Model)
# Module: Bootstrap | Path: app/models/audit_log.py
# Purpose: audit_logs table — write-once audit trail for all financial/status changes

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class AuditAction(str, enum.Enum):
    create = "create"
    update = "update"
    delete = "delete"
    status_change = "status_change"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    action = Column(
        Enum(AuditAction, name="audit_action_enum"),
        nullable=False,
    )
    changed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<AuditLog action={self.action} table={self.table_name} record={self.record_id}>"
