from src.helpers.database import get_db


# Plans available for internal user creation and clients
PLAN_LIMITS = {
    "starter": {
        "channels_limit": 10, 
        "encryption_limit": 100,
        "max_users_per_channel": 5,
        "max_file_size_mb": 10,
        "priority_level": "standard"
    },
    "professional": {
        "channels_limit": 50, 
        "encryption_limit": 500,
        "max_users_per_channel": 20,
        "max_file_size_mb": 50,
        "priority_level": "high"
    },
    "enterprise": {
        "channels_limit": -1, # -1 = unlimited
        "encryption_limit": -1,
        "max_users_per_channel": -1,
        "max_file_size_mb": 250,
        "priority_level": "mission-critical"
    },  
}

DEFAULT_PLAN = "starter"

# Plans available for CLIENT ACCESS REQUESTS
CLIENT_PLANS = ["starter", "professional", "enterprise"]

# Subscription durations in days per plan
PLAN_DURATION_DAYS = {
    "starter": 30,
    "professional": 30,
    "enterprise": 30,
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
