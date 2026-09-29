from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/me", status_code=status.HTTP_200_OK)
async def read_users_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    return {
        "id": current_user.id,
        "mobile_number": current_user.mobile_number,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role.value,
        "company_id": current_user.company_id,
        "status": current_user.status.value,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
    }

@router.get("/", status_code=status.HTTP_200_OK)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.utils.pagination import paginate
    from app.models.user import UserRole
    from app.schemas.auth import UserResponse
    
    query = select(User)
    if current_user.role != UserRole.super_admin:
        query = query.where(User.company_id == current_user.company_id)
        
    result = await paginate(query.order_by(User.created_at.desc()), page, page_size, db)
    # ORM rows don't serialise, and must not: they carry password_hash.
    result["items"] = [UserResponse.model_validate(u) for u in result["items"]]
    return result
