"""
FastAPI server for facial processing subsystem
Provides REST API and WebSocket endpoints for middleware integration
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import cv2
import numpy as np
import asyncio
import logging
from datetime import datetime
import uuid

from ..core import FacialProcessor, ProcessingResult, get_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Facial Processing API", version="1.0.0")

# Global processor instance
config = get_config()
processor = FacialProcessor(config)

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


# Request/Response models
class ProcessImageRequest(BaseModel):
    """Request to process an image"""
    session_id: str
    frame_id: Optional[str] = None
    image_base64: Optional[str] = None


class ProcessImageResponse(BaseModel):
    """Response from image processing"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    uptime_seconds: float
    frames_processed: int


class SessionStartRequest(BaseModel):
    """Request to start a session"""
    session_id: str


# Server state
server_start_time = datetime.now()
total_frames_processed = 0


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Facial Processing API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    uptime = (datetime.now() - server_start_time).total_seconds()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime_seconds=uptime,
        frames_processed=total_frames_processed
    )


@app.post("/api/session/start")
async def start_session(request: SessionStartRequest):
    """Start a new processing session"""
    try:
        processor.start_session(request.session_id)
        logger.info(f"Started session: {request.session_id}")
        return {"success": True, "session_id": request.session_id}
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process", response_model=ProcessImageResponse)
async def process_image(file: UploadFile = File(...), session_id: str = None):
    """
    Process an uploaded image file

    Args:
        file: Image file (JPEG/PNG)
        session_id: Session identifier

    Returns:
        ProcessImageResponse with results
    """
    global total_frames_processed

    try:
        # Validate session_id
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id required")

        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Process frame
        frame_id = str(uuid.uuid4())
        result = processor.process_frame(image, session_id, frame_id)

        # Update metrics
        total_frames_processed += 1

        # Send to connected WebSocket clients
        await broadcast_result(session_id, result)

        # Return response
        return ProcessImageResponse(
            success=True,
            result=processor.to_json(result)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return ProcessImageResponse(
            success=False,
            error=str(e)
        )


@app.websocket("/ws/facial/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time updates

    Args:
        session_id: Session identifier
    """
    await websocket.accept()
    active_connections[session_id] = websocket

    logger.info(f"WebSocket connected for session: {session_id}")

    try:
        while True:
            # Keep connection alive and receive messages
            data = await websocket.receive_text()

            # Echo back (can be used for ping/pong)
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session: {session_id}")
        if session_id in active_connections:
            del active_connections[session_id]
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if session_id in active_connections:
            del active_connections[session_id]


async def broadcast_result(session_id: str, result: ProcessingResult):
    """Broadcast processing result to connected WebSocket clients"""
    if session_id in active_connections:
        try:
            websocket = active_connections[session_id]
            result_json = processor.to_json(result)
            await websocket.send_json(result_json)
        except Exception as e:
            logger.error(f"Error broadcasting result: {e}")


@app.get("/api/metrics")
async def get_metrics():
    """Get system metrics"""
    uptime = (datetime.now() - server_start_time).total_seconds()

    return {
        "uptime_seconds": uptime,
        "total_frames_processed": total_frames_processed,
        "active_sessions": len(active_connections),
        "config": {
            "max_latency_ms": config.max_latency_ms,
            "min_landmark_confidence": config.min_landmark_confidence,
            "emotion_confidence_threshold": config.emotion_confidence_threshold
        }
    }


@app.get("/api/config")
async def get_configuration():
    """Get current configuration"""
    return {
        "target_image_size": config.target_image_size,
        "max_latency_ms": config.max_latency_ms,
        "min_landmark_confidence": config.min_landmark_confidence,
        "emotion_confidence_threshold": config.emotion_confidence_threshold,
        "emotion_classes": list(config.emotion_classes),
        "api_port": config.api_port,
        "middleware_url": config.middleware_url
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting Facial Processing API on {config.api_host}:{config.api_port}")
    uvicorn.run(
        app,
        host=config.api_host,
        port=config.api_port,
        log_level="info"
    )
