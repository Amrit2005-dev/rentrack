# TMS Backend — jwt_service.py
# Module: 1 — Login | Path: app/services/jwt_service.py
# Purpose: JWT access token creation + refresh token management

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import bcrypt
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger("tms.jwt")

_MOBILE_VERIFY_TOKEN_TYPE = "mobile_verification"
_MOBILE_VERIFY_TOKEN_EXPIRE_MINUTES = 15


# ─── Access Token ─────────────────────────────────────────────────────────────
def create_access_token(user_id: UUID, role: str, company_id: UUID | None) -> str:
    """
    Create a signed JWT access token.

    Payload:
      sub        → user UUID (string)
      role       → user role string
      company_id → company UUID (string) or None for super_admin without company
      jti        → unique token ID (for blacklisting on logout)
      iat        → issued at
      exp        → expires at (ACCESS_TOKEN_EXPIRE_MINUTES from now)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "company_id": str(company_id) if company_id else None,
        "jti": str(uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Raises:
        JWTError: On invalid signature, expired token, or malformed token.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ─── Refresh Token ────────────────────────────────────────────────────────────
def _hash_token(raw_token: str) -> str:
    """SHA-256 hash of the raw refresh token for secure DB storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


async def create_refresh_token(user_id: UUID, db: AsyncSession) -> str:
    """
    Generate an opaque refresh token, store its SHA-256 hash in the DB.

    Returns:
        The raw (unhashed) token string to return to the client.
    """
    from app.models.user import RefreshToken

    raw_token = str(uuid4())
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(refresh_token)
    await db.flush()  # Get the ID without committing
    return raw_token


async def verify_refresh_token(raw_token: str, db: AsyncSession):
    """
    Validate a refresh token by looking up its hash in the DB.

    Returns:
        RefreshToken ORM object if valid.

    Raises:
        ValueError: If token not found, revoked, or expired.
    """
    from app.models.user import RefreshToken

    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()

    if rt is None:
        raise ValueError("Refresh token not found")
    if rt.revoked:
        raise ValueError("Refresh token has been revoked")
    if rt.expires_at < datetime.now(timezone.utc):
        raise ValueError("Refresh token has expired")

    return rt


async def revoke_refresh_token(raw_token: str, db: AsyncSession) -> None:
    """Mark a refresh token as revoked (used on logout)."""
    from app.models.user import RefreshToken

    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.flush()


# ─── Mobile Verification Token (Registration OTP flow) ────────────────────────
def create_mobile_verification_token(mobile: str) -> str:
    """
    Create a short-lived signed JWT that proves the given mobile number
    was verified via OTP during the registration flow.

    Payload:
      type  → "mobile_verification" (prevents reuse as a session token)
      sub   → mobile number string
      exp   → 15 minutes from now
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=_MOBILE_VERIFY_TOKEN_EXPIRE_MINUTES)
    payload = {
        "type": _MOBILE_VERIFY_TOKEN_TYPE,
        "sub": mobile,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_mobile_verification_token(token: str) -> str:
    """
    Decode and validate a mobile verification token.

    Returns:
        The verified mobile number string.

    Raises:
        HTTPException 401: On invalid signature, wrong type, or expired token.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Mobile verification token is invalid or expired.")

    if payload.get("type") != _MOBILE_VERIFY_TOKEN_TYPE:
        raise HTTPException(status_code=401, detail="Invalid token type for mobile verification.")

    mobile = payload.get("sub")
    if not mobile:
        raise HTTPException(status_code=401, detail="Mobile verification token has no subject.")

    return mobile
