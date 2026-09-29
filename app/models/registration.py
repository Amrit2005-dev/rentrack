# TMS Backend — registration.py (ORM Model)
# Module: 2 — Registration | Path: app/models/registration.py
# Purpose: registration_requests, approval_history tables

from __future__ import annotations

import enum
from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class RegistrationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ApprovalAction(str, enum.Enum):
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    role_changed = "role_changed"


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        Enum(RegistrationStatus, name="registration_status_enum"),
        nullable=False,
        default=RegistrationStatus.pending,
        server_default=RegistrationStatus.pending.value,
    )
    rejection_reason = Column(String(500), nullable=True)
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="selectin")
    company = relationship("Company", back_populates="registration_requests", lazy="selectin")
    history = relationship(
        "ApprovalHistory", back_populates="registration", lazy="dynamic"
    )


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    registration_id = Column(
        UUID(as_uuid=True),
        ForeignKey("registration_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action = Column(
        Enum(ApprovalAction, name="approval_action_enum"),
        nullable=False,
    )
    performed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    registration = relationship("RegistrationRequest", back_populates="history")
    performer = relationship("User", foreign_keys=[performed_by], lazy="selectin")
