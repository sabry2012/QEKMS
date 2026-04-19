import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
import jwt
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer

from src.config import settings

logger = logging.getLogger(__name__)

# JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Hardened: 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7     # 7 days for rotation
JWT_ISSUER = "qekms.security.node"
JWT_AUDIENCE = "qekms.enterprise.client"

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    try:
        return pwd_context.verify(plain_password.strip(), hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password.strip())


def create_token(data: dict, expires_delta: timedelta, token_type: str = "access") -> str:
    """Internal helper to create a JWT with claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    
    # Standard Claims for Production Hardening
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": f"{token_type}_{os.urandom(8).hex()}",
        "type": token_type
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict) -> str:
    """Create a short-lived access token."""
    return create_token(data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token."""
    return create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM], 
            audience=JWT_AUDIENCE, 
            issuer=JWT_ISSUER
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token attempt: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def get_current_user_from_cookie(request: Request) -> dict:
    """Extract and decode the JWT from the access_token cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    if token.startswith("Bearer "):
        token = token[7:]

    return decode_access_token(token)


def require_admin(request: Request) -> dict:
    """Require the current user to have admin role."""
    user = get_current_user_from_cookie(request)
    if user.get("role") != "admin":
        logger.warning(f"Unauthorized admin access attempt by: {user.get('sub')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges",
        )
    return user