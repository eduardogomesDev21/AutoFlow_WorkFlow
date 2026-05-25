from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps workflow_id (as string) to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, workflow_id: str, websocket: WebSocket):
        await websocket.accept()
        if workflow_id not in self.active_connections:
            self.active_connections[workflow_id] = []
        self.active_connections[workflow_id].append(websocket)

    def disconnect(self, workflow_id: str, websocket: WebSocket):
        if workflow_id in self.active_connections:
            if websocket in self.active_connections[workflow_id]:
                self.active_connections[workflow_id].remove(websocket)
            if not self.active_connections[workflow_id]:
                del self.active_connections[workflow_id]

    async def send_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_workflow(self, workflow_id: str, message: dict):
        # Convert workflow_id to string to avoid key mismatch if passed as integer
        wf_key = str(workflow_id)
        if wf_key in self.active_connections:
            # We copy list to prevent modifying while iterating if connection drops
            connections = list(self.active_connections[wf_key])
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Clean up broken connection
                    self.disconnect(wf_key, connection)

manager = ConnectionManager()
