import asyncio
from typing import Dict, List
from fastapi import WebSocket

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

    def disconnect(self, websocket: WebSocket, channel_id: str):
        if channel_id in self.active_connections:
            if websocket in self.active_connections[channel_id]:
                self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
        
        return self.ws_to_user.pop(websocket, None)

    async def broadcast(self, channel_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast a message to all connections in a channel concurrently."""
        if channel_id not in self.active_connections:
            return
        
        connections = [c for c in self.active_connections[channel_id] if c != exclude]
        if not connections:
            return

        async def _safe_send(conn: WebSocket):
            try:
                await conn.send_json(message)
            except Exception:
                self.disconnect(conn, channel_id)

        # Performance: Use asyncio.gather for concurrent broadcasting
        await asyncio.gather(*[_safe_send(c) for c in connections], return_exceptions=True)

chat_manager = ConnectionManager()
