from src.helpers.database import get_db
from datetime import datetime

class NonceModel:
    collection_name = "nonces"

    @classmethod
    async def setup_indices(cls):
        """
        Setup TTL index for automatic nonce expiration after 30 seconds.
        And unique constraint on the nonce to prevent double-spending/replay.
        """
        db = get_db()
        # TTL index: MongoDB will remove documents 30 seconds after the 'timestamp' field
        await db[cls.collection_name].create_index("timestamp", expireAfterSeconds=30)
        # Unique index on nonce
        await db[cls.collection_name].create_index("nonce", unique=True)

    @classmethod
    async def is_replay(cls, nonce: str, timestamp: datetime) -> bool:
        """
        Check if a nonce has already been used.
        Returns True if it's a replay.
        """
        db = get_db()
        try:
            await db[cls.collection_name].insert_one({
                "nonce": nonce,
                "timestamp": timestamp
            })
            return False
        except Exception:
            # If insertion fails (e.g. duplicate key), it's a replay
            return True
