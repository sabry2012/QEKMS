import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr

from src.core.limiter import limiter
from src.helpers.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_current_user_from_cookie,
)
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel
from src.models.SettingsModel import DEFAULT_PLAN, PLAN_DURATION_DAYS, PLAN_LIMITS, SettingsModel
from src.config import settings
from src.helpers.google_auth import verify_google_token
from src.models.PhoneOtpModel import PhoneOtpModel
from src.services.SmsService import SmsService
from src.services.AuditService import AuditService

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


class OtpVerifyRequest(BaseModel):
    phone_number: str
    otp_code: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "account"

    class Config:
        json_schema_extra = {
            "example": {
                "email": "sabrygomaasem@gmail.com",
                "password": "admin123",
                "role": "admin"
            }
        }


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = "New User"
    phone_number: str
    otp_code: str
    plan: str = DEFAULT_PLAN

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "strongpassword123",
                "full_name": "John Doe",
                "phone_number": "+1234567890",
                "plan": "free"
            }
        }

class GoogleLoginRequest(BaseModel):
    token: str


# ── LOGIN ──────────────────────────────────────────────────────────────
# ── LOGIN ──────────────────────────────────────────────────────────────
@auth_router.post("/login")
async def login(request: Request, response: Response, login_data: LoginRequest):
    """
    Authenticate a user and issue a JWT via HTTP-only cookie.
    """
    try:
        # 1. Manual validation check
        if not login_data.email or not login_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        # 2. Extract credentials & role
        email = login_data.email.strip().lower()
        password = login_data.password.strip()
        role = login_data.role or "account"

        # 3. Retrieve user based on role
        if role == "admin":
            user = await AdminModel.get_by_email(email)
        else:
            user = await AccountModel.get_by_email(email)

        # 4. Critical: Check if user exists before accessing any attributes
        if not user or not isinstance(user, dict):
            logger.warning(f"Login failed: Identity not found ({email} | {role})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access Denied: This identity is not registered in the quantum mesh.",
            )

        # 5. Extract fields safely using .get()
        user_id = user.get("id") or str(user.get("_id", ""))
        hashed_password = user.get("password")
        user_email = user.get("email")

        # 6. Verify password safely
        if not hashed_password or not verify_password(password, hashed_password):
            logger.warning(f"Login failed: Password mismatch for {email} (Role: {role})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access Denied: Invalid cipher key (password mismatch).",
            )
        
        # 7. Check activation status
        if not user.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is pending administrator approval. Please wait for verification.",
            )

        # 8. Subscription enforcement for non-admins
        if role != "admin":
            sub_end = user.get("subscription_end")
            # Auto-handle expired dates
            if sub_end and isinstance(sub_end, datetime) and sub_end < datetime.utcnow():
                await AccountModel.update(user_id, {"subscription_status": "expired"})
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your subscription has expired. Contact your administrator to renew.",
                )

            if user.get("subscription_status") == "suspended":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been suspended. Contact your administrator.",
                )

        # 9. Token Generation
        token_payload = {
            "sub": user_email,
            "role": role,
            "id": user_id,
            "plan": user.get("plan", "free"),
            "full_name": user.get("full_name", "")
        }
        
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # 10. Prepare Response
        is_secure = settings.SECURE_COOKIES
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=1800,
            path="/",
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_secure,
            samesite="strict",
            max_age=604800,
            path="/auth/refresh",
        )

        # 11. Audit Logging (Async, safe)
        try:
            await AuditService.log(
                event="USER_LOGIN",
                user_id=user_id,
                details={
                    "email": user_email,
                    "role": role,
                    "ip": request.client.host if request.client else "unknown",
                },
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed during login: {audit_err}")

        return {"status": "success", "message": "Login successful", "role": role}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CRITICAL LOGIN ERROR: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal authentication error occurred."
        )


# ── GOOGLE LOGIN ──────────────────────────────────────────────────────
@auth_router.post("/google")
async def google_login(request: Request, response: Response, google_data: GoogleLoginRequest):
    """
    Authenticate a user using Google ID token.
    """
    try:
        # 1. Verify token
        id_info = await verify_google_token(google_data.token)
        email = id_info.get("email", "").lower()
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        full_name = id_info.get("name", "Google User")
        
        # 2. Check if user exists
        user = await AccountModel.get_by_email(email)
        
        if not user:
            # Create new user if they don't exist
            # Note: For Google login, we might need a placeholder password or skip it
            now = datetime.utcnow()
            plan = DEFAULT_PLAN
            duration = PLAN_DURATION_DAYS.get(plan, 30)
            limits = PLAN_LIMITS[plan]
            
            user_data = {
                "email": email,
                "password": get_password_hash("GOOGLE_AUTH_PLACEHOLDER_" + email), # Secure placeholder
                "full_name": full_name,
                "role": "account",
                "admin_account": "Google OAuth",
                "is_active": True,
                "plan": plan,
                "channels_limit": limits["channels_limit"],
                "encryption_limit": limits["encryption_limit"],
                "subscription_status": "active",
                "subscription_start": now,
                "subscription_end": now + timedelta(days=duration),
                "payment_status": "trial",
                "last_modification": now,
            }
            user = await AccountModel.create(user_data)
            logger.info(f"New user created via Google login: {email}")
        
        user_id = user.get("id") or str(user.get("_id", ""))
        user_email = user.get("email")
        role = user.get("role", "account")
        phone = user.get("phone_number")

        # 3. Check activation status
        if not user.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is pending administrator approval. Please wait for verification.",
            )

        # 4. Check for profile completion
        is_new = not bool(phone)

        # 4. Issue Tokens
        token_payload = {
            "sub": user_email,
            "role": role,
            "id": user_id,
            "plan": user.get("plan", "free"),
            "full_name": user.get("full_name", "")
        }
        
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        is_secure = settings.SECURE_COOKIES
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=is_secure, samesite="lax", max_age=1800, path="/")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=is_secure, samesite="strict", max_age=604800, path="/auth/refresh")

        return {
            "status": "success", 
            "message": "Google login successful", 
            "role": role,
            "profile_incomplete": is_new
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GOOGLE LOGIN ERROR: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google authentication failed."
        )


class OtpRequest(BaseModel):
    phone_number: str


@auth_router.post("/verify-otp")
async def verify_otp(data: OtpVerifyRequest):
    phone = data.phone_number.strip().replace(" ", "")
    if not phone.startswith("+"):       
        phone = "+" + phone
    
    verified = await PhoneOtpModel.verify_otp(phone, data.otp_code, delete_after=False)
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")
    
    return {"status": "success", "message": "OTP verified."}

class CompleteProfileRequest(BaseModel):
    phone_number: str   
    otp_code: str
    card_holder: str
    card_number: str
    card_expiry: str
    card_cvv: str



@auth_router.post("/request-otp")
async def request_otp(data: OtpRequest):
    phone = data.phone_number.strip().replace(" ", "")
    if not phone.startswith("+"):
        phone = "+" + phone

    # Check if phone is already in use by another account
    existing = await AccountModel.get_by_phone(phone)
    if existing:
        raise HTTPException(status_code=400, detail="This phone number is already registered.")
    
    code = await PhoneOtpModel.create_otp(phone)
    await SmsService.send_otp(phone, code)
    return {"status": "success", "message": "OTP sent successfully"}


@auth_router.patch("/complete-profile")
async def complete_profile(
    reg_data: CompleteProfileRequest, 
    user_payload: dict = Depends(get_current_user_from_cookie)
):
    """Allow new Google users to set and verify their unique phone number."""
    user_id = user_payload.get("id")
    phone = reg_data.phone_number.strip().replace(" ", "")
    if not phone.startswith("+"):
        phone = "+" + phone
        
    otp_code = reg_data.otp_code.strip()
    
    # 1. Verify OTP (and delete it this time)
    verified = await PhoneOtpModel.verify_otp(phone, otp_code, delete_after=True)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired or is invalid. Please request a new one."
        )
    
    # 2. Check if phone is already taken (double check)
    existing = await AccountModel.get_by_phone(phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This phone number is already registered."
        )
    
    updated = await AccountModel.update(user_id, {
        "phone_number": phone
    })
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": "Profile completed and phone verified successfully"}


# ── REGISTER ───────────────────────────────────────────────────────────
@auth_router.post("/register", status_code=201)
async def register(request: Request, reg_data: RegisterRequest):
    try:
        email = reg_data.email.strip().lower()
        password = reg_data.password.strip()
        full_name = reg_data.full_name.strip() or "New User"
        plan = (reg_data.plan or DEFAULT_PLAN).strip().lower()

        # Check for existing user by email
        existing_email = await AccountModel.get_by_email(email) or await AdminModel.get_by_email(email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email identity is already registered in the mesh."
            )

        # Check for existing user by phone number
        phone = reg_data.phone_number.strip().replace(" ", "")
        if not phone.startswith("+"):
            phone = "+" + phone
            
        otp_code = reg_data.otp_code.strip()

        # 1. Verify OTP (Final consumption)
        verified = await PhoneOtpModel.verify_otp(phone, otp_code, delete_after=True)
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security validation failed: Verification code is invalid or has expired."
            )

        existing_phone = await AccountModel.get_by_phone(phone)
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is already registered. Each user must have a unique number."
            )

        hashed_password = get_password_hash(password)
        now = datetime.utcnow()
        duration = PLAN_DURATION_DAYS.get(plan, PLAN_DURATION_DAYS[DEFAULT_PLAN])
        limits = PLAN_LIMITS[plan]

        user_data = {
            "email": email,
            "password": hashed_password,
            "full_name": full_name,
            "phone_number": phone,
            "role": "account",
            "admin_account": "Self Registration",
            "is_active": False,
            "plan": plan,
            "channels_limit": limits["channels_limit"],
            "encryption_limit": limits["encryption_limit"],
            "subscription_status": "active",
            "subscription_start": now,
            "subscription_end": now + timedelta(days=duration),
            "payment_status": "trial",
            "last_modification": now,
        }

        user = await AccountModel.create(user_data)

        if not user:
            logger.error("Registration failed after insert returned no user for %s", email)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account could not be created",
            )

        try:
            await AuditService.log(
                event="USER_REGISTERED",
                user_id=user.get("id"),
                details={
                    "email": email,
                    "role": "account",
                    "plan": plan,
                    "ip": request.client.host if request.client else "unknown",
                },
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed during registration: {audit_err}")

        return {
            "status": "success",
            "message": "Registration successful",
            "id": user.get("id"),
            "role": "account",
            "plan": plan,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"REGISTER ERROR: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


# ── REFRESH ────────────────────────────────────────────────────────────
@auth_router.post("/refresh")
async def refresh_tokens(request: Request, response: Response):
    """Rotate the refresh token and issue a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please login again.")

    try:
        # Validate refresh token
        payload = decode_access_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        # In production: Check if refresh_token is in denylist here
        
        # Issue new tokens
        new_access = create_access_token(
            {"sub": payload["sub"], "role": payload["role"], "id": payload["id"]}
        )
        new_refresh = create_refresh_token(
            {"sub": payload["sub"], "role": payload["role"], "id": payload["id"]}
        )

        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=settings.SECURE_COOKIES, samesite="lax", max_age=1800, path="/")
        response.set_cookie(key="refresh_token", value=new_refresh, httponly=True, secure=settings.SECURE_COOKIES, samesite="strict", max_age=604800, path="/auth/refresh")

        return {"message": "Token rotated"}
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired")


# ── LOGOUT ─────────────────────────────────────────────────────────────
@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"message": "Logged out successfully"}


# ── CURRENT USER ──────────────────────────────────────────────────────
@auth_router.get("/me")
async def get_current_user_info(payload: dict = Depends(get_current_user_from_cookie)):
    """Return identity and fresh database profile data."""
    user_id = payload.get("id")
    role = payload.get("role", "account")
    
    if role == "admin":
        user = await AdminModel.get_by_id(user_id)
    else:
        user = await AccountModel.get_by_id(user_id)
        
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    # Remove sensitive data
    user.pop("password", None)
    
    return {"user": user, "exp": payload.get("exp")}


