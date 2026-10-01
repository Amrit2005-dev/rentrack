# TMS Backend — config.py
# Module: Bootstrap | Path: app/config.py
# Purpose: Pydantic BaseSettings that reads all env vars from .env

from __future__ import annotations

from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    # ── JWT / Auth ─────────────────────────────────────────────────────────────
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── OTP ───────────────────────────────────────────────────────────────────
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 10
    OTP_RATE_LIMIT_COUNT: int = 5
    OTP_RATE_LIMIT_WINDOW_MINUTES: int = 10
    OTP_LOCKOUT_MINUTES: int = 30
    SHOW_TEST_OTP: bool = False

    # ── SMS ───────────────────────────────────────────────────────────────────
    SMS_PROVIDER: str = "twilio"
    SMS_API_KEY: str = ""
    SMS_API_SECRET: str = ""          # Twilio account SID
    SMS_FROM_NUMBER: str = ""

    # ── Object Storage ────────────────────────────────────────────────────────
    STORAGE_BUCKET: str = "tms-files"
    STORAGE_ENDPOINT: str = "https://s3.amazonaws.com"
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_REGION: str = "ap-south-1"
    # "s3", or "local" to keep uploads on disk and serve them from /uploads —
    # for development without S3 credentials.
    STORAGE_BACKEND: str = "s3"
    UPLOAD_DIR: str = "uploads"
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000"

    # ── Email ─────────────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
