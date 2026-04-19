from pydantic import BaseModel, EmailStr
from typing import Optional, List


class ChannelBase(BaseModel):
    sender: Optional[EmailStr] = None
    receiver: Optional[EmailStr] = None
    is_group: bool = False
    name: Optional[str] = None
    members: Optional[List[EmailStr]] = None


class ChannelCreate(ChannelBase):
    # Keys stored as base64-encoded strings so they are BSON-serializable in MongoDB.
    # The raw bytes are encoded by the caller (channels.py) before constructing this object.
    shared_key: str
    private_key: str


class ChannelUpdate(BaseModel):
    sender: Optional[EmailStr] = None
    receiver: Optional[EmailStr] = None
    shared_key: Optional[str] = None
    private_key: Optional[str] = None


class ChannelOut(ChannelBase):
    id: str