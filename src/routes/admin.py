import secrets
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, EmailStr
from typing import Optional

from src.helpers.security import require_admin, get_password_hash
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel
from src.models.ChannelModel import ChannelModel
from src.models.ClientRequestModel import ClientRequestModel
from src.models.SettingsModel import SettingsModel, PLAN_LIMITS, DEFAULT_PLAN, CLIENT_PLANS, PLAN_DURATION_DAYS
from src.models.ModelsSchemas.ClientRequestSchema import MarkPaymentRequest, RejectRequestBody
from src.services.AuditService import AuditService

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin", tags=["Admin Panel"])


# ── Schemas ───────────────────────────────────────────────────────────
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "account"
    plan: str = "professional"


class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class UpgradeUserRequest(BaseModel):
    plan: str


class UpdateSettingsRequest(BaseModel):
    default_channels_limit: Optional[int] = None
    default_encryption_limit: Optional[int] = None
    registration_enabled: Optional[bool] = None
    quantum_key_generation_enabled: Optional[bool] = None
    auto_channel_approval: Optional[bool] = None


# ══════════════════════════════════════════════════════════════════════
#  HELPER — EMAIL SERVICE
# ══════════════════════════════════════════════════════════════════════

def _get_email_service(request: Request):
    """Retrieve the EmailService instance attached to the app."""
    return getattr(request.app, "email_service", None)


# ══════════════════════════════════════════════════════════════════════
#  USERS
# ══════════════════════════════════════════════════════════════════════

@admin_router.get("/users", dependencies=[Depends(require_admin)])
async def list_all_users():
    accounts = await AccountModel.get_all()
    admins = await AdminModel.get_all()

    users = []
    for acc in accounts:
        acc.pop("password", None)
        acc["role"] = "account"
        acc.setdefault("plan", DEFAULT_PLAN)
        plan = acc.get("plan", DEFAULT_PLAN)
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS[DEFAULT_PLAN])
        acc["channels_limit"] = limits["channels_limit"]
        acc["encryption_limit"] = limits["encryption_limit"]
        acc["channels_created_total"] = acc.get("channels_created_total", 0)
        users.append(acc)
    for adm in admins:
        adm.pop("password", None)
        adm["role"] = "admin"
        adm["plan"] = "enterprise"
        adm["channels_limit"] = -1
        adm["encryption_limit"] = -1
        adm["channels_created_total"] = "∞"
        users.append(adm)

    return users


@admin_router.post("/create-user", dependencies=[Depends(require_admin)])
async def admin_create_user(data: CreateUserRequest):
    existing_account = await AccountModel.get_by_email(data.email)
    existing_admin = await AdminModel.get_by_email(data.email)
    if existing_account or existing_admin:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.plan not in PLAN_LIMITS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan. Choose from: {list(PLAN_LIMITS.keys())}",
        )

    hashed = get_password_hash(data.password)

    if data.role == "admin":
        doc = {
            "email": data.email,
            "password": hashed,
            "accounts_number": 0,
            "is_active": True,
            "last_modification": datetime.utcnow(),
        }
        result = await AdminModel.create(doc)
    else:
        limits = PLAN_LIMITS[data.plan]
        now = datetime.utcnow()
        duration = PLAN_DURATION_DAYS.get(data.plan, 365)
        doc = {
            "email": data.email,
            "password": hashed,
            "admin_account": "System",
            "is_active": True,
            "plan": data.plan,
            "channels_limit": limits["channels_limit"],
            "encryption_limit": limits["encryption_limit"],
            "subscription_status": "active",
            "subscription_start": now,
            "subscription_end": now + timedelta(days=duration),
            "payment_status": "paid",
            "payment_reference": "manual",
            "last_modification": now,
        }
        result = await AccountModel.create(doc)

    return {
        "message": f"User created as {data.role} ({data.plan})",
        "id": result.get("id", ""),
    }


@admin_router.put("/update-user/{user_id}", dependencies=[Depends(require_admin)])
async def admin_update_user(user_id: str, data: UpdateUserRequest):
    update_fields = {}
    if data.email is not None:
        existing_acc = await AccountModel.get_by_email(data.email)
        existing_adm = await AdminModel.get_by_email(data.email)
        if existing_acc and existing_acc["id"] != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        if existing_adm and existing_adm["id"] != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = data.email
    if data.is_active is not None:
        update_fields["is_active"] = data.is_active

    update_fields["last_modification"] = datetime.utcnow()

    updated = await AccountModel.update(user_id, update_fields)
    if not updated:
        updated = await AdminModel.update(user_id, update_fields)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    # Sync channel status based on the new is_active state
    if data.is_active is not None:
        target_email = data.email or (await AccountModel.get_by_id(user_id) or await AdminModel.get_by_id(user_id)).get("email")
        if target_email:
            await ChannelModel.sync_user_channels(target_email, data.is_active)

    return {"message": "User updated"}


@admin_router.delete("/delete-user/{user_id}", dependencies=[Depends(require_admin)])
async def admin_delete_user(user_id: str, request: Request, admin=Depends(require_admin)):
    deleted = await AccountModel.delete(user_id)
    if not deleted:
        deleted = await AdminModel.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
        
    await AuditService.log_event(
        event="USER_DELETED",
        user_id=admin.get("id", "admin"),
        ip=request.client.host,
        severity="HIGH",
        metadata={"target_user_id": user_id}
    )
    return {"message": "User deleted"}


@admin_router.post("/reset-password/{user_id}", dependencies=[Depends(require_admin)])
async def admin_reset_password(user_id: str, data: ResetPasswordRequest):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password too short (min 8 characters)")

    hashed = get_password_hash(data.new_password)
    update_data = {"password": hashed, "last_modification": datetime.utcnow()}

    updated = await AccountModel.update(user_id, update_data)
    if not updated:
        updated = await AdminModel.update(user_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password reset successfully"}


# ══════════════════════════════════════════════════════════════════════
#  PLAN / SUBSCRIPTION
# ══════════════════════════════════════════════════════════════════════

@admin_router.post("/upgrade-user/{user_id}", dependencies=[Depends(require_admin)])
async def admin_upgrade_user(user_id: str, data: UpgradeUserRequest):
    if data.plan not in PLAN_LIMITS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan. Choose from: {list(PLAN_LIMITS.keys())}",
        )

    limits = PLAN_LIMITS[data.plan]
    now = datetime.utcnow()
    duration = PLAN_DURATION_DAYS.get(data.plan, 365)

    update_data = {
        "plan": data.plan,
        "channels_limit": limits["channels_limit"],
        "encryption_limit": limits["encryption_limit"],
        "subscription_status": "active",
        "subscription_start": now,
        "subscription_end": now + timedelta(days=duration),
        "last_modification": now,
    }

    updated = await AccountModel.update(user_id, update_data)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail="User not found (only account users have plans)",
        )

    return {"message": f"User upgraded to {data.plan}", "limits": limits}


# ══════════════════════════════════════════════════════════════════════
#  CHANNELS
# ══════════════════════════════════════════════════════════════════════

@admin_router.get("/channels", dependencies=[Depends(require_admin)])
async def admin_list_channels():
    return await ChannelModel.get_all()


@admin_router.delete("/channels/{channel_id}", dependencies=[Depends(require_admin)])
async def admin_delete_channel(channel_id: str, request: Request, admin=Depends(require_admin)):
    # Defense in depth: pass the admin object to the model
    deleted = await ChannelModel.delete(channel_id, performing_user=admin)
    if not deleted:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    await AuditService.log_event(
        event="CHANNEL_DELETED",
        user_id=admin.get("id", "admin"),
        ip=request.client.host,
        severity="HIGH",
        metadata={"channel_id": channel_id}
    )
    return {"message": "Channel deleted"}



# ══════════════════════════════════════════════════════════════════════
#  SETTINGS
# ══════════════════════════════════════════════════════════════════════

@admin_router.get("/settings", dependencies=[Depends(require_admin)])
async def admin_get_settings():
    return await SettingsModel.get_or_create()


@admin_router.put("/settings", dependencies=[Depends(require_admin)])
async def admin_update_settings(data: UpdateSettingsRequest):
    update_fields = {}
    if data.default_channels_limit is not None:
        update_fields["default_channels_limit"] = data.default_channels_limit
    if data.default_encryption_limit is not None:
        update_fields["default_encryption_limit"] = data.default_encryption_limit
    if data.registration_enabled is not None:
        update_fields["registration_enabled"] = data.registration_enabled
    if data.quantum_key_generation_enabled is not None:
        update_fields["quantum_key_generation_enabled"] = data.quantum_key_generation_enabled
    if data.auto_channel_approval is not None:
        update_fields["auto_channel_approval"] = data.auto_channel_approval

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    await SettingsModel.update(update_fields)
    return {"message": "Settings updated", "settings": await SettingsModel.get_or_create()}


# ══════════════════════════════════════════════════════════════════════
#  CLIENT REQUESTS — FULL MANAGEMENT
# ══════════════════════════════════════════════════════════════════════

@admin_router.get("/clients", dependencies=[Depends(require_admin)])
async def admin_list_client_requests():
    """List all client access requests, newest first."""
    return await ClientRequestModel.get_all()


@admin_router.get("/clients/stats", dependencies=[Depends(require_admin)])
async def admin_client_stats():
    """Quick counts for admin dashboard overview."""
    pending = await ClientRequestModel.count_by_status("pending")
    approved = await ClientRequestModel.count_by_status("approved")
    rejected = await ClientRequestModel.count_by_status("rejected")
    total_users = len(await AccountModel.get_all())
    return {
        "pending_requests": pending,
        "approved_requests": approved,
        "rejected_requests": rejected,
        "total_users": total_users,
    }


@admin_router.put("/clients/{request_id}/payment", dependencies=[Depends(require_admin)])
async def admin_mark_payment(request_id: str, data: MarkPaymentRequest):
    """
    Mark a client request as payment-verified.
    Must be done before approving the request.
    """
    req = await ClientRequestModel.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Client request not found")

    if req.get("status") == "approved":
        raise HTTPException(
            status_code=400,
            detail="Request is already approved and account created.",
        )
    if req.get("status") == "rejected":
        raise HTTPException(status_code=400, detail="Cannot update a rejected request.")

    updated = await ClientRequestModel.update(request_id, {
        "payment_status": "paid",
        "payment_reference": data.payment_reference.strip(),
        "amount": data.amount,
    })
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update payment status")

    return {
        "message": "Payment verified successfully.",
        "payment_reference": data.payment_reference,
        "amount": data.amount,
    }


@admin_router.put("/clients/{request_id}/approve")
async def admin_approve_client(request_id: str, request: Request, admin=Depends(require_admin)):
    """
    Approve a client request and provision their account.

    Requirements:
    - Request must be in 'pending' status.
    - payment_status must be 'paid'.

    On success:
    - Generates a secure random password.
    - Creates an AccountModel document with full subscription metadata.
    - Sends activation email (or logs credentials if SMTP not configured).
    - Updates the client request to status='approved'.
    """
    req = await ClientRequestModel.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Client request not found")

    if req.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Request already approved.")
    if req.get("status") == "rejected":
        raise HTTPException(status_code=400, detail="Cannot approve a rejected request.")
    if req.get("payment_status") != "paid":
        raise HTTPException(
            status_code=400,
            detail="Payment must be verified before approval. Use PUT /admin/clients/{id}/payment first.",
        )

    # Check account doesn't already exist
    existing = await AccountModel.get_by_email(req["email"])
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Account for '{req['email']}' already exists.",
        )

    # Generate secure credentials
    raw_password = secrets.token_urlsafe(12)
    hashed = get_password_hash(raw_password)
    plan = req.get("plan", "professional")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["professional"])
    now = datetime.utcnow()
    duration = PLAN_DURATION_DAYS.get(plan, 365)
    admin_email = admin.get("sub", "System")

    # Create account mapping natively to lowercase schemas explicitly
    account_doc = {
        "email": req["email"],
        "password": hashed,
        "admin_account": admin_email,
        "is_active": True,
        "plan": plan,
        "channels_limit": limits["channels_limit"],
        "encryption_limit": limits["encryption_limit"],
        "subscription_status": "active",
        "subscription_start": now,
        "subscription_end": now + timedelta(days=duration),
        "payment_status": "paid",
        "payment_reference": req.get("payment_reference", ""),
        "amount": req.get("amount"),
        "last_modification": now,
    }

    created_user = await AccountModel.create(account_doc)

    # Update client request
    await ClientRequestModel.update(request_id, {
        "status": "approved",
        "reviewed_by": admin_email,
        "reviewed_at": now,
    })

    # Send activation email
    email_service = _get_email_service(request)
    email_sent = False
    if email_service:
        email_sent = email_service.send_activation_email(
            to_email=req["email"],
            full_name=req.get("full_name", ""),
            password=raw_password,
            plan=plan,
        )

    logger.info(
        f"Client approved: {req['email']} | plan={plan} | "
        f"account={created_user['id']} | email_sent={email_sent}"
    )

    return {
        "message": "Client approved and account activated.",
        "account_id": created_user["id"],
        "email": req["email"],
        "plan": plan,
        "subscription_end": (now + timedelta(days=duration)).isoformat(),
        # Always return the raw password so admin can manually relay if email fails
        "generated_password": raw_password,
        "email_sent": email_sent,
    }


@admin_router.put("/clients/{request_id}/reject", dependencies=[Depends(require_admin)])
async def admin_reject_client(request_id: str, request: Request, data: Optional[RejectRequestBody] = None, admin=Depends(require_admin)):
    """Reject a client access request with an optional reason."""
    req = await ClientRequestModel.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Client request not found")

    if req.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Cannot reject an already-approved request.")

    reason = (data.reason if data else None) or None
    admin_email = admin.get("sub", "System")

    await ClientRequestModel.update(request_id, {
        "status": "rejected",
        "rejection_reason": reason,
        "reviewed_by": admin_email,
        "reviewed_at": datetime.utcnow(),
    })

    # Send rejection email
    email_service = _get_email_service(request)
    if email_service:
        email_service.send_rejection_email(
            to_email=req["email"],
            full_name=req.get("full_name", ""),
            reason=reason,
        )

    return {"message": "Request rejected.", "reason": reason}
@admin_router.get("/audit-logs", dependencies=[Depends(require_admin)])
async def list_audit_logs(
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """Retrieve security audit logs, newest first."""
    return await AuditService.get_logs(severity=severity, limit=limit)


@admin_router.get("/stats", dependencies=[Depends(require_admin)])
async def get_system_stats():
    """Aggregate system metrics for the dashboard."""
    return await AuditService.get_stats()


@admin_router.get("/quantum/status", dependencies=[Depends(require_admin)])
async def get_quantum_health(request: Request):
    """Retrieve the current health and metrics of the Quantum Key Management System."""
    qekms = request.app.QEKMS_service
    return qekms.get_quantum_status()
