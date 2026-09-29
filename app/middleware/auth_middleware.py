# TMS Backend — auth_middleware.py
# Module: Bootstrap | Path: app/middleware/auth_middleware.py
# Purpose: JWT decode middleware — injects user identity into request.state

from __future__ import annotations

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

# Paths that do NOT require a JWT
PUBLIC_PATHS: set[str] = {
    # OTP-only sign-in (legacy / phone tab)
    "/api/v1/auth/request-otp",
    "/api/v1/auth/verify-otp",
    # Email+password 2FA (new)
    "/api/v1/auth/login",
    "/api/v1/auth/login/verify",
    # Password reset
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    # Token refresh
    "/api/v1/auth/refresh",
    # Public company registration
    "/api/v1/registration/",
    "/api/v1/organizations/register",
    "/api/v1/organizations/public",
    # Docs
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/openapi.json",
    "/health",
}

# Prefixes — any path starting with these is public
PUBLIC_PREFIXES: tuple[str, ...] = (
    "/api/v1/registration/status",
)


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Decodes the Bearer JWT on every non-public request.
    On success, injects user_id, role, and company_id into request.state.
    On failure, returns 401 immediately without calling the route handler.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Allow public paths without auth
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        auth_header: str = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Missing or malformed token"},
            )

        token = auth_header.removeprefix("Bearer ").strip()

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
        except JWTError:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Invalid or expired token"},
            )

        # Check JWT blacklist in Redis (app.state.redis is set in main.py startup)
        jti: str | None = payload.get("jti")
        if jti:
            redis = request.app.state.redis
            if await redis.get(f"jwt_blacklist:{jti}"):
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "error": "Token has been revoked"},
                )

        # Inject identity into request.state for downstream dependencies
        request.state.user_id = payload.get("sub")
        request.state.role = payload.get("role")
        request.state.company_id = payload.get("company_id")
        request.state.jti = jti

        return await call_next(request)
