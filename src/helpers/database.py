import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from src.config import settings

logger = logging.getLogger(__name__)

client = None
db = None


def get_db():
    global db
    if db is None:
        logger.warning("get_db called before connect_to_mongo or connection failed.")
    return db


async def connect_to_mongo():
    """Connect to MongoDB with retry logic. Pings the server to verify connectivity."""
    global client, db
    mongo_url = settings.MONGODB_URL
    db_name = settings.DATABASE_NAME

    for attempt in range(15):
        try:
            client = AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            # Actually verify the connection by pinging
            await client.admin.command("ping")
            db = client[db_name]
            logger.info("Connected to MongoDB successfully")
            return
        except Exception as e:
            logger.warning(f"MongoDB not ready (attempt {attempt + 1}/15): {e}. Retrying in 3s...")
            await asyncio.sleep(3)

    raise RuntimeError("Could not connect to MongoDB after 15 attempts")


async def close_mongo_connection():
    global client
    if client is not None:
        client.close()
        logger.info("MongoDB connection closed")