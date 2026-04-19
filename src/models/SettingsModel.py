from src.helpers.database import get_db


# Plans available for internal user creation by admins
PLAN_LIMITS = {
    "free": {"channels_limit": 5, "encryption_limit": 50},
    "pro": {"channels_limit": 50, "encryption_limit": 500},
    "enterprise": {"channels_limit": -1, "encryption_limit": -1},  # -1 = unlimited
}

DEFAULT_PLAN = "free"

# Plans available for CLIENT ACCESS REQUESTS (paid-only, no free tier)
CLIENT_PLANS = ["pro", "enterprise"]

# Subscription durations in days per plan
PLAN_DURATION_DAYS = {
    "free": 30,
    "pro": 365,
    "enterprise": 365,
}



class SettingsModel:
    collection_name = "settings"

    @classmethod
    async def get(cls):
        """Get global settings (singleton document)."""
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_type": "global"})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    @classmethod
    async def get_or_create(cls):
        """Get or create default global settings."""
        doc = await cls.get()
        if doc:
            return doc
        # Create defaults
        default = {
            "_type": "global",
            "default_channels_limit": 5,
            "default_encryption_limit": 50,
            "registration_enabled": True,
            "quantum_key_generation_enabled": True,
            "auto_channel_approval": True,
        }
        db = get_db()
        result = await db[cls.collection_name].insert_one(default)
        default["id"] = str(result.inserted_id)
        default.pop("_id", None)
        return default

    @classmethod
    async def update(cls, update_data: dict):
        """Update global settings."""
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_type": "global"},
            {"$set": update_data},
            upsert=True,
        )
        return result.modified_count > 0 or result.upserted_id is not None
