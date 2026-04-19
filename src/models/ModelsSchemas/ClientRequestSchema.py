from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ClientRequestCreate(BaseModel):
    """Schema for the public POST /client/request endpoint."""
    full_name: str
    company: str
    email: EmailStr
    phone: str
    plan: str          # "pro" or "enterprise"
    notes: Optional[str] = None


class ClientRequestOut(BaseModel):
    """Schema returned to the client after submission."""
    id: str
    full_name: str
    company: str
    email: EmailStr
    plan: str
    status: str
    payment_status: str
    created_at: datetime


class MarkPaymentRequest(BaseModel):
    """Body for admin to record payment verification."""
    payment_reference: str
    amount: float


class RejectRequestBody(BaseModel):
    """Optional rejection reason."""
    reason: Optional[str] = None
