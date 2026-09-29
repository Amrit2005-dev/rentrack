# TMS Backend — email_service.py
# Module: 1 — Login | Path: app/services/email_service.py
# Purpose: Dispatch transactional emails via Resend

import logging
import resend

from app.config import settings

logger = logging.getLogger("tms.email")

def get_resend_client():
    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
    return resend


def send_email_otp(to_email: str, otp: str, context: str = "verification") -> bool:
    """
    Sends an OTP via email using Resend.
    
    Args:
        to_email: Destination email address
        otp: The OTP code
        context: Context of the email (e.g. 'login', 'password reset')
    """
    if not settings.RESEND_API_KEY:
        print(f"\n[EMAIL MOCK] Verification OTP for {to_email}: {otp}\n")
        logger.warning("RESEND_API_KEY not set. Mocking email OTP in terminal.")
        return True
        
    resend.api_key = settings.RESEND_API_KEY
    
    subject = f"Your RentTrack {context.title()} Code"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>RentTrack</h2>
        <p>Your {context} code is:</p>
        <h1 style="letter-spacing: 5px; background: #f4f4f5; padding: 10px; display: inline-block; border-radius: 6px;">{otp}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p style="color: #71717a; font-size: 12px; margin-top: 40px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    
    try:
        # Note: Resend's python SDK is synchronous.
        # BackgroundTasks runs it in a threadpool so it won't block the event loop.
        from_email = settings.RESEND_FROM_EMAIL or "onboarding@resend.dev"
        response = resend.Emails.send({
            "from": from_email,
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        logger.info(f"Email sent via Resend to {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Resend email failed to {to_email}: {exc}")
        return False
