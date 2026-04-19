from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class AdminBase(BaseModel):
    email: EmailStr
    accounts_number: int = 0   # 👈 default
    is_active: bool = True
    last_modification: datetime = datetime.utcnow()  # 👈 default


# 🔥 أهم تعديل
class AdminCreate(BaseModel):
    email: EmailStr
    password: str


class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    accounts_number: Optional[int] = None
    is_active: Optional[bool] = None
    last_modification: Optional[datetime] = None


class AdminOut(AdminBase):
    id: str