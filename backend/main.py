from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import time
from typing import List
from inference import InferenceEngine
from simulator import CSISimulator

app = FastAPI(
    title="WiFi Radar",
    description="Real-time human sensing using WiFi CSI",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize inference engine and simulator
inference_engine = InferenceEngine(device='cpu')
simulator = CSISimulator()

# Global state
history: List[dict] = []
MAX_HISTORY = 500


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/api/stats")
async def get_stats():
    """
    Get aggregate statistics from history.
    """
    stats = inference_engine.get_statistics()
    return {
        "stats": stats,
        "historySize": len(history),
        "timestamp": time.time(),
    }


@app.get("/api/history")
async def get_history(limit: int = 100):
    """
    Get recent history (last N frames).
    """
    return {
        "data": history[-limit:],
        "count": len(history[-limit:]),
        "timestamp": time.time(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming CSI predictions.
    
    Clients connect here to receive real-time predictions.
    Updates at ~10 Hz.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Generate next CSI frame (from simulator)
            csi_data = simulator.next_frame()
            csi_amplitude = csi_data.pop('amplitude')  # Remove numpy array
            
            # Run inference
            prediction = inference_engine.predict(csi_amplitude)
            
            # Combine CSI metadata with prediction
            result = {**csi_data, **prediction, "timestamp": time.time()}
            
            # Store in history
            history.append(result)
            if len(history) > MAX_HISTORY:
                history.pop(0)
            
            # Send to all connected clients
            await manager.broadcast(json.dumps(result))
            
            # Update rate: 10 Hz
            await asyncio.sleep(0.1)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("WiFi Radar Backend")
    print("="*60)
    print("FastAPI running on http://localhost:8000")
    print("WebSocket available at ws://localhost:8000/ws")
    print("API docs at http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
