from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from src.helpers.security import require_admin
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel

account_router = APIRouter(prefix="/accounts", tags=["Accounts & Admins Management"])


@account_router.get("/", dependencies=[Depends(require_admin)])
async def get_all_accounts(limit: int = 100, is_active: Optional[bool] = None):
    """Get all accounts (admin only)."""
    accounts = await AccountModel.get_all()
    if is_active is not None:
        accounts = [act for act in accounts if act.get("is_active") == is_active]
    # Strip passwords from response
    for act in accounts:
        act.pop("password", None)
    return accounts[:limit]


@account_router.get("/admins", dependencies=[Depends(require_admin)])
async def get_all_admins():
    """Get all admin accounts (admin only)."""
    admins = await AdminModel.get_all()
    for admin in admins:
        admin.pop("password", None)
    return admins


@account_router.patch("/{account_id}/activate", dependencies=[Depends(require_admin)])
async def activate_account(account_id: str):
    """Activate an account (admin only)."""
    updated = await AccountModel.update(account_id, {"is_active": True})
    if not updated:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account activated"}


@account_router.patch("/{account_id}/deactivate", dependencies=[Depends(require_admin)])
async def deactivate_account(account_id: str):
    """Deactivate an account (admin only)."""
    updated = await AccountModel.update(account_id, {"is_active": False})
    if not updated:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deactivated"}
