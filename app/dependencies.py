# TMS Backend — dependencies.py
# Module: Bootstrap | Path: app/dependencies.py
# Purpose: get_db, get_redis, get_current_user, require_role

from __future__ import annotations

from typing import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db  # noqa: F401 (re-exported)
from app.redis_client import get_redis  # noqa: F401 (re-exported)


# ─── Current User Dependency ──────────────────────────────────────────────────
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Reads user identity injected by AuthMiddleware into request.state or parses Bearer token.
    Fetches the full User ORM object from the database.
    Raises 401 if missing or invalid.
    """
    from app.models.user import User
    from app.services.jwt_service import decode_access_token
    from jose import JWTError

    user_id: str | None = getattr(request.state, "user_id", None)
    if not user_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
            try:
                payload = decode_access_token(token)
                user_id = payload.get("sub")
            except JWTError:
                raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid user identifier in token")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ─── RBAC Dependency ──────────────────────────────────────────────────────────
def require_role(*allowed_roles: str) -> Callable:
    """
    Factory that returns a FastAPI dependency enforcing role-based access.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role("admin", "super_admin"))])
    Or as a parameter:
        async def endpoint(current_user = Depends(require_role("admin"))):
    """
    async def dependency(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ):
        user = await get_current_user(request, db)

        allowed_vals = {r.value if hasattr(r, "value") else str(r) for r in allowed_roles}
        user_role_val = user.role.value if hasattr(user.role, "value") else str(user.role)

        if user_role_val not in allowed_vals:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {sorted(list(allowed_vals))}",
            )
        return user

    return dependency
