# TMS Backend — audit_service.py
# Module: Bootstrap | Path: app/services/audit_service.py
# Purpose: Write AuditLog entries — called within the parent transaction (no commit here)

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession


async def log(
    db: AsyncSession,
    table_name: str,
    record_id: UUID | str,
    action: str,  # 'create' | 'update' | 'delete' | 'status_change'
    changed_by: UUID | str,
    old_val: Any = None,
    new_val: Any = None,
) -> None:
    """
    Append an AuditLog row within the caller's open transaction.
    The caller must commit; this function never commits.

    Args:
        db: Active AsyncSession.
        table_name: Name of the table being audited (e.g. 'trips').
        record_id: UUID of the record being changed.
        action: One of 'create', 'update', 'delete', 'status_change'.
        changed_by: UUID of the user performing the action.
        old_val: Previous state (dict or None).
        new_val: New state (dict or None).
    """
    # Import deferred to avoid circular imports at module level
    from app.models.audit_log import AuditLog

    entry = AuditLog(
        table_name=table_name,
        record_id=UUID(str(record_id)),
        action=action,
        changed_by=UUID(str(changed_by)),
        old_value=old_val,
        new_value=new_val,
    )
    db.add(entry)
    # Intentionally NO commit — caller owns the transaction
