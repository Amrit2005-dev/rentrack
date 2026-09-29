# TMS Backend — company.py (ORM Model)
# Module: 2 — Registration | Path: app/models/company.py
# Purpose: companies table

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CompanyStatus(str, enum.Enum):
    pending = "pending"      # registered, waiting for a super admin
    active = "active"
    rejected = "rejected"
    suspended = "suspended"


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    city = Column(String(100), nullable=True)
    # Stored as plain text (not a PG enum) so adding a state needs no type migration.
    status = Column(
        String(20),
        nullable=False,
        default=CompanyStatus.active.value,
        server_default=CompanyStatus.active.value,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    users = relationship("User", back_populates="company", lazy="dynamic")
    registration_requests = relationship(
        "RegistrationRequest", back_populates="company", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Company id={self.id} name={self.name!r}>"
