"""
FastAPI main application
Artifact generation and chat API with startup/shutdown lifecycle
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.api.dependencies import initialize_app, shutdown_app
from src.api.routes import health, artifacts, chat, ingest
from logging_config import setup_logging, get_logger

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("=== FastAPI Application Starting ===")
    await initialize_app()
    logger.info("=== FastAPI Application Ready ===")
    
    yield
    
    # Shutdown
    logger.info("=== FastAPI Application Shutting Down ===")
    await shutdown_app()
    logger.info("=== FastAPI Application Stopped ===")


# Create FastAPI app
app = FastAPI(
    title="GenAI Artifact & Chat API",
    description="API for generating educational artifacts (flashcards, MCQ, insights) and context-aware chat",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS middleware
# Allow requests from frontend (Vite dev server on 5173) and backend (port 8001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server (React frontend)
        "http://localhost:3000",  # Alternative frontend port
        "http://localhost:8001",  # Node.js backend
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Include routers
app.include_router(health.router)
app.include_router(artifacts.router)
app.include_router(chat.router)
app.include_router(ingest.router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "GenAI Artifact & Chat API",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health",
            "artifacts": {
                "flashcards": "POST /api/flashcards",
                "mcq": "POST /api/mcq",
                "insights": "POST /api/insights"
            },
            "chat": {
                "message": "POST /api/chat",
                "clear_session": "DELETE /api/chat/session/{session_id}"
            },
            "ingestion": {
                "session_file": "POST /api/ingest/session_file",
                "delete_session": "DELETE /api/ingest/session/{session_id}"
            }
        },
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    # Let FastAPI handle HTTPException (it has its own handler)
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        raise exc
    
    # Log the actual error with full traceback
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Return error with actual message for debugging
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc) or "Internal server error",
            "code": "INTERNAL_ERROR",
            "details": {
                "exception_type": type(exc).__name__,
                "path": str(request.url.path) if hasattr(request, 'url') else "unknown"
            }
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )

