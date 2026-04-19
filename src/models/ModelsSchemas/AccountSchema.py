from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AccountBase(BaseModel):
    email: EmailStr
    admin_account: str
    is_active: bool = True
    last_modification: datetime

class AccountCreate(AccountBase):
    password: str

class AccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    admin_account: Optional[str] = None
    is_active: Optional[bool] = None

class AccountOut(BaseModel):
    id: str
    last_modification: datetime


