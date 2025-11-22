"""
Health check endpoint
Lightweight status checks using cached initialization data
"""

from fastapi import APIRouter
from src.api.dependencies import app_state

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """
    Lightweight health check endpoint
    Returns cached initialization status without heavy operations
    
    No document counts, no generator calls, no active session enumeration
    """
    # Get cached initialization status
    init_status = app_state.get_initialization_status()
    
    # Determine overall status
    if all([
        init_status["rag"],
        init_status["flashcard_generator"],
        init_status["mcq_generator"],
        init_status["insights_generator"],
        init_status["chat_service"]
    ]):
        status = "healthy"
    elif any([
        init_status["rag"],
        init_status["chat_service"]
    ]):
        status = "degraded"
    else:
        status = "unhealthy"
    
    return {
        "status": status,
        "api": {
            "status": "running",
            "uptime_seconds": app_state.get_uptime_seconds()
        },
        "components": {
            "rag": {"initialized": init_status["rag"]},
            "generators": {
                "flashcard": init_status["flashcard_generator"],
                "mcq": init_status["mcq_generator"],
                "insights": init_status["insights_generator"]
            },
            "chat_service": {"initialized": init_status["chat_service"]}
        },
        "errors": init_status["errors"] if init_status["errors"] else None
    }

