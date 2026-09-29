from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from app.services.driver_service import (
    list_drivers,
    get_available_drivers,
    get_driver,
    create_driver,
    update_driver,
    deactivate_driver,
    update_driver_licence_document
)

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_drivers_list(
    page: int = 1,
    page_size: int = 20,
    availability: Optional[str] = None,
    status: Optional[str] = None,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_drivers(current_user, db, page, page_size, availability, status, org_id)

@router.get("/available", status_code=status.HTTP_200_OK)
async def get_available_drivers_list(
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_available_drivers(current_user, db, org_id)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_driver(
    payload: DriverCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin))
) -> Any:
    """Creates a driver, plus its sign-in account when `login` is given. Super admins pass `org_id`."""
    return await create_driver(payload, current_user, db, org_id)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_driver_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_driver(id, current_user, db)

@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_existing_driver(
    id: UUID,
    payload: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await update_driver(id, payload, current_user, db)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_driver(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    await deactivate_driver(id, current_user, db)


@router.post("/{id}/licence-document", status_code=status.HTTP_200_OK)
async def upload_driver_licence(
    id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    from app.utils.storage import read_document

    content, content_type, ext = await read_document(file)
    return await update_driver_licence_document(id, content, ext, content_type, current_user, db)
