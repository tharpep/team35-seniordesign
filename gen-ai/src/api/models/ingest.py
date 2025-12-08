"""
Ingestion API models
Pydantic models for session-based document ingestion
"""

from pydantic import BaseModel


class SessionFileIngestRequest(BaseModel):
    """Request model for session file ingestion"""
    session_id: str
    file_path: str


class IngestionResponse(BaseModel):
    """Response model for ingestion operations"""
    status: str
    message: str
    session_id: str = None
    file_path: str = None
    chunks_indexed: int = None

