import logging
from fastapi import APIRouter, HTTPException, Request
from src.models.ClientRequestModel import ClientRequestModel
from src.services.AuditService import AuditService
from pydantic import BaseModel, EmailStr
from typing import Optional

inquiries_router = APIRouter(prefix="/inquiries", tags=["Inquiries"])
logger = logging.getLogger(__name__)

class ExpertInquirySchema(BaseModel):
    full_name: str
    email: EmailStr
    organization: str
    message: str
    plan: Optional[str] = "expert"

@inquiries_router.post("/expert")
async def create_expert_inquiry(inquiry: ExpertInquirySchema, request: Request):
    try:
        email_clean = inquiry.email.strip().lower()
        
        # ── Email Domain Restriction ─────────────────────────────────────
        if not email_clean.endswith("@gmail.com"):
            raise HTTPException(
                status_code=400,
                detail="Only @gmail.com addresses are permitted."
            )
        
        # ── Rate Limiting (Max 3 Inquiries) ───────────────────────────────
        existing_count = await ClientRequestModel.count_by_email_and_type(email_clean, "expert_consultation")
        if existing_count >= 3:
            raise HTTPException(
                status_code=400,
                detail="Request limit reached for this email."
            )
        # ──────────────────────────────────────────────────────────────────

        # Save to database (Mapped to ClientRequestModel schema)
        data = {
            "full_name": inquiry.full_name,
            "email": email_clean,
            "company": inquiry.organization,
            "notes": inquiry.message,
            "plan": inquiry.plan,
            "type": "expert_consultation",
            "status": "pending"
        }
        result = await ClientRequestModel.create(data)
        
        # Log to audit (Fixed argument: event instead of event_type)
        await AuditService.log_event(
            event="EXPERT_INQUIRY_CREATED",
            metadata={"email": inquiry.email, "plan": inquiry.plan}
        )
        
        return {"status": "success", "message": "Inquiry submitted successfully", "id": result["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"EXPERT INQUIRY ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
