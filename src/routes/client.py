import logging
from fastapi import APIRouter, HTTPException

from src.models.ClientRequestModel import ClientRequestModel
from src.models.AccountModel import AccountModel
from src.models.ModelsSchemas.ClientRequestSchema import ClientRequestCreate
from src.models.SettingsModel import PLAN_LIMITS # Added for potential future parity
CLIENT_PLANS = ["starter", "professional", "enterprise"] # Explicitly in sync with frontend
from email_validator import validate_email, EmailNotValidError

logger = logging.getLogger(__name__)

# Basic list of known active disposable domains
DISPOSABLE_DOMAINS = {
    "tempmail.com", "10minutemail.com", "guerrillamail.com", "dropmail.me", 
    "yopmail.com", "mailinator.com", "temp-mail.org", "trashmail.com", 
    "getnada.com", "sharklasers.com", "dispostable.com"
}


logger = logging.getLogger(__name__)

client_router = APIRouter(prefix="/client", tags=["Client Access Requests"])


@client_router.post("/request", status_code=201)
async def submit_access_request(data: ClientRequestCreate):
    """
    Public endpoint — no authentication required.

    Allows a prospective client to submit an access request.
    """
    # Validate plan
    if data.plan not in CLIENT_PLANS:
        raise HTTPException(
            status_code=400,
            detail=f"DEBUG_VALIDATION: Plan '{data.plan}' is not in the system registry. Registry contains: {CLIENT_PLANS}",
        )

    # Validate Email via Syntax and MX checks
    try:
        email_info = validate_email(str(data.email), check_deliverability=True)
        domain = email_info.domain.lower()
        if domain in DISPOSABLE_DOMAINS or any(d in domain for d in ["temp", "disposable", "throwaway", "10minute"]):
            raise HTTPException(status_code=400, detail="Disposable or temporary email addresses are strictly prohibited for enterprise network nodes.")
        
        # Override with normalized email
        clean_email = email_info.normalized
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=f"Email Validation Failed: {str(e)}")

    # Check for existing active (non-rejected) request with same email
    existing = await ClientRequestModel.get_by_email(clean_email)
    if existing and existing.get("status") != "rejected":
        raise HTTPException(
            status_code=409,
            detail=(
                f"A request for '{data.email}' already exists "
                f"(status: {existing['status']}). "
                "Contact support if you need to update it."
            ),
        )

    # Check if user is already provisioned
    from src.models.AccountModel import AccountModel as AM
    already_user = await AM.get_by_email(clean_email)
    if already_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    doc = {
        "full_name": data.full_name.strip(),
        "company": data.company.strip(),
        "email": clean_email,
        "phone": data.phone.strip(),
        "plan": data.plan,
        "notes": (data.notes or "").strip(),
        "status": "pending",
        "payment_status": "pending",
        "payment_reference": None,
        "amount": None,
        "rejection_reason": None,
        "reviewed_by": None,
        "reviewed_at": None,
    }

    created = await ClientRequestModel.create(doc)
    logger.info(f"New client request: {data.email} ({data.plan})")

    return {
        "message": "Your access request has been received. Our team will review it shortly.",
        "request_id": created["id"],
        "status": "pending",
    }


@client_router.get("/status/{email}")
async def check_request_status(email: str):
    """
    Public endpoint. Returns the current status of an access request.
    Does not expose sensitive system logic.
    """
    email_lower = email.lower().strip()
    
    # First, check if there's a live account already
    acc = await AccountModel.get_by_email(email_lower)
    if acc:
        return {
            "exists": True,
            "status": "approved",
            "payment_status": acc.get("payment_status", "paid"),
            "plan": acc.get("plan", "unknown"),
            "message": "Your account has been fully provisioned."
        }
        
    req = await ClientRequestModel.get_by_email(email_lower)
    if not req:
        raise HTTPException(status_code=404, detail="No request or account found for this email.")
        
    return {
        "exists": True,
        "status": req.get("status", "pending"),
        "payment_status": req.get("payment_status", "pending"),
        "plan": req.get("plan", "unknown"),
        "rejection_reason": req.get("rejection_reason", None),
        "message": "Status retrieved."
    }
