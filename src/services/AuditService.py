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

    @staticmethod
    async def get_stats():
        """Aggregate audit logs into actionable metrics for the admin dashboard."""
        logs = await AuditModel.get_recent(limit=1000)
        
        stats = {
            "logins": 0,
            "login_failures": 0,
            "keys_generated": 0,
            "quantum_source": 0,
            "fallback_source": 0,
            "threats_detected": 0,
        }
        
        for log in logs:
            evt = log.get("event", "")
            details = log.get("details", {})
            severity = details.get("severity") or log.get("severity")
            
            if evt == "USER_LOGIN":
                stats["logins"] += 1
            elif "Login failed" in evt or severity == "HIGH" and "Login" in evt:
                stats["login_failures"] += 1
            elif evt == "KEY_GENERATED":
                stats["keys_generated"] += 1
                if details.get("source") == "quantum":
                    stats["quantum_source"] += 1
                else:
                    stats["fallback_source"] += 1
            elif severity == "HIGH" or "Attack" in evt:
                stats["threats_detected"] += 1
                
        return stats
