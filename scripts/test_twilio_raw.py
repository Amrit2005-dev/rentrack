import os
from twilio.rest import Client

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")

if not account_sid or not auth_token:
    raise SystemExit("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN before running this script.")

try:
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body="Test Message",
        from_="+15005550006",
        to="+919999999999"
    )
    print("Success! SID:", message.sid)
except Exception as e:
    print("Error:", e)
