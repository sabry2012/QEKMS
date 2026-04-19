import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel

from src.core.limiter import limiter
from src.helpers.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_current_user_from_cookie,
)
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel
from src.config import settings
from src.services.AuditService import AuditService

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
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
    email: str
    password: str
    full_name: str = "New User"

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "strongpassword123",
                "full_name": "John Doe"
            }
        }


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
        password = login_data.password
        role = login_data.role or "account"

        # 3. Retrieve user based on role
        if role == "admin":
            user = await AdminModel.get_by_email(email)
        else:
            user = await AccountModel.get_by_email(email)

        # 4. Critical: Check if user exists before accessing any attributes
        if not user or not isinstance(user, dict):
            logger.warning(f"Login failed: User not found ({email} | {role})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # 5. Extract fields safely using .get()
        user_id = user.get("id") or str(user.get("_id", ""))
        hashed_password = user.get("password")
        user_email = user.get("email")

        # 6. Verify password safely
        if not hashed_password or not verify_password(password, hashed_password):
            logger.warning(f"Login failed: Password mismatch for {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # 7. Check activation status
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Contact your administrator.",
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
            "id": user_id
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


# ── REGISTER ───────────────────────────────────────────────────────────
@auth_router.post("/register", status_code=201)
async def register(request: Request, reg_data: RegisterRequest):
    try:
        email = reg_data.email.strip().lower()
        password = reg_data.password.strip()

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")

        # check duplicate
        if await AccountModel.get_by_email(email):
            raise HTTPException(status_code=409, detail="User exists")

        from src.helpers.security import get_password_hash
        hashed_password = get_password_hash(password)

        user_data = {
            "email": email,
            "password": hashed_password,
            "full_name": reg_data.full_name,
            "is_active": True
        }

        user = await AccountModel.create(user_data)

        if not user:
            raise Exception("User creation failed")

        return {"status": "success"}

    except Exception as e:
        print("REGISTER ERROR:", e)
        raise HTTPException(status_code=500, detail="Register failed")


# ── REFRESH ────────────────────────────────────────────────────────────
@auth_router.post("/refresh")
async def refresh_tokens(request: Request, response: Response):
    """Rotate the refresh token and issue a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

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
async def get_current_user_info(user: dict = Depends(get_current_user_from_cookie)):
    """Return identity and session metadata (including exp for UI timers)."""
    return {"user": user}
