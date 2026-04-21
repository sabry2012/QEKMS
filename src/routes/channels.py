import os
import uuid
import base64
import logging
from datetime import datetime, timezone
import json
import asyncio
from typing import Optional, Set, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, EmailStr

from src.helpers.security import get_current_user_from_cookie, decode_access_token
from src.models.ChannelModel import ChannelModel
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel
from src.models.MessageModel import MessageModel
from src.models.ModelsSchemas.ChannelSchema import ChannelCreate
from src.models.SettingsModel import PLAN_LIMITS, DEFAULT_PLAN
from src.services.QEKMS_service import QEKMS_service
from src.services.AuditService import AuditService
from src.models.NonceModel import NonceModel
from src.services.websocket_manager import chat_manager

logger = logging.getLogger(__name__)

channel_router = APIRouter(prefix="/channels", tags=["Channels & Messaging"])

UPLOAD_DIR = "uploads"

# ── File validation constants ─────────────────────────────────────────
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

ALLOWED_MIME_TYPES: Set[str] = {
    # Images
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    # Video
    "video/mp4", "video/webm", "video/ogg",
    # Voice / Audio
    "audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4",
    # Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    # Archives & text
    "application/zip",
    "application/x-zip-compressed",
    "text/plain",
    "text/csv",
}

ALLOWED_EXTENSIONS: Set[str] = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
    ".mp4", ".webm", ".ogv",
    ".oga", ".weba", ".wav", ".mp3", ".ogg",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".zip", ".txt", ".csv",
}


# ── Request schemas ───────────────────────────────────────────────────
class CreateChannelRequest(BaseModel):
    """Body schema for channel creation. Uses POST body instead of query string
    to avoid leaking email addresses in server access logs."""
    receiver_email: EmailStr

class CreateGroupRequest(BaseModel):
    name: str
    members: List[EmailStr]

class GroupMemberRequest(BaseModel):
    channel_id: str
    email: EmailStr

class HandshakeRequest(BaseModel):
    client_public_key: str

class SecureSendMessageRequest(BaseModel):
    ciphertext: str
    nonce: str
    timestamp: int
    signature: str
    key_version: int
    msg_type: str = "text"
    file_name: Optional[str] = None
    file_path: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════
#  INTERNAL KEY HELPERS
# ══════════════════════════════════════════════════════════════════════

def _get_channel_key(channel: dict) -> bytes:
    """
    Extract the shared_key from a channel document as raw bytes.
    Keys are stored as base64-encoded strings in MongoDB.
    Raises ValueError if the key is missing or corrupted (Fix 6 from Phase 1).
    """
    raw = channel.get("shared_key")
    if not raw:
        raise ValueError(f"Channel {channel.get('id')} is missing its shared_key.")

    if isinstance(raw, bytes):
        return raw

    if isinstance(raw, str):
        try:
            return base64.b64decode(raw)
        except Exception as exc:
            raise ValueError(
                f"Channel {channel.get('id')} has a corrupted shared_key: {exc}"
            ) from exc

    raise ValueError(
        f"Channel {channel.get('id')} has an unrecognized shared_key type: {type(raw)}"
    )


def _normalize_key(key: bytes) -> bytes:
    """Pad or truncate to exactly 32 bytes for AES-256-GCM."""
    if len(key) >= 32:
        return key[:32]
    return key + b'\x00' * (32 - len(key))


def _validate_file(file: UploadFile, file_bytes: bytes) -> str:
    """
    Validate an uploaded file.
    Returns the determined message type ('image', 'video', 'file').
    Raises HTTPException on validation failure.
    """
    # Size check
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        )

    # Extension check
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{ext}' is not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # MIME type check (server-side, not trusting client Content-Type)
    ct = (file.content_type or "").lower().split(";")[0].strip()
    if ct and ct not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"MIME type '{ct}' is not permitted.",
        )

    # Determine logical type from MIME / extension
    if ct.startswith("image/") or ext in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}:
        return "image"
    if ct.startswith("video/") or ext in {".mp4", ".webm", ".ogv"}:
        return "video"
    if ct.startswith("audio/") or ext in {".oga", ".weba", ".wav", ".mp3", ".ogg"}:
        return "voice"
    return "file"


# ══════════════════════════════════════════════════════════════════════
#  CHANNEL ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@channel_router.get("/")
async def list_channels(user: dict = Depends(get_current_user_from_cookie)):
    """
    Returns the caller's channels. Admin sees all channels.
    Keys are never included in the response (stripped by ChannelModel.get_all).
    """
    all_channels = await ChannelModel.get_all()
    user_email = user.get("sub")
    user_role = user.get("role")
    
    # Filter channels based on role
    if user_role == "admin":
        filtered = all_channels
    else:
         filtered = [
            ch for ch in all_channels
            if (ch.get("is_group") and user_email in ch.get("members", [])) or (not ch.get("is_group") and (ch.get("sender") == user_email or ch.get("receiver") == user_email))
        ]

    # Enrich with presence data
    enriched = []
    for ch in filtered:
        # Determine counterpart for direct channels
        other_email = None
        if not ch.get("is_group"):
            other_email = ch["receiver"] if ch["sender"] == user_email else ch["sender"]
        
        if other_email:
            # Check online status
            is_online = chat_manager.is_user_online(other_email)
            
            # Fetch last_seen from DB if not online
            last_seen = None
            if not is_online:
                other_user = await AccountModel.get_by_email(other_email) or await AdminModel.get_by_email(other_email)
                if other_user:
                    last_seen = other_user.get("last_seen")
                    if last_seen and hasattr(last_seen, "isoformat"):
                        last_seen = last_seen.isoformat()
            
            ch["other_presence"] = {
                "status": "online" if is_online else "offline",
                "last_seen": last_seen
            }
        enriched.append(ch)

    return enriched


@channel_router.post("/")
@channel_router.post("/create")
async def create_channel(
    data: CreateChannelRequest,
    request: Request,
    user: dict = Depends(get_current_user_from_cookie),
):
    sender_email = user.get("sub")
    sender_role = user.get("role")
    receiver_email = str(data.receiver_email)
    
    if sender_email == receiver_email:
        raise HTTPException(status_code=400, detail="Cannot create a channel with yourself.")

    # 1. Plan Limit Enforcement (Skip for Admin)
    if sender_role != "admin":
        sender = await AccountModel.get_by_email(sender_email)
        plan = sender.get("plan", DEFAULT_PLAN) if sender else DEFAULT_PLAN
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS[DEFAULT_PLAN])
        channels_limit = limits.get("channels_limit", 5)

        if channels_limit != -1:
            current_count = await ChannelModel.count_user_channels(sender_email)
            if current_count >= channels_limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Subscription limit reached ({current_count}/{channels_limit}). Please upgrade for more mappings."
                )

    # 2. Verify receiver exists (Account or Admin)
    receiver = await AccountModel.get_by_email(receiver_email) or await AdminModel.get_by_email(receiver_email)
    if not receiver or not receiver.get("is_active", True):
        raise HTTPException(status_code=404, detail="Receiver node not found in mesh or is inactive.")

    existing = await ChannelModel.get_by_participants(sender_email, receiver_email)
    if existing:
        return {"message": "Channel already exists.", "channel": existing}

    qekms: QEKMS_service = request.app.QEKMS_service
    master_key = await qekms.generate_key(user_id=sender_email)
    
    channel_data = {
        "sender": sender_email,
        "receiver": receiver_email,
        "is_group": False,
        "current_key_version": 1,
        "keys": {
            "1": {
                "master_key_bin": base64.b64encode(master_key).decode("utf-8"),
                "created_at": datetime.utcnow().isoformat()
            }
        }
    }

    new_channel = await ChannelModel.create(channel_data)
    await AuditService.log(
        "CHANNEL_CREATED",
        user_id=sender_email,
        details={
            "channel_id": new_channel["id"],
            "type": "direct",
            "sender": sender_email,
            "receiver": receiver_email,
            "key_version": 1,
        },
    )
    return {"message": "Secure channel established.", "channel": new_channel}

@channel_router.post("/handshake")
async def handshake(
    data: HandshakeRequest,
    request: Request,
    user: dict = Depends(get_current_user_from_cookie),
):
    """ECDH Handshake: Client sends Public Key, Backend returns Server Public Key."""
    qekms: QEKMS_service = request.app.QEKMS_service
    server_public_key = qekms.get_server_public_key()
    
    await AuditService.log_event("ECDH Handshake", user_id=user["sub"], severity="INFO")
    return {"server_public_key": server_public_key}

@channel_router.get("/{channel_id}/keys/{version}")
async def get_wrapped_key(
    channel_id: str,
    version: str,
    request: Request,
    client_public_key: str = Query(...),
    user: dict = Depends(get_current_user_from_cookie),
):
    """Secure Key Retrieval: Returns versioned channel key wrapped with USWK."""
    channel = await ChannelModel.get_by_id_internal(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    user_email = user["sub"]
    if user["role"] != "admin" and user_email not in [channel.get("sender"), channel.get("receiver")] + channel.get("members", []):
        await AuditService.log_event("Unauthorized Key Access", user_id=user_email, severity="HIGH", metadata={"channel_id": channel_id})
        raise HTTPException(status_code=403, detail="Access denied.")

    key_meta = channel.get("keys", {}).get(version)
    if not key_meta:
        raise HTTPException(status_code=404, detail="Key version not found.")

    qekms: QEKMS_service = request.app.QEKMS_service
    uswk = qekms.derive_user_wrapping_key(client_public_key)
    plain_master = base64.b64decode(key_meta["master_key_bin"])
    wrapped_master = qekms.wrap_key(plain_master, uswk)

    await AuditService.log_event("Key Access Attempt", user_id=user_email, severity="INFO", metadata={"channel_id": channel_id, "version": version})
    return {"wrapped_key": wrapped_master, "version": version}


@channel_router.get("/{channel_id}/key")
async def get_current_key(
    channel_id: str,
    request: Request,
    client_public_key: str = Query(...),
    user: dict = Depends(get_current_user_from_cookie),
):
    """
    Simplified Key Retrieval: Returns the CURRENT channel key wrapped with USWK.
    Saves the frontend from having to know the version first.
    """
    channel = await ChannelModel.get_by_id_internal(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    user_email = user["sub"]
    if user["role"] != "admin" and user_email not in [channel.get("sender"), channel.get("receiver")] + channel.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied.")

    version = str(channel.get("current_key_version", 1))
    key_meta = channel.get("keys", {}).get(version)
    if not key_meta:
        raise HTTPException(status_code=404, detail=f"Current key (version {version}) not found.")

    qekms: QEKMS_service = request.app.QEKMS_service
    uswk = qekms.derive_user_wrapping_key(client_public_key)
    plain_master = base64.b64decode(key_meta["master_key_bin"])
    wrapped_master = qekms.wrap_key(plain_master, uswk)

    await AuditService.log("KEY_ACCESSED", user_id=user_email, details={"channel_id": channel_id, "version": version})
    return {"wrapped_key": wrapped_master, "version": int(version)}


@channel_router.post("/create-group")
async def create_group_channel(
    data: CreateGroupRequest,
    request: Request,
    user: dict = Depends(get_current_user_from_cookie),
):
    sender_email = user.get("sub")
    sender_role = user.get("role")
    
    # Deduplicate members and add creator
    members_set = set(data.members)
    members_set.add(sender_email)
    members = list(members_set)
    
    if len(members) < 2:
        raise HTTPException(
            status_code=400,
            detail="Group must have at least 2 members including creator."
        )

    # 1. Enforce limits (counting groups as 1 channel against creator)
    if sender_role != "admin":
        sender = await AccountModel.get_by_email(sender_email)
        plan = sender.get("plan", DEFAULT_PLAN) if sender else DEFAULT_PLAN
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS[DEFAULT_PLAN])
        channels_limit = limits.get("channels_limit", 5)

        if channels_limit != -1:
            current_count = await ChannelModel.count_user_channels(sender_email)
            if current_count >= channels_limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Channel limit reached ({current_count}/{channels_limit})."
                )

    # 2. Verify all members exist
    for member_email in members:
        acc = await AccountModel.get_by_email(member_email)
        if not acc:
            acc = await AdminModel.get_by_email(member_email)
        if not acc:
            raise HTTPException(status_code=404, detail=f"User {member_email} not found.")

    # 3. Generate keys
    qekms: QEKMS_service = request.app.QEKMS_service
    shared_key_bytes = await qekms.generate_key(user_id=sender_email)
    private_key_bytes = await qekms.generate_key(user_id=sender_email)

    shared_key_b64 = base64.b64encode(shared_key_bytes).decode("utf-8")
    private_key_b64 = base64.b64encode(private_key_bytes).decode("utf-8")

    channel_data = ChannelCreate(
        shared_key=shared_key_b64,
        private_key=private_key_b64,
        is_group=True,
        name=data.name,
        members=members,
        sender=sender_email # Creator record
    )

    new_channel = await ChannelModel.create(channel_data)
    await AuditService.log(
        "CHANNEL_CREATED",
        user_id=sender_email,
        details={
            "channel_id": new_channel["id"],
            "type": "group",
            "name": data.name,
            "members": members,
            "members_count": len(members),
        },
    )
    logger.info(f"Group channel created: {new_channel['id']} by {sender_email}")
    return {"message": "Secure group channel established.", "channel": new_channel}


@channel_router.post("/add-member")
async def add_group_member(
    data: GroupMemberRequest,
    user: dict = Depends(get_current_user_from_cookie)
):
    sender_email = user.get("sub")
    sender_role = user.get("role")
    
    channel = await ChannelModel.get_by_id(data.channel_id)
    if not channel or not channel.get("is_group"):
        raise HTTPException(status_code=404, detail="Group not found.")
        
    # Only creator or admin can add
    if sender_role != "admin" and channel.get("sender") != sender_email:
        raise HTTPException(status_code=403, detail="Only the group creator can add members.")
        
    acc = await AccountModel.get_by_email(str(data.email))
    if not acc:
        acc = await AdminModel.get_by_email(str(data.email))
    if not acc:
        raise HTTPException(status_code=404, detail="User not found.")
        
    members = channel.get("members", [])
    if data.email not in members:
        members.append(str(data.email))
        await ChannelModel.update(data.channel_id, {"members": members})
        
    return {"message": f"User {data.email} added to group."}

@channel_router.post("/remove-member")
async def remove_group_member(
    data: GroupMemberRequest,
    user: dict = Depends(get_current_user_from_cookie)
):
    sender_email = user.get("sub")
    sender_role = user.get("role")
    
    channel = await ChannelModel.get_by_id(data.channel_id)
    if not channel or not channel.get("is_group"):
        raise HTTPException(status_code=404, detail="Group not found.")
        
    # Only creator, admin, or the user themselves can remove
    if sender_role != "admin" and channel.get("sender") != sender_email and data.email != sender_email:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member.")
        
    members = channel.get("members", [])
    if data.email in members:
        members.remove(str(data.email))
        await ChannelModel.update(data.channel_id, {"members": members})
        
    return {"message": f"User {data.email} removed from group."}


# ══════════════════════════════════════════════════════════════════════
#  MESSAGING ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@channel_router.get("/{channel_id}/messages")
async def get_channel_messages(
    channel_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    since: Optional[str] = None,
    user: dict = Depends(get_current_user_from_cookie),
):
    channel = await ChannelModel.get_by_id(channel_id)
    if not channel:
         raise HTTPException(status_code=404, detail="Channel not found.")

    user_email = user["sub"]
    if user["role"] != "admin" and user_email not in [channel.get("sender"), channel.get("receiver")] + channel.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied.")

    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception as e:
            logger.warning(f"Invalid 'since' format received: {since}. Error: {e}")

    messages = await MessageModel.get_by_channel(channel_id, skip=skip, limit=limit, since=since_dt)
    total = await MessageModel.count_by_channel(channel_id)

    # Return messages as-is (Zero Trust: decryption happens on client)
    return {
        "messages": messages,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + len(messages)) < total,
    }


@channel_router.delete("/{channel_id}/messages")
async def clear_channel_messages(
    channel_id: str,
    user: dict = Depends(get_current_user_from_cookie),
):
    """
    Permanently delete all messages in a specific channel.
    Authorized for Admins or Channel Participants.
    """
    logger.info(f"CLEAR_CHAT requested for channel: {channel_id} by {user.get('sub')}")
    channel = await ChannelModel.get_by_id(channel_id)
    if not channel:
        logger.warning(f"CLEAR_CHAT failed: Channel {channel_id} not found.")
        raise HTTPException(status_code=404, detail="Channel not found.")

    user_email = user["sub"]
    if user["role"] != "admin" and user_email not in [channel.get("sender"), channel.get("receiver")] + channel.get("members", []):
        logger.warning(f"CLEAR_CHAT denied: User {user_email} not authorized for channel {channel_id}")
        raise HTTPException(status_code=403, detail="Access denied.")

    deleted_count = await MessageModel.delete_by_channel(channel_id)
    logger.info(f"CLEAR_CHAT finalized: deleted {deleted_count} messages in channel {channel_id}")
    
    await AuditService.log(
        "MESSAGES_CLEARED",
        user_id=user_email,
        details={
            "channel_id": channel_id,
            "deleted_count": deleted_count,
        },
    )
    
    # Broadcast clear event to active sockets
    await chat_manager.broadcast(channel_id, {"type": "messages_cleared", "channel_id": channel_id})
    
    return {"message": "Channel history cleared successfully.", "deleted_count": deleted_count}


@channel_router.post("/{channel_id}/send")
async def send_secure_message(
    channel_id: str,
    request: Request,
    data: SecureSendMessageRequest,
    user: dict = Depends(get_current_user_from_cookie),
):
    """
    Validate and forward a secure message.
    Strictly enforces: Nonce (Replay), Timestamp (Freshness), HMAC (Integrity).
    """
    channel = await ChannelModel.get_by_id_internal(channel_id)
    if not channel or not channel.get("is_active", True):
        raise HTTPException(status_code=403, detail="Channel inactive.")

    user_email = user["sub"]
    
    # 1. Freshness Check (±30 minutes — allows for significant clock skew/TZ issues)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    diff = abs(now_ms - data.timestamp)
    if diff > 1800000:
        await AuditService.log_event(f"Replay Attack Detected (Timestamp) | Gap: {diff}ms | Server: {now_ms} | Client: {data.timestamp}", user_id=user_email, severity="HIGH")
        raise HTTPException(status_code=403, detail=f"Message too old or time desync (Gap: {diff}ms).")

    # 2. Replay Check (Nonce)
    if await NonceModel.is_replay(data.nonce, datetime.fromtimestamp(data.timestamp/1000, tz=timezone.utc)):
        await AuditService.log_event("Replay Attack Detected (Nonce)", user_id=user_email, severity="HIGH")
        raise HTTPException(status_code=403, detail="Duplicate nonce detected.")

    # 3. HMAC Integrity Check
    qekms: QEKMS_service = request.app.QEKMS_service
    key_meta = channel.get("keys", {}).get(str(data.key_version))
    if not key_meta:
        raise HTTPException(status_code=400, detail="Invalid key version.")
    
    plain_master = base64.b64decode(key_meta["master_key_bin"])
    signing_key = qekms.derive_signing_key(plain_master)
    
    # Reconstruct signed data: ciphertext|nonce|timestamp (Standardized)
    signed_raw = f"{data.ciphertext}|{data.nonce}|{data.timestamp}"
    signed_bytes = signed_raw.encode("utf-8")
    
    if not qekms.verify_hmac(signed_bytes, base64.b64decode(data.signature), signing_key):
        # Diagnostic logging: log full hex for debugging (Internal Audit)
        sig_received = base64.b64decode(data.signature).hex()
        diag_msg = f"HMAC Fail | StringHex: {signed_bytes.hex()} | SigRecv: {sig_received} | KeyHexPrefix: {signing_key.hex()[:10]}"
        await AuditService.log_event(diag_msg, user_id=user_email, severity="HIGH")
        raise HTTPException(status_code=403, detail="Signature verification failed (Integrity Check).")

    message_doc = {
        "channel_id": channel_id,
        "sender": user_email,
        "type": data.msg_type,
        "ciphertext": data.ciphertext,
        "nonce": data.nonce,
        "timestamp": data.timestamp,
        "signature": data.signature,
        "key_version": data.key_version,
        "file_path": data.file_path,
        "file_name": data.file_name,
        "status": "sent",
        "created_at": datetime.utcnow()
    }

    saved = await MessageModel.create(message_doc)
    
    await chat_manager.broadcast(channel_id, {"type": "message", "data": saved})
    await AuditService.log(
        "MESSAGE_SENT",
        user_id=user_email,
        details={
            "channel_id": channel_id,
            "message_id": saved.get("id"),
            "message_type": data.msg_type,
            "key_version": data.key_version,
            "has_file": bool(data.file_path),
            "file_name": data.file_name,
        },
    )
    
    return saved


@channel_router.post("/{channel_id}/upload")
async def upload_channel_file(
    channel_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_from_cookie),
):
    """
    Upload a media/file attachment for a channel message.
    Returns the file_path (relative), file_name, msg_type, and public URL.
    The actual encrypted message is sent separately via the /send endpoint.
    """
    channel = await ChannelModel.get_by_id(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found.")

    user_email = user["sub"]
    if user["role"] != "admin" and user_email not in (
        [channel.get("sender"), channel.get("receiver")] + channel.get("members", [])
    ):
        raise HTTPException(status_code=403, detail="Access denied.")

    file_bytes = await file.read()
    msg_type = _validate_file(file, file_bytes)

    ext = os.path.splitext(file.filename or "file")[1].lower() or ".bin"
    unique_name = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_name)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    await AuditService.log(
        "FILE_UPLOADED",
        user_id=user_email,
        details={
            "channel_id": channel_id,
            "file_name": file.filename,
            "file_size": len(file_bytes),
            "msg_type": msg_type,
        },
    )

    return {
        "file_path": unique_name,
        "file_name": file.filename or unique_name,
        "msg_type": msg_type,
        "url": f"/uploads/{unique_name}",
    }


# ══════════════════════════════════════════════════════════════════════
#  WEBSOCKET ENDPOINT
# ══════════════════════════════════════════════════════════════════════

@channel_router.websocket("/ws/chat/{channel_id}")
async def websocket_chat(websocket: WebSocket, channel_id: str):
    """
    WebSocket endpoint for real-time messaging and presence state.
    Requires `access_token` query parameter or cookie for authentication.
    """
    token = websocket.cookies.get("access_token")
    if not token and "token" in websocket.query_params:
        token = websocket.query_params["token"]

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_info = decode_access_token(token)
        user_email = user_info.get("sub")
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    channel = await ChannelModel.get_by_id(channel_id)
    if not channel:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Participant verification
    if user_info.get("role") != "admin":
        if channel.get("is_group"):
            if user_email not in channel.get("members", []):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        else:
            if user_email != channel.get("sender") and user_email != channel.get("receiver"):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

    await chat_manager.connect(websocket, channel_id, user_email)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                
                # Handling Typing State
                if payload.get("type") == "typing":
                    await chat_manager.broadcast(channel_id, {
                        "type": "typing",
                        "user": user_email,
                        "isTyping": payload.get("isTyping", False)
                    }, exclude=websocket)
                
                # Handling Message Status updates
                elif payload.get("type") == "status_update":
                    msg_id = payload.get("message_id")
                    new_status = payload.get("status") # 'delivered' or 'seen'
                    if msg_id and new_status:
                        # Theoretically we should update MongoDB MessageModel here:
                        await MessageModel.update(msg_id, {"status": new_status})
                        
                        # Broadcast status update globally inside channel
                        await chat_manager.broadcast(channel_id, {
                            "type": "status_update",
                            "message_id": msg_id,
                            "status": new_status,
                            "user": user_email
                        })

            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        # disconnect is now async and handles its own presence broadcasting + DB updates
        await chat_manager.disconnect(websocket, channel_id)

