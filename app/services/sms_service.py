# TMS Backend — sms_service.py
# Module: 1 — Login | Path: app/services/sms_service.py
# Purpose: Abstract SMS provider + Twilio/MSG91 implementations

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger("tms.sms")


# ─── Abstract Provider ────────────────────────────────────────────────────────
class SMSProvider(ABC):
    """Abstract base class for all SMS providers."""

    @abstractmethod
    async def send(self, mobile: str, message: str) -> bool:
        """
        Send an SMS.

        Args:
            mobile: Destination mobile number (10-digit, no country code prefix).
            message: Text content of the SMS.

        Returns:
            True if the SMS was accepted by the provider, False on failure.
        """
        ...


# ─── Twilio ───────────────────────────────────────────────────────────────────
class TwilioProvider(SMSProvider):
    def __init__(self, account_sid: str, auth_token: str, from_number: str) -> None:
        # Import lazily so missing Twilio package doesn't break startup if not used
        try:
            from twilio.rest import Client
            if account_sid and auth_token and not account_sid.startswith("your_"):
                self.client = Client(account_sid, auth_token)
            else:
                self.client = None
        except Exception:
            logger.warning("Twilio package not installed or credentials invalid. SMS will not be sent.")
            self.client = None
        self.from_number = from_number

    async def send(self, mobile: str, message: str) -> bool:
        """Send via Twilio REST API. Runs synchronously (twilio SDK is sync)."""
        if self.client is None:
            logger.error("Twilio client not initialised (missing package or credentials)")
            return False
        masked = f"+91****{mobile[-4:]}"
        try:
            self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=f"+91{mobile}",
            )
            logger.info("SMS sent via Twilio to %s", masked)
            return True
        except Exception as exc:
            logger.error("Twilio SMS failed to %s: %s", masked, exc)
            return False


# ─── MSG91 ────────────────────────────────────────────────────────────────────
class MSG91Provider(SMSProvider):
    def __init__(self, api_key: str, from_number: str = "") -> None:
        self.api_key = api_key
        self.from_number = from_number

    async def send(self, mobile: str, message: str) -> bool:
        """Send via MSG91 HTTP API using httpx."""
        import httpx

        masked = f"+91****{mobile[-4:]}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.msg91.com/api/v5/flow/",
                    headers={"authkey": self.api_key, "Content-Type": "application/json"},
                    json={
                        "flow_id": "YOUR_FLOW_ID",  # Configure in MSG91 dashboard
                        "sender": self.from_number or "TMSSVC",
                        "mobiles": f"91{mobile}",
                        "OTP": message,
                    },
                )
            if resp.status_code == 200:
                logger.info("SMS sent via MSG91 to %s", masked)
                return True
            logger.error("MSG91 SMS failed to %s: status=%d body=%s", masked, resp.status_code, resp.text)
            return False
        except Exception as exc:
            logger.error("MSG91 SMS failed to %s: %s", masked, exc)
            return False


# ─── Factory ──────────────────────────────────────────────────────────────────
def get_sms_provider() -> SMSProvider:
    """Return the configured SMS provider based on settings.SMS_PROVIDER."""
    if settings.SMS_PROVIDER.lower() == "twilio":
        return TwilioProvider(
            account_sid=settings.SMS_API_SECRET,  # Twilio account SID in SMS_API_SECRET
            auth_token=settings.SMS_API_KEY,
            from_number=settings.SMS_FROM_NUMBER,
        )
    return MSG91Provider(
        api_key=settings.SMS_API_KEY,
        from_number=settings.SMS_FROM_NUMBER,
    )


# ─── Convenience Functions ────────────────────────────────────────────────────
async def send_sms(mobile: str, message: str) -> None:
    """
    Fire-and-forget SMS send. Always returns None.
    Never raises — SMS failure must never break a user-facing request.
    """
    provider = get_sms_provider()
    await provider.send(mobile, message)
