from fastapi import APIRouter, Depends, Request

from src.helpers.security import require_admin
from src.services.AuditService import AuditService
from src.services.QEKMS_service import QEKMS_service

system_router = APIRouter(prefix="/system", tags=["System"])


def _get_qekms_service(request: Request) -> QEKMS_service:
    service = getattr(request.app, "QEKMS_service", None)
    if service is None:
        service = QEKMS_service()
        request.app.QEKMS_service = service
    return service


@system_router.get("/quantum-status")
async def quantum_status(request: Request):
    return _get_qekms_service(request).get_quantum_status()


@system_router.get("/audit-logs", dependencies=[Depends(require_admin)])
async def audit_logs():
    return await AuditService.get_logs(limit=50)
