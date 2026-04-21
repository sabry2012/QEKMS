from src.helpers.database import get_db
from src.models.ModelsSchemas.ChannelSchema import ChannelCreate
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime


class ChannelModel:
    collection_name = "channels"

    @classmethod
    async def create(cls, channel_data: dict):
        db = get_db()
        channel_data["is_active"] = True
        channel_data["created_at"] = datetime.utcnow()
        channel_data["current_key_version"] = 1

        # Production Hardening: Key Lifecycle
        channel_data["key_usage_count"] = 0
        channel_data["key_max_usage"] = 1000 # Rotate after 1000 messages
        channel_data["key_expires_at"] = None # Optional TTL
        
        # 'keys' is a dict mapping version (str) to key metadata
        # Actual key content is stored in 'master_key_bin' or similar
        # For now we use the provided data but we'll adapt to versioning
        
        result = await db[cls.collection_name].insert_one(channel_data)
        channel_data["id"] = str(result.inserted_id)
        channel_data.pop("_id", None)
        # Never expose keys in the response
        channel_data.pop("keys", None)
        channel_data.pop("shared_key", None)
        channel_data.pop("private_key", None)
        return channel_data

    @classmethod
    async def get_by_id(cls, channel_id: str):
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return None
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_id": oid})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            # Security: strip sensitive fields
            doc.pop("keys", None)
            doc.pop("shared_key", None)
            doc.pop("private_key", None)
        return doc

    @classmethod
    async def get_by_participants(cls, sender_email: str, receiver_email: str):
        db = get_db()
        channel = await db[cls.collection_name].find_one({
            "$or": [
                {"sender": sender_email, "receiver": receiver_email},
                {"sender": receiver_email, "receiver": sender_email},
            ]
        })
        if channel:
            channel["id"] = str(channel["_id"])
            del channel["_id"]
            # Security: strip sensitive fields
            channel.pop("keys", None)
            channel.pop("shared_key", None)
            channel.pop("private_key", None)
        return channel

    @classmethod
    async def get_all(cls):
        db = get_db()
        channels = await db[cls.collection_name].find().to_list(1000)
        for ch in channels:
            ch["id"] = str(ch["_id"])
            del ch["_id"]
            # Security: strip sensitive fields
            ch.pop("keys", None)
            ch.pop("shared_key", None)
            ch.pop("private_key", None)
        return channels

    @classmethod
    async def get_by_id_internal(cls, channel_id: str):
        """Internal only: returns full document with keys."""
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return None
        db = get_db()
        doc = await db[cls.collection_name].find_one({"_id": oid})
        if doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        return doc

    @classmethod
    async def rotate_key(cls, channel_id: str, new_key_data: dict, new_version: int):
        """Updates the current key version and adds the new key to history."""
        db = get_db()
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return False
            
        await db[cls.collection_name].update_one(
            {"_id": oid},
            {
                "$set": {
                    "current_key_version": new_version,
                    f"keys.{new_version}": new_key_data
                }
            }
        )
        return True

    @classmethod
    async def count_user_channels(cls, user_email: str) -> int:
        db = get_db()
        count = await db[cls.collection_name].count_documents({
            "$or": [
                {"sender": user_email},
                {"receiver": user_email},
                {"members": user_email},
            ]
        })
        return count

    @classmethod
    async def update(cls, channel_id: str, update_data: dict):
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": update_data},
        )
        return result.modified_count > 0

    @classmethod
    async def delete(cls, channel_id: str, performing_user: dict):
        """
        Delete a channel. 
        Defense in depth: checks if user is admin even if route already checked.
        """
        if performing_user.get("role") != "admin":
            raise PermissionError("Action requires administrative privileges.")

        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        
        # Security: Secure Destruction - wipe keys before deleting document
        await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": {"keys": {}, "master_key_bin": None, "is_active": False, "deleted_at": datetime.utcnow()}}
        )
        
        result = await db[cls.collection_name].delete_one({"_id": oid})
        return result.deleted_count > 0

    @classmethod
    async def increment_unread(cls, channel_id: str, email: str):
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$inc": {f"unread_counts.{email.replace('.', '_')}": 1}}
        )
        return True

    @classmethod
    async def clear_unread(cls, channel_id: str, email: str):
        try:
            oid = ObjectId(channel_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": {f"unread_counts.{email.replace('.', '_')}": 0}}
        )
        return True

    @classmethod
    async def sync_user_channels(cls, user_email: str, is_active: bool):
        db = get_db()
        channels = await db[cls.collection_name].find({
            "$or": [{"sender": user_email}, {"receiver": user_email}],
            "is_group": {"$ne": True}
        }).to_list(1000)
        
        if not channels:
            return
            
        from src.models.AccountModel import AccountModel
        from src.models.AdminModel import AdminModel
        
        async def is_user_active(email: str) -> bool:
            if email == user_email:
                return is_active
            acc = await AccountModel.get_by_email(email)
            if acc:
                return acc.get("is_active", True)
            adm = await AdminModel.get_by_email(email)
            if adm:
                return adm.get("is_active", True)
            return False
            
        for ch in channels:
            other_user_email = ch["receiver"] if ch["sender"] == user_email else ch["sender"]
            other_is_active = await is_user_active(other_user_email)
            channel_should_be_active = is_active and other_is_active
            
            if ch.get("is_active", True) != channel_should_be_active:
                await db[cls.collection_name].update_one(
                    {"_id": ch["_id"]},
                    {"$set": {"is_active": channel_should_be_active}}
                )

