from src.helpers.database import get_db
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from typing import Optional


class MessageModel:
    collection_name = "messages"

    @classmethod
    async def create(cls, message_data: dict):
        db = get_db()
        message_data.setdefault("created_at", datetime.utcnow())
        message_data.setdefault("status", "sent")
        result = await db[cls.collection_name].insert_one(message_data)
        message_data["id"] = str(result.inserted_id)
        message_data.pop("_id", None)
        return message_data

    @classmethod
    async def get_by_channel(
        cls,
        channel_id: str,
        skip: int = 0,
        limit: int = 50,
        since: Optional[datetime] = None,
    ):
        db = get_db()

        # Robustness: Handle both string and ObjectId formats for channel_id
        cid_query = [channel_id]
        try:
            cid_query.append(ObjectId(channel_id))
        except:
            pass

        query: dict = {
            "$or": [
                {"channel_id": {"$in": cid_query}},
                {"channelId": {"$in": cid_query}}
            ]
        }
        if since is not None:
            query["created_at"] = {"$gt": since}

        cursor = (
            db[cls.collection_name]
            .find(query)
            .sort([("created_at", 1), ("_id", 1)])
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(limit)
        for doc in docs:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return docs

    @classmethod
    async def count_by_channel(cls, channel_id: str) -> int:
        db = get_db()
        cid_query = [channel_id]
        try:
            cid_query.append(ObjectId(channel_id))
        except:
            pass
        return await db[cls.collection_name].count_documents({"channel_id": {"$in": cid_query}})

    @classmethod
    async def get_by_id(cls, message_id: str):
        try:
            oid = ObjectId(message_id)
        except (InvalidId, TypeError):
            return None
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_id": oid})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    @classmethod
    async def update(cls, message_id: str, update_data: dict):
        try:
            oid = ObjectId(message_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": update_data},
        )
        return result.modified_count > 0

    @classmethod
    async def delete_by_channel(cls, channel_id: str):
        """Delete all messages in a channel (used when a channel is deleted)."""
        db = get_db()
        
        cid_str = channel_id
        cid_oid = None
        try:
            cid_oid = ObjectId(channel_id)
        except:
            pass
            
        cid_query = [cid_str]
        if cid_oid:
            cid_query.append(cid_oid)
            
        result = await db[cls.collection_name].delete_many({
            "$or": [
                {"channel_id": {"$in": cid_query}},
                {"channelId": {"$in": cid_query}},
                {"channel": {"$in": cid_query}}
            ]
        })
        return result.deleted_count
    @classmethod
    async def delete_by_id(cls, message_id: str):
        try:
            oid = ObjectId(message_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].delete_one({"_id": oid})
        return result.deleted_count > 0
