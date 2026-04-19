"""
QEKMS Database Reset Script
- Wipes ALL collections: admins, accounts, client_requests, channels, messages, audit_logs
- Seeds a fresh admin account: sabrygomaa@gmail.com / admin123
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

MONGO_URL = "mongodb://127.0.0.1:27018"
DB_NAME = "qekms_db"

ADMIN_EMAIL = "sabrygomaasem@gmail.com"
ADMIN_PASSWORD = "admin123"

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

COLLECTIONS_TO_WIPE = [
    "admins",
    "accounts",
    "client_requests",
    "channels",
    "messages",
    "audit_logs",
]

async def reset():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("\n" + "="*42)
    print("  QEKMS Database Reset")
    print("="*42 + "\n")

    # -- Wipe all collections --
    existing = await db.list_collection_names()
    for col in COLLECTIONS_TO_WIPE:
        if col in existing:
            result = await db[col].delete_many({})
            print(f"  [WIPED] {col:<20} -> {result.deleted_count} documents removed")
        else:
            print(f"  [SKIP]  {col:<20} -> collection not found")

    # -- Seed default settings --
    await db["settings"].insert_one({
        "registration_enabled": True,
        "auto_channel_approval": False,
        "quantum_key_generation_enabled": True,
        "default_channels_limit": 10,
        "default_encryption_limit": 100,
    })
    print("\n  [SEEDED] Default system settings")

    # -- Seed admin --
    hashed = pwd_context.hash(ADMIN_PASSWORD)
    await db["admins"].insert_one({
        "email": ADMIN_EMAIL,
        "password": hashed,
        "accounts_number": 0,
        "is_active": True,
        "role": "admin",
        "created_at": datetime.utcnow().isoformat(),
        "last_modification": datetime.utcnow().isoformat(),
    })

    # -- Seed secondary test admin --
    await db["admins"].insert_one({
        "email": "admin@test.com",
        "password": pwd_context.hash("12345678"),
        "accounts_number": 0,
        "is_active": True,
        "role": "admin",
        "created_at": datetime.utcnow().isoformat(),
        "last_modification": datetime.utcnow().isoformat(),
    })

    print(f"\n  [SEEDED] Admin account created")
    print(f"           Email    : {ADMIN_EMAIL}")
    print(f"           Password : {ADMIN_PASSWORD}")
    print("\n" + "="*42)
    print("  Reset complete. Restart the server.")
    print("="*42 + "\n")

    client.close()

if __name__ == "__main__":
    asyncio.run(reset())
