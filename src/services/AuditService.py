import logging

from src.models.AuditModel import AuditModel

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    async def log(event: str, user_id: str = None, details: dict = None):
        logger.info(f"Audit event: {event} | User: {user_id or 'system'}")
        return await AuditModel.log(event=event, user_id=user_id, details=details or {})

    @staticmethod
    async def log_event(
        event: str, 
        user_id: str = "system", 
        ip: str = "0.0.0.0", 
        severity: str = "INFO", 
        metadata: dict = None
    ):
        """
        Record a security event to the persistent audit log.
        Severities: INFO, WARN, HIGH
        """
        # Also log to system logs for real-time monitoring
        log_msg = f"[{severity}] User: {user_id} | Event: {event} | IP: {ip}"
        if severity == "HIGH":
            logger.error(log_msg)
        elif severity == "WARN":
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        return await AuditService.log(
            event=event,
            user_id=user_id,
            details={
                "ip": ip,
                "severity": severity,
                "metadata": metadata or {},
            },
        )

    @staticmethod
    async def get_logs(severity: str = None, limit: int = 100):
        return await AuditModel.get_recent(limit=limit, severity=severity)
