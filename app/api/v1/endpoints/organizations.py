# TMS Backend — organizations.py (API Endpoint)
# Purpose: /organizations/ maps to the Company model.
#          The frontend calls these "organizations"; the backend stores them as "companies".

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.company import Company, CompanyStatus
from app.models.user import User, UserRole

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class OrgCreate(BaseModel):
    name: str
    city: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None


class OrgRegisterRequest(BaseModel):
    """Public self-service onboarding — delegates to registration_service."""
    company_name: str
    mobile_number: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "user"
    company_id: Optional[UUID] = None


class OrgActionRequest(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_or_404(org_id: UUID, db: AsyncSession) -> Company:
    company = await db.scalar(select(Company).where(Company.id == org_id))
    if not company:
        raise HTTPException(status_code=404, detail="Organisation not found.")
    return company


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_organization(
    payload: OrgRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Public self-service company onboarding.
    Delegates to registration_service so the approval queue is unified.
    """
    from app.schemas.registration import RegisterRequest
    from app.services.registration_service import register_user

    reg_payload = RegisterRequest(
        company_name=payload.company_name,
        mobile_number=payload.mobile_number,
        first_name=payload.first_name,
        last_name=payload.last_name,
        city=payload.city,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        company_id=payload.company_id,
    )
    return await register_user(reg_payload, db)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_organizations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    from app.utils.pagination import paginate
    q = select(Company).order_by(Company.name)
    return await paginate(q, page, page_size, db)


@router.get("/public", status_code=status.HTTP_200_OK)
async def list_public_organizations(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Return active companies available to driver applicants."""
    result = await db.execute(
        select(Company)
        .where(Company.status == CompanyStatus.active.value)
        .order_by(Company.name)
    )
    return [
        {"id": str(company.id), "name": company.name, "city": company.city}
        for company in result.scalars().all()
    ]


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_organization(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    company = await _get_or_404(id, db)
    # Admins can only see their own company
    if current_user.role != UserRole.super_admin and company.id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return company


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    dup = await db.scalar(select(Company).where(Company.name == payload.name))
    if dup:
        raise HTTPException(status_code=409, detail="An organisation with that name already exists.")
    company = Company(name=payload.name, city=payload.city)
    db.add(company)
    await db.flush()
    return company


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_organization(
    id: UUID,
    payload: OrgUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    company = await _get_or_404(id, db)
    if payload.name is not None:
        company.name = payload.name
    if payload.city is not None:
        company.city = payload.city
    await db.flush()
    return company


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> None:
    company = await _get_or_404(id, db)
    await db.delete(company)


@router.post("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_organization(
    id: UUID,
    payload: Optional[OrgActionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    """Approve a pending organisation (sets all its pending users to approved)."""
    company = await _get_or_404(id, db)
    from app.models.user import User as UserModel, UserStatus
    result = await db.execute(
        select(UserModel).where(
            UserModel.company_id == id,
            UserModel.status == UserStatus.pending,
        )
    )
    for user in result.scalars().all():
        user.status = UserStatus.approved
    company.status = CompanyStatus.active.value
    await db.flush()
    return {"message": f"Organisation {company.name!r} approved.", "id": str(id)}


@router.post("/{id}/reject", status_code=status.HTTP_200_OK)
async def reject_organization(
    id: UUID,
    payload: Optional[OrgActionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    company = await _get_or_404(id, db)
    from app.models.user import User as UserModel, UserStatus
    result = await db.execute(
        select(UserModel).where(UserModel.company_id == id, UserModel.status == UserStatus.pending)
    )
    for user in result.scalars().all():
        user.status = UserStatus.rejected
    company.status = CompanyStatus.rejected.value
    await db.flush()
    return {"message": f"Organisation {company.name!r} rejected.", "id": str(id)}


@router.post("/{id}/suspend", status_code=status.HTTP_200_OK)
async def suspend_organization(
    id: UUID,
    payload: Optional[OrgActionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
) -> Any:
    """Suspend: mark all active users in the org as pending (blocks sign-in)."""
    company = await _get_or_404(id, db)
    from app.models.user import User as UserModel, UserStatus
    result = await db.execute(
        select(UserModel).where(
            UserModel.company_id == id,
            UserModel.status.in_([UserStatus.active, UserStatus.approved]),
        )
    )
    for user in result.scalars().all():
        user.status = UserStatus.pending
    company.status = CompanyStatus.suspended.value
    await db.flush()
    return {"message": f"Organisation {company.name!r} suspended.", "id": str(id)}
