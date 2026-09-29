# TMS Backend — client.py (ORM Model — STUB)
# Module: Stub for Modules 4+5 FK integrity | Path: app/models/client.py
# Purpose: clients table stub — will be expanded in Module 6

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Column, DateTime, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Client(Base):
    """
    Minimal clients stub. Full version added in Module 6.
    Required now because challans and quotations reference clients.
    """
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        # FK added after companies migration; referenced directly
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    contact_person = Column(String(100), nullable=True)
    mobile = Column(String(15), nullable=True)
    email = Column(String(255), nullable=True)
    current_balance = Column(Numeric(12, 2), default=0, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships (expanded in Module 6)
    rate_cards = relationship("RateCard", back_populates="client", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r}>"
