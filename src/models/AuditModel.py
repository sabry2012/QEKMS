from datetime import datetime, timezone

from src.helpers.database import get_db


class AuditModel:
    collection_name = "audit_logs"

    @classmethod
    def _normalize(cls, doc):
        if not doc:
            return doc
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        if "details" not in doc:
            doc["details"] = {
                "ip": doc.get("ip"),
                "severity": doc.get("severity"),
                "metadata": doc.get("metadata", {}),
            }
        return doc

    @classmethod
    async def log(cls, event: str, user_id: str = None, details: dict = None):
        db = get_db()
        audit_data = {
            "event": event,
            "user_id": user_id,
            "details": details or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        result = await db[cls.collection_name].insert_one(audit_data)
        audit_data["id"] = str(result.inserted_id)
        return audit_data

    @classmethod
    async def get_recent(cls, limit: int = 50, severity: str = None):
        db = get_db()
        query = {}
        if severity:
            query["$or"] = [
                {"severity": severity},
                {"details.severity": severity},
            ]
        cursor = db[cls.collection_name].find(query).sort("timestamp", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return [cls._normalize(doc) for doc in docs]
