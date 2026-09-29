# TMS Backend — database.py
# Module: Bootstrap | Path: app/database.py
# Purpose: Async SQLAlchemy engine, session factory, Base, and get_db dependency

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from pydantic_core import SchemaSerializer, core_schema
from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ─── Engine ───────────────────────────────────────────────────────────────────
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    database_url,
    echo=False,           # Set True to log SQL queries during development
    pool_pre_ping=True,   # Verify connections before use
    pool_size=10,
    max_overflow=20,
)

# ─── Session Factory ──────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# ─── Declarative Base ─────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All ORM models inherit from this base."""

    # Fetch server-generated values (created_at, onupdate=now() updated_at) via
    # RETURNING on flush. Otherwise they're left expired, and reading one later
    # needs a lazy load, which async sessions can't do (MissingGreenlet).
    __mapper_args__ = {"eager_defaults": True}

    def to_dict(self) -> dict:
        """Loaded column values, minus secrets. Never triggers a lazy load."""
        state = inspect(self)
        return {
            attr.key: getattr(self, attr.key)
            for attr in state.mapper.column_attrs
            if attr.key not in state.unloaded and attr.key not in _SECRET_COLUMNS
        }


# Hashes of passwords, OTPs and refresh tokens must never leave the API.
_SECRET_COLUMNS = frozenset({"password_hash", "otp_hash", "token_hash", "receiver_otp_hash"})

# Most routes are declared `-> Any` without a response_model and return ORM rows
# directly. FastAPI serialises `Any` through pydantic, which cannot handle an ORM
# object, so every such route 500s. pydantic uses a class's
# __pydantic_serializer__ when it meets an unknown value, so this one hook makes
# every model serialise as its to_dict().
Base.__pydantic_serializer__ = SchemaSerializer(
    core_schema.any_schema(
        serialization=core_schema.plain_serializer_function_ser_schema(lambda row: row.to_dict())
    )
)


# ─── Dependency ───────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an AsyncSession and ensures cleanup."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
