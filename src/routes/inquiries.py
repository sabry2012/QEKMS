from fastapi import APIRouter, HTTPException, Request
from src.models.ClientRequestModel import ClientRequestModel
from src.services.AuditService import AuditService
from pydantic import BaseModel, EmailStr
from typing import Optional

inquiries_router = APIRouter(prefix="/inquiries", tags=["Inquiries"])

class ExpertInquirySchema(BaseModel):
    full_name: str
    email: EmailStr
    organization: str
    message: str
    plan: Optional[str] = "expert"

@inquiries_router.post("/expert")
async def create_expert_inquiry(inquiry: ExpertInquirySchema, request: Request):
    try:
        # Save to database
        data = inquiry.dict()
        data["type"] = "expert_consultation"
        result = await ClientRequestModel.create(data)
        
        # Log to audit
        await AuditService.log_event(
            event_type="EXPERT_INQUIRY_CREATED",
            description=f"New expert inquiry from {inquiry.full_name} ({inquiry.organization})",
            severity="info",
            metadata={"email": inquiry.email, "plan": inquiry.plan}
        )
        
        return {"status": "success", "message": "Inquiry submitted successfully", "id": result["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
