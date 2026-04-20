import asyncio
from typing import Dict, List
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder

from datetime import datetime, timezone
from src.models.AccountModel import AccountModel
from src.models.AdminModel import AdminModel

class ConnectionManager:
    def __init__(self):
        # channel_id -> list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # websocket -> email mapping for presence tracking
        self.ws_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, channel_id: str, email: str):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
        self.ws_to_user[websocket] = email
        
        # Broadcast presence join to others in channel
        await self.broadcast(channel_id, {
            "type": "presence",
            "user": email,
            "status": "online"
        }, exclude=websocket)

    async def disconnect(self, websocket: WebSocket, channel_id: str):
        """Handle disconnection, update last_seen, and notify others."""
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
        
        email = self.ws_to_user.pop(websocket, None)
        if email:
            now = datetime.now(timezone.utc)
            # Update DB
            user = await AccountModel.get_by_email(email)
            if user:
                await AccountModel.update(user["id"], {"last_seen": now})
            else:
                admin = await AdminModel.get_by_email(email)
                if admin:
                    await AdminModel.update(admin["id"], {"last_seen": now})
            
            # Broadcast offline status
            await self.broadcast(channel_id, {
                "type": "presence",
                "user": email,
                "status": "offline",
                "last_seen": now.isoformat()
            })
        
        return email

    async def broadcast(self, channel_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast a message to all connections in a channel concurrently."""
        if channel_id not in self.active_connections:
            return
        
        # Sanitize message (converts datetime objects, etc. to JSON-serializable types)
        sanitized_message = jsonable_encoder(message)
        
        connections = [c for c in self.active_connections[channel_id] if c != exclude]
        if not connections:
            return

        async def _safe_send(conn: WebSocket):
            try:
                await conn.send_json(sanitized_message)
            except Exception:
                await self.disconnect(conn, channel_id)

        # Performance: Use asyncio.gather for concurrent broadcasting
        await asyncio.gather(*[_safe_send(c) for c in connections], return_exceptions=True)

    def is_user_online(self, email: str) -> bool:
        """Check if a specific user email is currently connected to ANY channel."""
        return email in self.ws_to_user.values()

chat_manager = ConnectionManager()
