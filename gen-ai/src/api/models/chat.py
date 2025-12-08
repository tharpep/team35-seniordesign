"""
Pydantic models for chat endpoints
"""

from pydantic import BaseModel
from typing import Optional, Dict, List, Any


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str
    session_id: Optional[str] = None  # Optional - defaults to global session
    session_context: Optional[Dict[str, Any]] = None  # Session context: session_id, session_title


class TimingBreakdown(BaseModel):
    """Timing breakdown for chat response"""
    rag_search: float
    summary_generation: float
    llm_call: float
    total: float


class RAGResult(BaseModel):
    """Single RAG search result"""
    text: str
    score: float


class RAGInfo(BaseModel):
    """RAG search information"""
    results_count: int
    results: List[RAGResult]


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    answer: str
    session_id: str
    response_time: float
    conversation_length: int
    timings: TimingBreakdown
    rag_info: RAGInfo


class SessionClearResponse(BaseModel):
    """Response model for session clear endpoint"""
    success: bool
    message: str
    session_id: str


class ErrorResponse(BaseModel):
    """Standardized error response"""
    error: str
    code: str
    details: dict = {}

