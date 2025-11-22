"""
Chat endpoint with session management
Single global session for initial implementation
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from src.api.models.chat import ChatRequest, ChatResponse, SessionClearResponse
from src.llm_chat.chat_service import ChatService
from src.api.dependencies import get_chat_service
from logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Process chat message with conversation context
    
    Single global session (session_id parameter optional, defaults to global)
    Returns answer with response time and conversation length
    """
    session_id = request.session_id or "global"
    logger.info(f"Chat request: session_id='{session_id}', message_length={len(request.message)}")
    
    try:
        # Run sync chat in thread pool
        result = await asyncio.to_thread(
            chat_service.chat,
            request.message
        )
        
        logger.info(f"Chat response generated: response_time={result['response_time']:.2f}s, length={result['conversation_length']}")
        
        return ChatResponse(
            answer=result["answer"],
            session_id=result["session_id"],
            response_time=result["response_time"],
            conversation_length=result["conversation_length"],
            timings=result["timings"],
            rag_info=result["rag_info"]
        )
        
    except Exception as e:
        # Log full error with traceback for debugging
        import traceback
        logger.error(f"Chat error: {e}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "code": "CHAT_ERROR",
                "details": {
                    "session_id": session_id,
                    "exception_type": type(e).__name__
                }
            }
        )


@router.delete("/session/{session_id}", response_model=SessionClearResponse)
async def clear_session(
    session_id: str = "global",
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Clear a chat session (single global session for now)
    
    Path parameter session_id is optional (defaults to global session)
    """
    logger.info(f"Clearing session: session_id='{session_id}'")
    
    try:
        # Clear global session
        await asyncio.to_thread(chat_service.clear_session)
        
        logger.info(f"Session cleared: session_id='{session_id}'")
        
        return SessionClearResponse(
            success=True,
            message="Session cleared successfully",
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Session clear error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "code": "SESSION_CLEAR_ERROR",
                "details": {"session_id": session_id}
            }
        )

