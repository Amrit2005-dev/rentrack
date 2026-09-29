from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services.vehicle_service import (
    list_vehicles,
    get_vehicle,
    create_vehicle,
    update_vehicle,
    deactivate_vehicle,
    upload_vehicle_image,
    upload_vehicle_document,
)

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_vehicles_list(
    page: int = 1,
    page_size: int = 20,
    vehicle_status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await list_vehicles(
        current_user, db, page, page_size, vehicle_status, vehicle_type, org_id
    )

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_vehicle(
    payload: VehicleCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin))
) -> Any:
    """Super admins pass `org_id` to create inside the company they manage."""
    return await create_vehicle(payload, current_user, db, org_id)

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_vehicle_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await get_vehicle(id, current_user, db)

@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_existing_vehicle(
    id: UUID,
    payload: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return await update_vehicle(id, payload, current_user, db)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    await deactivate_vehicle(id, current_user, db)

@router.post("/{id}/upload-image", status_code=status.HTTP_200_OK)
async def upload_image(
    id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    url = await upload_vehicle_image(id, file, current_user, db)
    return {"image_url": url}


@router.post("/{id}/documents/{kind}", status_code=status.HTTP_200_OK)
async def upload_document(
    id: UUID,
    kind: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Attach a scan of a compliance document. `kind`: rc | insurance | fitness | puc."""
    return await upload_vehicle_document(id, kind, file, current_user, db)
