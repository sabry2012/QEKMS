import re

from src.helpers.database import get_db
from bson import ObjectId
from bson.errors import InvalidId

class AdminModel:
    collection_name = "admins"

    @classmethod
    def _normalize(cls, doc):
        if not doc:
            return doc
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
            
        # Normalize legacy capitalization
        if "Email" in doc:
            doc["email"] = doc.pop("Email")
        if "Password" in doc:
            doc["password"] = doc.pop("Password")
        if doc.get("email"):
            doc["email"] = doc["email"].strip().lower()
        if "last_seen" in doc:
            doc["last_seen"] = doc["last_seen"]
            
        return doc

    @classmethod
    async def create(cls, admin_data: dict):
        db = get_db()
        if "Email" in admin_data:
            admin_data["email"] = admin_data.pop("Email")
        if "Password" in admin_data:
            admin_data["password"] = admin_data.pop("Password")
        if admin_data.get("email"):
            admin_data["email"] = admin_data["email"].strip().lower()
        if "last_seen" not in admin_data:
            admin_data["last_seen"] = None
            
        result = await db[cls.collection_name].insert_one(admin_data)
        admin_data["id"] = str(result.inserted_id)
        admin_data.pop("_id", None)
        return cls._normalize(admin_data)

    @classmethod
    async def get_by_email(cls, email: str):
        if not email:
            return None
        db = get_db()
        normalized_email = email.strip().lower()
        escaped_email = re.escape(normalized_email)
        doc = await db[cls.collection_name].find_one({
            "$or": [
                {"email": {"$regex": f"^{escaped_email}$", "$options": "i"}},
                {"Email": {"$regex": f"^{escaped_email}$", "$options": "i"}},
            ]
        })
        return cls._normalize(doc)

    @classmethod
    async def get_by_id(cls, admin_id: str):
        try:
            oid = ObjectId(admin_id)
        except (InvalidId, TypeError):
            return None
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_id": oid})
        return cls._normalize(doc)

    @classmethod
    async def get_all(cls):
        db = get_db()
        docs = await db[cls.collection_name].find().to_list(1000)
        return [cls._normalize(doc) for doc in docs]

    @classmethod
    async def update(cls, admin_id: str, update_data: dict):
        try:
            oid = ObjectId(admin_id)
        except (InvalidId, TypeError):
            return False
            
        if "Email" in update_data:
            update_data["email"] = update_data.pop("Email")
        if "Password" in update_data:
            update_data["password"] = update_data.pop("Password")
        if update_data.get("email"):
            update_data["email"] = update_data["email"].strip().lower()
            
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": update_data},
        )
        return result.modified_count > 0

    @classmethod
    async def delete(cls, admin_id: str):
        try:
            oid = ObjectId(admin_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].delete_one({"_id": oid})
        return result.deleted_count > 0
