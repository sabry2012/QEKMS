import os
import logging
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer

from src.config import settings

logger = logging.getLogger(__name__)

# JWT Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
JWT_ISSUER = "qekms.security.node"
JWT_AUDIENCE = "qekms.enterprise.client"

# ✅ يدعم bcrypt + pbkdf2
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)
security = HTTPBearer()


# 🔥 FIX: حل مشكلة 72 chars
def _normalize_password(password: str) -> str:
    password = password.strip()
    return password[:72] if len(password) > 72 else password


def _fix_password(password: str) -> str:
    password = password.strip()

    # 🔥 حل نهائي لمشكلة bcrypt
    if len(password) > 72:
        password = password[:72]

    return password


def get_password_hash(password: str) -> str:
    password = _fix_password(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        plain_password = _fix_password(plain_password)
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_token(data: dict, expires_delta: timedelta, token_type: str = "access") -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta

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
    return create_token(data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(data: dict) -> str:
    return create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_access_token(token: str) -> dict:
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