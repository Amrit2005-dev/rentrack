# TMS Backend — clients.py (API Endpoint)
# Purpose: Full CRUD for /clients/ — Client model already exists as a stub

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.client import Client
from app.models.user import User, UserRole

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _scope(q, current_user: User):
    if current_user.role != UserRole.super_admin:
        q = q.where(Client.company_id == current_user.company_id)
    return q


async def _get_or_404(client_id: UUID, current_user: User, db: AsyncSession) -> Client:
    q = _scope(select(Client).where(Client.id == client_id), current_user)
    client = await db.scalar(q)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    return client


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/", status_code=status.HTTP_200_OK)
async def list_clients(
    page: int = 1,
    page_size: int = 50,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    from app.utils.pagination import paginate

    q = select(Client)
    if current_user.role == UserRole.super_admin and org_id:
        q = q.where(Client.company_id == org_id)
    else:
        q = _scope(q, current_user)

    return await paginate(q.order_by(Client.name), page, page_size, db)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    org_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    company_id = (
        org_id
        if (current_user.role == UserRole.super_admin and org_id)
        else current_user.company_id
    )
    client = Client(
        company_id=company_id,
        name=payload.name,
        contact_person=payload.contact_person,
        mobile=payload.mobile,
        email=payload.email,
    )
    db.add(client)
    await db.flush()
    return client


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_client(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await _get_or_404(id, current_user, db)


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_client(
    id: UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> Any:
    client = await _get_or_404(id, current_user, db)
    if payload.name is not None:
        client.name = payload.name
    if payload.contact_person is not None:
        client.contact_person = payload.contact_person
    if payload.mobile is not None:
        client.mobile = payload.mobile
    if payload.email is not None:
        client.email = payload.email
    await db.flush()
    return client


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
) -> None:
    client = await _get_or_404(id, current_user, db)
    await db.delete(client)
