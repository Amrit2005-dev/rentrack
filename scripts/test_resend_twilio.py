import asyncio
from app.services.email_service import send_email_otp
from app.services.sms_service import send_sms

async def main():
    print("Testing Resend...")
    # Using a test email
    email_success = send_email_otp("admin@test.com", "123456", "test")
    print(f"Resend success: {email_success}")
    
    print("Testing Twilio...")
    await send_sms("9999999999", "Test SMS from RentTrack")
    print("Twilio executed (check logs for success/failure).")
    
if __name__ == "__main__":
    asyncio.run(main())
