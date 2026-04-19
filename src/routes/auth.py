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


# ── LOGIN ──────────────────────────────────────────────────────────────
@auth_router.post("/login")
async def login(request: Request, response: Response, login_data: LoginRequest):
    """
    Authenticate a user and issue a JWT via HTTP-only cookie.

    Blocks login if:
    - Credentials are wrong
    - is_active = False
    - subscription_status = 'expired' (account users only)
    - subscription_end is in the past (auto-detects expired accounts)
    """
    if login_data.role == "admin":
        user = await AdminModel.get_by_email(login_data.email)
    else:
        user = await AccountModel.get_by_email(login_data.email)

    # Generic message prevents user enumeration
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check normalized password
    if not verify_password(login_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Check is_active (set to False by admin deactivation)
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact your administrator.",
        )

    # Account users: enforce subscription validity
    if login_data.role != "admin":
        # Auto-detect expired subscription by end date
        sub_end = user.get("subscription_end")
        if sub_end and isinstance(sub_end, datetime) and sub_end < datetime.utcnow():
            # Mark expired in DB for future checks
            await AccountModel.update(user["id"], {"subscription_status": "expired"})
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your subscription has expired. Contact your administrator to renew.",
            )

        # Explicit suspended status
        sub_status = user.get("subscription_status")
        if sub_status == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Contact your administrator.",
            )

    # ── Token Generation ───────────────────────────────────────────────
    access_token = create_access_token(
        {"sub": user["email"], "role": login_data.role, "id": user["id"]}
    )
    refresh_token = create_refresh_token(
        {"sub": user["email"], "role": login_data.role, "id": user["id"]}
    )

    # Hardened Cookie Configuration
    is_secure = settings.SECURE_COOKIES 
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=1800, # 30 mins
        path="/",
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="strict", # Hardened for refresh
        max_age=604800, # 7 days
        path="/auth/refresh", # Restricted path
    )

    await AuditService.log(
        event="USER_LOGIN",
        user_id=user["id"],
        details={
            "email": user["email"],
            "role": login_data.role,
            "ip": request.client.host if request.client else None,
        },
    )

    return {"message": "Login successful", "role": login_data.role}


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
