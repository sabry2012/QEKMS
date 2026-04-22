import logging
import os
from datetime import datetime

# Configure a separate logger for SMS traffic
sms_logger = logging.getLogger("sms_service")
sms_logger.setLevel(logging.INFO)

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)
handler = logging.FileHandler("logs/sms_traffic.log")
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
sms_logger.addHandler(handler)

class SmsService:
    @staticmethod
    async def send_otp(phone: str, code: str):
        """
        Simulates sending an SMS. In production, connect to Twilio/Vonage here.
        """
        message = f"Your QEKMS security code is: {code}. Valid for 5 minutes."
        
        # Log to file for developer access
        sms_logger.info(f"TO: {phone} | MSG: {message}")
        
        # Also print to console for immediate visibility during testing
        print(f"\n[SMS SERVICE] Sent to {phone}: {message}\n")
        
        return True
