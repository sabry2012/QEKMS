import logging
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.config import settings
from src.core.limiter import limiter
from src.helpers import setup_logging
from src.helpers.database import connect_to_mongo, close_mongo_connection, get_db
from src.helpers.security import get_password_hash
from src.models.AdminModel import AdminModel

from src.routes.base import baseRouter
from src.routes.auth import auth_router
from src.routes.accounts import account_router
from src.routes.channels import channel_router
from src.routes.admin import admin_router
from src.routes.client import client_router
from src.routes.system import system_router

from src.services.QEKMS_service import QEKMS_service
from src.services.email_service import EmailService


# ─────────────────────────────────────────────────────────────

setup_logging()
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"

# ✅ Limiter تعريف واحد بس

# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.QEKMS_service = QEKMS_service()

    app.email_service = EmailService(
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        user=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        sender=settings.SMTP_FROM,
        app_url=settings.APP_URL,
    )

    await connect_to_mongo()
    db = get_db()

    from src.models.NonceModel import NonceModel
    await NonceModel.setup_indices()

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # background task for entropy simulation
    async def refresh_entropy_loop():
        while True:
            try:
                await app.QEKMS_service.generate_key("system_background")
                # Wait 30 seconds between periodic generation
                await asyncio.sleep(30)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Entropy background task error: {e}")
                await asyncio.sleep(60)

    bg_task = asyncio.create_task(refresh_entropy_loop())

    # Admin seed
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD

    if admin_email and admin_password:
        try:
            existing_admin = await AdminModel.get_by_email(admin_email)

            if not existing_admin:
                admin_data = {
                    "email": admin_email,
                    "password": get_password_hash(admin_password),
                    "accounts_number": 0,
                    "is_active": True,
                    "role": "admin",
                    "last_modification": datetime.utcnow().isoformat(),
                }
                await AdminModel.create(admin_data)
                logger.info(f"Admin created: {admin_email}")
        except Exception as e:
            logger.error(f"Admin seed error: {e}")

    yield
    bg_task.cancel()
    await close_mongo_connection()

# ─────────────────────────────────────────────────────────────

app = FastAPI(
    lifespan=lifespan,
    title="QEKMS API",
    version="1.0.0"
)

# ✅ ربط limiter بالـ app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─────────────────────────────────────────────────────────────
# CORS

ALLOWED_ORIGINS = [
    settings.APP_URL,
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# Routes

app.include_router(baseRouter)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(account_router)
app.include_router(channel_router)
app.include_router(client_router)
app.include_router(system_router)

# ─────────────────────────────────────────────────────────────
# Static

app.mount("/assets", StaticFiles(directory="src/assets/static/assets"), name="assets")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
