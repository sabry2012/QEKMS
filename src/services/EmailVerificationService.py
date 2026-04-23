import httpx
import logging
from typing import Optional
from src.config import settings

logger = logging.getLogger(__name__)

class EmailVerificationService:
    """
    Service for verifying email existence using EmailListVerify API.
    """
    
    API_URL = "https://apps.emaillistverify.com/api/verifyEmail"

    @classmethod
    async def verify_email(cls, email: str) -> bool:
        """
        Verify an email address using EmailListVerify.
        Returns True if the email is valid ('ok'), False otherwise.
        """
        api_key = settings.EMAIL_LIST_VERIFY_API_KEY
        
        if not api_key:
            print("\n" + "!"*60)
            print("CRITICAL: EMAIL_LIST_VERIFY_API_KEY is not configured!")
            print("Email verification is being bypassed.")
            print("!"*60 + "\n")
            logger.error("Email Verification: EMAIL_LIST_VERIFY_API_KEY is not configured. Failing by default.")
            return False
        
        print(f"DEBUG: Email Verification Service using key starting with: {api_key[:4]}...")

        try:
            params = {
                "secret": api_key,
                "email": email
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(cls.API_URL, params=params)
                response.raise_for_status()
                
                result = response.text.strip().lower()
                print(f">>> Email Verification for {email}: {result}")
                logger.info(f"Email Verification for {email}: {result}")
                
                # Possible results: ok, fail, unknown, incorrect, disposable, key_not_valid, etc.
                if result == "ok":
                    return True
                else:
                    logger.warning(f"Email Verification failed for {email}: {result}")
                    return False
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"Email Verification API error (HTTP {e.response.status_code}): {e.response.text}")
            # In case of API error, we might decide to allow registration or block it.
            # Usually, it's safer to allow it to not block users due to external API issues.
            return True 
        except Exception as e:
            logger.error(f"Email Verification failed due to unexpected error: {str(e)}")
            return True
