# TMS Backend — storage.py
# Module: Bootstrap | Path: app/utils/storage.py
# Purpose: S3-compatible file upload helper using boto3

from __future__ import annotations

import asyncio
import logging
from functools import partial
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("tms.storage")

# ─── S3 Client (module-level singleton) ───────────────────────────────────────
_s3_client = None


def _get_s3():
    """Lazy-init S3 client (avoids import-time credentials check in tests)."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
        )
    return _s3_client


# ─── Key Naming Conventions ───────────────────────────────────────────────────
def vehicle_image_key(company_id: str, vehicle_id: str) -> str:
    return f"vehicles/{company_id}/{vehicle_id}/image.jpg"


def driver_licence_key(company_id: str, driver_id: str, ext: str = "jpg") -> str:
    return f"licences/{company_id}/{driver_id}/licence.{ext}"


def receipt_image_key(company_id: str, trip_id: str) -> str:
    return f"receipts/{company_id}/{trip_id}/receipt.jpg"


def vehicle_document_key(company_id: str, vehicle_id: str, kind: str, ext: str) -> str:
    return f"vehicles/{company_id}/{vehicle_id}/{kind}.{ext}"


def challan_pdf_key(company_id: str, challan_id: str) -> str:
    return f"pdfs/{company_id}/challans/{challan_id}.pdf"


def quotation_pdf_key(company_id: str, quotation_id: str) -> str:
    return f"pdfs/{company_id}/quotations/{quotation_id}.pdf"


# ─── Document Validation ──────────────────────────────────────────────────────
MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

# The extension comes from the content type, never the client's filename, so a
# crafted name can't choose where or as what the file is written.
DOCUMENT_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


async def read_document(file) -> tuple[bytes, str, str]:
    """Read an uploaded scan (image or PDF, <= 8 MB) -> (bytes, content_type, ext)."""
    from fastapi import HTTPException

    content_type = (file.content_type or "").lower()
    ext = DOCUMENT_TYPES.get(content_type)
    if ext is None:
        raise HTTPException(status_code=415, detail="Upload a PDF or an image (JPG, PNG, WEBP, HEIC).")
    data = await file.read(MAX_DOCUMENT_BYTES + 1)
    if len(data) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="The file is larger than 8 MB.")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty.")
    return data, content_type, ext


# ─── Upload Helper ────────────────────────────────────────────────────────────
async def _save_local(file_bytes: bytes, key: str) -> str:
    path = Path(settings.UPLOAD_DIR) / key
    path.parent.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread(path.write_bytes, file_bytes)
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/uploads/{key}"


async def upload_file(
    file_bytes: bytes,
    key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload bytes to S3-compatible storage.
    Runs the blocking boto3 call in a thread pool executor.

    Returns:
        Public URL of the uploaded object.

    Raises:
        ClientError: On S3 upload failure (caller should handle).
    """
    if settings.STORAGE_BACKEND == "local":
        return await _save_local(file_bytes, key)

    loop = asyncio.get_running_loop()
    s3 = _get_s3()

    put_fn = partial(
        s3.put_object,
        Bucket=settings.STORAGE_BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )

    try:
        await loop.run_in_executor(None, put_fn)
    except ClientError as e:
        logger.error("S3 upload failed for key=%s: %s", key, str(e))
        raise

    return f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/{key}"
