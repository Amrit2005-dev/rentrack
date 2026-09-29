# TMS Backend — responses.py
# Module: Bootstrap | Path: app/utils/responses.py
# Purpose: Consistent response envelope helpers for all endpoints

from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


def success(
    data: Any = None,
    message: str = "OK",
    status_code: int = 200,
) -> JSONResponse:
    """Return a standardised success envelope."""
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "message": message, "data": data},
    )


def created(data: Any = None, message: str = "Created") -> JSONResponse:
    """Shortcut for 201 Created responses."""
    return success(data=data, message=message, status_code=201)


def error(
    message: str,
    detail: Any = None,
    status_code: int = 400,
) -> JSONResponse:
    """Return a standardised error envelope."""
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": message, "detail": detail},
    )
