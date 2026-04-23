from src.helpers.database import get_db
from datetime import datetime, timedelta
import secrets

class PhoneOtpModel:
    collection_name = "phone_otps"

    @classmethod
    async def setup_indices(cls):
        """Setup TTL index for OTP expiration."""
        db = get_db()
        # Automatically expire OTPs after 300 seconds (5 minutes)
        await db[cls.collection_name].create_index("created_at", expireAfterSeconds=300)
        # Ensure only one active OTP per phone number (optional but cleaner)
        await db[cls.collection_name].create_index("phone", unique=True)

    @classmethod
    async def create_otp(cls, phone: str) -> str:
        """Generate, store and return a 6-digit OTP."""
        db = get_db()
        code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
        
        # Upsert: replace any existing OTP for this phone
        await db[cls.collection_name].update_one(
            {"phone": phone},
            {
                "$set": {
                    "code": code,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        return code

    @classmethod
    async def verify_otp(cls, phone: str, code: str, delete_after: bool = True) -> bool:
        """Verify the OTP and optionally delete it."""
        db = get_db()
        otp_doc = await db[cls.collection_name].find_one({"phone": phone, "code": code})
        
        if otp_doc:
            if delete_after:
                # Delete after successful verification
                await db[cls.collection_name].delete_one({"_id": otp_doc["_id"]})
            return True
        return False
