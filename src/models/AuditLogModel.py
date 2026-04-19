from src.models.AuditModel import AuditModel


class AuditLogModel(AuditModel):
    """Backward-compatible alias for older imports."""

    @classmethod
    async def get_logs(cls, severity: str = None, limit: int = 100):
        return await cls.get_recent(limit=limit, severity=severity)
