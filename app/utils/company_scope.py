# TMS Backend — company_scope.py
# Purpose: resolve the company a newly created record belongs to

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException

from app.models.user import User, UserRole


def target_company_id(current_user: User, org_id: UUID | None) -> UUID:
    """
    Admins create inside their own company. A super admin manages other
    companies by passing `org_id`; without it the record lands in their own.
    """
    if current_user.role == UserRole.super_admin and org_id:
        return org_id
    if current_user.company_id is None:
        raise HTTPException(status_code=400, detail="Choose a company to create this in (org_id).")
    return current_user.company_id
