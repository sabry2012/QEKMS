from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "QEKMS"
    APP_VERSION: str = "1.0.0"
    N_QUBITS: int = 32
    ENCRYPTION_ALGORITHM: str = "AES-GCM"

    MONGODB_URL: str = "mongodb://mongo:27017"
    DATABASE_NAME: str = "qekms_db"
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str = "quantum_secure_super_secret_key_12345_DEFAULT"
    ALGORITHM: str = "HS256"

    # ── SMTP (optional) ───────────────────────────────────────────────
    # If not configured, emails are written to the log instead of sent.
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@qekms.com"

    # Initial admin seeding (optional; only used when both are configured)
    ADMIN_EMAIL: str = "sabrygomaasem@gmail.com"
    ADMIN_PASSWORD: str = "admin123"

    # Public-facing base URL used in email login links.
    APP_URL: str = "http://localhost"

    # ── Security ──────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: Optional[str] = None
    # Set to True in production (HTTPS) to enable secure cookie flags.
    SECURE_COOKIES: bool = False


    model_config = {
        "env_file": ".env",
        "extra": "allow",
    }