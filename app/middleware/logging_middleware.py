# TMS Backend — logging_middleware.py
# Module: Bootstrap | Path: app/middleware/logging_middleware.py
# Purpose: Structured request/response logging with mobile number masking

from __future__ import annotations

import logging
import re
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("tms.requests")

# Regex to detect 10-digit Indian mobile numbers (6–9 prefix) in log strings
_MOBILE_RE = re.compile(r"\b([6-9]\d{9})\b")


def _mask_mobile(text: str) -> str:
    """Replace mobile numbers with masked version: first 2 + ******* + last 1 digit."""
    return _MOBILE_RE.sub(lambda m: m.group()[:2] + "*******" + m.group()[-1], text)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every HTTP request with:
      - HTTP method
      - Path (mobile numbers masked)
      - Status code
      - Latency in milliseconds
      - Client IP

    Mobile numbers in the URL path are masked to avoid leaking PII in logs.
    """

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()

        masked_path = _mask_mobile(str(request.url.path))
        if request.url.query:
            masked_query = _mask_mobile(request.url.query)
            masked_path = f"{masked_path}?{masked_query}"

        client_ip = request.client.host if request.client else "unknown"

        try:
            response = await call_next(request)
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "method=%s path=%s status=500 latency=%.1fms ip=%s error=%s",
                request.method,
                masked_path,
                latency_ms,
                client_ip,
                str(exc),
            )
            raise

        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "method=%s path=%s status=%d latency=%.1fms ip=%s",
            request.method,
            masked_path,
            response.status_code,
            latency_ms,
            client_ip,
        )
        return response
