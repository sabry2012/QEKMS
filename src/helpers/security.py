import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from passlib.context import CryptContext

from src.config import settings

logger = logging.getLogger(__name__)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
JWT_ISSUER = "qekms.security.node"
JWT_AUDIENCE = "qekms.enterprise.client"
MAX_PASSWORD_LENGTH = 72

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)
security = HTTPBearer()


def _normalize_password(password: str) -> str:
    """Normalize password input consistently before hash or verification."""
    if password is None:
        return ""
    normalized = str(password).strip()
    return normalized[:MAX_PASSWORD_LENGTH]


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_normalize_password(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(_normalize_password(plain_password), hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_token(data: dict, expires_delta: timedelta, token_type: str = "access") -> str:
    now = datetime.now(timezone.utc)
    to_encode = data.copy()
    to_encode.update({
        "exp": now + expires_delta,
        "iat": now,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": f"{token_type}_{os.urandom(8).hex()}",
        "type": token_type,
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict) -> str:
    return create_token(data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(data: dict) -> str:
    return create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token attempt: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def get_current_user_from_cookie(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if token.startswith("Bearer "):
        token = token[7:]

    return decode_access_token(token)


def require_admin(request: Request) -> dict:
    user = get_current_user_from_cookie(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return user


