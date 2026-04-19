from src.helpers.database import get_db
from bson import ObjectId
from bson.errors import InvalidId

class AccountModel:
    collection_name = "accounts"

    @classmethod
    def _normalize(cls, doc):
        if not doc:
            return doc
        # Ensure 'id' is standard
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        
        # Normalize legacy capitalization
        if "Email" in doc:
            doc["email"] = doc.pop("Email")
        if "Password" in doc:
            doc["password"] = doc.pop("Password")
        if "Admin_account" in doc:
            doc["admin_account"] = doc.pop("Admin_account")
            
        return doc

    @classmethod
    async def fallback_migration(cls, doc_id, normalized_data):
        """Silently patch the database structure to the newly standard lowercase fields during reads."""
        pass # Optional background migrate. For now we just normalize at the runtime layer.

    @classmethod
    async def create(cls, account_data: dict):
        db = get_db()
        # Enforce lowercase in newly created records
        if "Email" in account_data:
            account_data["email"] = account_data.pop("Email")
        if "Password" in account_data:
            account_data["password"] = account_data.pop("Password")
        if "Admin_account" in account_data:
            account_data["admin_account"] = account_data.pop("Admin_account")

        result = await db[cls.collection_name].insert_one(account_data)
        account_data["id"] = str(result.inserted_id)
        account_data.pop("_id", None)
        return cls._normalize(account_data)

    @classmethod
    async def get_by_email(cls, email: str):
        db = get_db()
        doc = await db[cls.collection_name].find_one({"$or": [{"email": email}, {"Email": email}]})
        return cls._normalize(doc)

    @classmethod
    async def get_by_id(cls, account_id: str):
        try:
            oid = ObjectId(account_id)
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
    async def update(cls, account_id: str, update_data: dict):
        try:
            oid = ObjectId(account_id)
        except (InvalidId, TypeError):
            return False
            
        # Standardize keys before sending to Mongo
        if "Email" in update_data:
            update_data["email"] = update_data.pop("Email")
        if "Password" in update_data:
            update_data["password"] = update_data.pop("Password")
            
        db = get_db()
        result = await db[cls.collection_name].update_one(
            {"_id": oid},
            {"$set": update_data},
        )
        return result.modified_count > 0

    @classmethod
    async def delete(cls, account_id: str):
        try:
            oid = ObjectId(account_id)
        except (InvalidId, TypeError):
            return False
        db = get_db()
        result = await db[cls.collection_name].delete_one({"_id": oid})
        return result.deleted_count > 0
