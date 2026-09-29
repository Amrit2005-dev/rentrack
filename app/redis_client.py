# TMS Backend — redis_client.py
# Module: Bootstrap | Path: app/redis_client.py
# Purpose: Redis connection pool using redis[asyncio], get_redis dependency

from __future__ import annotations

from typing import AsyncGenerator

import redis.asyncio as aioredis

from app.config import settings

# ─── Connection Pool ──────────────────────────────────────────────────────────
# Created once at module import time; shared across all requests.
redis_pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    max_connections=20,
)


def get_redis_client() -> aioredis.Redis:
    """Return a Redis client using the shared pool (not a dependency — use get_redis for FastAPI)."""
    return aioredis.Redis(connection_pool=redis_pool)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    FastAPI dependency: yields a Redis client.
    The client is backed by the shared pool — no per-request reconnect overhead.
    """
    client = aioredis.Redis(connection_pool=redis_pool)
    try:
        yield client
    finally:
        await client.aclose()
