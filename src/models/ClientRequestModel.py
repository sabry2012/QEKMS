from src.helpers.database import get_db
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from typing import Optional


class ClientRequestModel:
    collection_name = "client_requests"

    @classmethod
    async def create(cls, data: dict) -> dict:
        db = get_db()
        data.setdefault("status", "pending")
        data.setdefault("payment_status", "pending")
        data.setdefault("is_deleted", False)
        data.setdefault("created_at", datetime.utcnow())
        result = await db[cls.collection_name].insert_one(data)
        data["id"] = str(result.inserted_id)
        data.pop("_id", None)
        return data

    @classmethod
    async def get_by_id(cls, request_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(request_id)
        except (InvalidId, TypeError):
            return None
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_id": oid})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    @classmethod
    async def get_by_email(cls, email: str) -> Optional[dict]:
        db = get_db()
        doc = await db[cls.collection_name].find_one({"email": email})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    @classmethod
    async def get_all(cls) -> list:
        db = get_db()
        docs = await db[cls.collection_name].find().sort("created_at", -1).to_list(1000)
        for doc in docs:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return docs

    @classmethod
    async def update(cls, request_id: str, update_data: dict) -> bool:
        try:
            oid = ObjectId(request_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": update_data},
        )
        return result.modified_count > 0

    @classmethod
    async def count_by_status(cls, status: str) -> int:
        db = get_db()
        return await db[cls.collection_name].count_documents({"status": status, "is_deleted": {"$ne": True}})

    @classmethod
    async def count_by_email_and_type(cls, email: str, request_type: str) -> int:
        db = get_db()
        return await db[cls.collection_name].count_documents({"email": email, "type": request_type})
