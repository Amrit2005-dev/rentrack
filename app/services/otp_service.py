# TMS Backend — otp_service.py
# Module: 1 — Login | Path: app/services/otp_service.py
# Purpose: Full OTP state machine — generate, store, verify with rate limiting + lockout

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone

import bcrypt
import redis.asyncio as aioredis
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger("tms.otp")

# ─── Redis Key Helpers ────────────────────────────────────────────────────────
def _otp_key(mobile: str) -> str:
    return f"otp:{mobile}"

def _rate_key(mobile: str) -> str:
    return f"otp_rate:{mobile}"

def _lockout_key(mobile: str) -> str:
    return f"otp_lockout:{mobile}"


# ─── OTP Generation ───────────────────────────────────────────────────────────
async def generate_and_store_otp(mobile: str, redis: aioredis.Redis) -> str:
    """
    Full OTP generation flow:
    1. Check lockout → 429 if locked
    2. Check rate limit (OTP_RATE_LIMIT_COUNT per OTP_RATE_LIMIT_WINDOW_MINUTES) → 429
    3. Generate secure 6-digit OTP
    4. Hash with bcrypt
    5. Store OTP state in Redis (TTL = OTP_EXPIRE_MINUTES)
    6. Increment rate counter
    7. Return the plaintext OTP (to be dispatched via SMS background task)

    Raises:
        HTTPException 429: On lockout or rate limit.
    """
    # 1. Lockout check
    locked = await redis.get(_lockout_key(mobile))
    if locked:
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Account locked. Try again later.",
        )

    # 2. Rate limit check
    rate_count_raw = await redis.get(_rate_key(mobile))
    rate_count = int(rate_count_raw) if rate_count_raw else 0
    if rate_count >= settings.OTP_RATE_LIMIT_COUNT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many OTP requests. Max {settings.OTP_RATE_LIMIT_COUNT} per {settings.OTP_RATE_LIMIT_WINDOW_MINUTES} minutes.",
        )

    # 3. Generate OTP
    otp = str(secrets.randbelow(1_000_000)).zfill(6)

    # 4. Hash OTP with bcrypt
    otp_hash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()

    # 5. Store OTP state in Redis
    otp_data = json.dumps({"otp_hash": otp_hash, "attempts": 0})
    ttl_seconds = settings.OTP_EXPIRE_MINUTES * 60
    await redis.set(_otp_key(mobile), otp_data, ex=ttl_seconds)

    # 6. Increment rate counter (set TTL on first increment)
    pipe = redis.pipeline()
    pipe.incr(_rate_key(mobile))
    pipe.expire(_rate_key(mobile), settings.OTP_RATE_LIMIT_WINDOW_MINUTES * 60)
    await pipe.execute()

    logger.info("OTP generated for +91****%s", mobile[-4:])
    return otp  # Caller dispatches via SMS background task


# ─── OTP Verification ─────────────────────────────────────────────────────────
async def verify_otp(mobile: str, otp: str, redis: aioredis.Redis) -> bool:
    """
    OTP verification flow:
    1. Lockout check → 429
    2. Fetch OTP state from Redis → 400 if expired/not found
    3. Attempt count ≥ OTP_MAX_ATTEMPTS → lockout + delete → 429
    4. bcrypt verify → fail: increment attempts, re-save → 401
    5. Pass: delete OTP key, clear rate counter
    6. Return True

    Raises:
        HTTPException 400: OTP not requested or expired.
        HTTPException 401: Wrong OTP.
        HTTPException 429: Locked out or max attempts reached.
    """
    # 1. Lockout check
    locked = await redis.get(_lockout_key(mobile))
    if locked:
        raise HTTPException(
            status_code=429,
            detail="Account locked due to too many failed attempts. Try again later.",
        )

    # 2. Fetch OTP state
    raw = await redis.get(_otp_key(mobile))
    if raw is None:
        raise HTTPException(status_code=400, detail="OTP expired or not requested. Please request a new OTP.")

    otp_data = json.loads(raw)
    otp_hash: str = otp_data["otp_hash"]
    attempts: int = otp_data["attempts"]

    # 3. Max attempts check
    if attempts >= settings.OTP_MAX_ATTEMPTS:
        await _lockout_and_clear(mobile, redis)
        raise HTTPException(
            status_code=429,
            detail="Maximum OTP attempts exceeded. Account locked for 30 minutes.",
        )

    # 4. bcrypt verification
    if not bcrypt.checkpw(otp.encode(), otp_hash.encode()):
        attempts += 1
        otp_data["attempts"] = attempts
        # Re-save with remaining TTL
        ttl = await redis.ttl(_otp_key(mobile))
        await redis.set(_otp_key(mobile), json.dumps(otp_data), ex=max(ttl, 1))
        logger.warning("Invalid OTP attempt %d/%d for +91****%s", attempts, settings.OTP_MAX_ATTEMPTS, mobile[-4:])
        raise HTTPException(status_code=401, detail=f"Invalid OTP. {settings.OTP_MAX_ATTEMPTS - attempts} attempts remaining.")

    # 5. OTP correct — clean up Redis state
    await redis.delete(_otp_key(mobile))
    await redis.delete(_rate_key(mobile))

    logger.info("OTP verified for +91****%s", mobile[-4:])
    return True


async def _lockout_and_clear(mobile: str, redis: aioredis.Redis) -> None:
    """Set lockout key and delete OTP key atomically."""
    pipe = redis.pipeline()
    pipe.set(_lockout_key(mobile), "locked", ex=settings.OTP_LOCKOUT_MINUTES * 60)
    pipe.delete(_otp_key(mobile))
    await pipe.execute()
    logger.warning("OTP lockout applied to +91****%s for %d minutes", mobile[-4:], settings.OTP_LOCKOUT_MINUTES)
