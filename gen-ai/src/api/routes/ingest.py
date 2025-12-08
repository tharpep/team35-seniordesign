"""
Ingestion API endpoints
Handles session-based document ingestion with background tasks
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pathlib import Path
from src.api.models.ingest import SessionFileIngestRequest, IngestionResponse
from src.rag.document_ingester import DocumentIngester
from src.rag.rag_setup import BasicRAG
from src.rag.vector_store import VectorStore
from src.api.dependencies import app_state
from config import get_rag_config
from logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


def _ingest_session_file_task(session_id: str, file_path: str):
    """
    Background task to ingest a file into a session collection
    
    Args:
        session_id: Session ID
        file_path: Relative path to file from gen-ai directory
    """
    try:
        logger.info(f"[Ingestion Task] Starting ingestion for session {session_id}, file: {file_path}")
        
        # Resolve absolute path
        gen_ai_root = Path(__file__).parent.parent.parent.parent
        absolute_file_path = gen_ai_root / file_path
        
        if not absolute_file_path.exists():
            logger.error(f"[Ingestion Task] File not found: {absolute_file_path}")
            return
        
        # Determine collection name
        collection_name = f"session_docs_{session_id}"
        
        # Get or create RAG system for this session collection
        config = get_rag_config()
        vector_store = app_state.shared_vector_store or VectorStore(use_persistent=config.use_persistent)
        
        # Create RAG instance for this session (will create collection if needed)
        session_rag = BasicRAG(
            config=config,
            collection_name=collection_name,
            use_persistent=config.use_persistent,
            vector_store=vector_store
        )
        
        # Create ingester with session RAG
        ingester = DocumentIngester(session_rag)
        
        # Ingest the file
        result = ingester.ingest_file(str(absolute_file_path))
        
        if result.get("success"):
            logger.info(f"[Ingestion Task] Successfully ingested {result['chunks']} chunks for session {session_id}")
        else:
            logger.error(f"[Ingestion Task] Ingestion failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"[Ingestion Task] Error during ingestion: {e}", exc_info=True)


@router.post("/session_file", response_model=IngestionResponse)
async def ingest_session_file(
    request: SessionFileIngestRequest,
    background_tasks: BackgroundTasks
):
    """
    Queue a file for ingestion into a session collection
    
    Returns immediately after queuing the background task
    """
    logger.info(f"Queueing ingestion: session_id={request.session_id}, file_path={request.file_path}")
    
    # Validate file path
    gen_ai_root = Path(__file__).parent.parent.parent.parent
    absolute_file_path = gen_ai_root / request.file_path
    
    if not absolute_file_path.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "error": "File not found",
                "file_path": request.file_path,
                "absolute_path": str(absolute_file_path)
            }
        )
    
    # Add background task
    background_tasks.add_task(
        _ingest_session_file_task,
        request.session_id,
        request.file_path
    )
    
    return IngestionResponse(
        status="queued",
        message="File queued for ingestion",
        session_id=request.session_id,
        file_path=request.file_path
    )


@router.delete("/session/{session_id}", response_model=IngestionResponse)
async def delete_session_collection(session_id: str):
    """
    Delete a session's Qdrant collection
    
    This is called when a session is deleted to clean up vector storage
    """
    logger.info(f"Deleting collection for session: {session_id}")
    
    try:
        collection_name = f"session_docs_{session_id}"
        config = get_rag_config()
        vector_store = app_state.shared_vector_store or VectorStore(use_persistent=config.use_persistent)
        
        # Check if collection exists
        try:
            vector_store.client.get_collection(collection_name)
            # Collection exists, delete it
            vector_store.client.delete_collection(collection_name)
            logger.info(f"Deleted collection: {collection_name}")
            
            return IngestionResponse(
                status="success",
                message=f"Collection {collection_name} deleted",
                session_id=session_id
            )
        except Exception as e:
            # Collection doesn't exist or already deleted
            logger.info(f"Collection {collection_name} does not exist or already deleted")
            return IngestionResponse(
                status="not_found",
                message=f"Collection {collection_name} not found",
                session_id=session_id
            )
            
    except Exception as e:
        logger.error(f"Error deleting collection for session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to delete collection",
                "session_id": session_id,
                "message": str(e)
            }
        )

