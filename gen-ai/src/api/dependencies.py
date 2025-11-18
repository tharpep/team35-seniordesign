"""
FastAPI dependency injection
Manages shared instances of RAG, generators, and chat service
"""

import os
import sys
import time
from typing import Optional

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.rag.rag_setup import BasicRAG
from src.rag.vector_store import VectorStore
from src.artifact_creation.generators.flashcard_generator import FlashcardGenerator
from src.artifact_creation.generators.mcq_generator import MCQGenerator
from src.artifact_creation.generators.insights_generator import InsightsGenerator
from src.llm_chat.chat_service import ChatService
from config import get_rag_config
from logging_config import get_logger

logger = get_logger(__name__)


class AppState:
    """
    Application state container for shared instances
    Initialized at startup and shared across all requests
    """
    
    def __init__(self):
        # Initialization status
        self.initialized = False
        self.startup_time: Optional[float] = None
        self.initialization_errors = {}
        
        # Shared Qdrant client (single instance to avoid database locks)
        self.shared_vector_store: Optional[VectorStore] = None
        
        # Heavy components (initialized at startup)
        self.rag_system: Optional[BasicRAG] = None
        self.flashcard_generator: Optional[FlashcardGenerator] = None
        self.mcq_generator: Optional[MCQGenerator] = None
        self.insights_generator: Optional[InsightsGenerator] = None
        self.chat_service: Optional[ChatService] = None
        
        # System prompt (loaded at startup)
        self.system_prompt: Optional[str] = None
    
    def get_uptime_seconds(self) -> float:
        """Get API uptime in seconds"""
        if self.startup_time is not None:
            return time.time() - self.startup_time
        return 0.0
    
    def get_initialization_status(self) -> dict:
        """
        Get lightweight initialization status (cached, no runtime checks)
        """
        return {
            "rag": self.rag_system is not None,
            "flashcard_generator": self.flashcard_generator is not None,
            "mcq_generator": self.mcq_generator is not None,
            "insights_generator": self.insights_generator is not None,
            "chat_service": self.chat_service is not None,
            "errors": self.initialization_errors
        }


# Global app state instance
app_state = AppState()


async def initialize_app():
    """
    Initialize application components at startup
    Heavy components are initialized once and reused
    """
    logger.info("Starting application initialization...")
    app_state.startup_time = time.time()
    
    # Create shared VectorStore instance to avoid Qdrant database lock conflicts
    try:
        config = get_rag_config()
        logger.info("Creating shared Qdrant client...")
        app_state.shared_vector_store = VectorStore(use_persistent=config.use_persistent)
        logger.info("Shared Qdrant client created")
    except Exception as e:
        logger.error(f"Failed to create shared VectorStore: {e}")
        app_state.initialization_errors["vector_store"] = str(e)
        # Continue without shared store (will create separate instances)
        app_state.shared_vector_store = None
    
    try:
        # Initialize RAG system for artifacts (using shared vector store)
        logger.info("Initializing RAG system...")
        app_state.rag_system = BasicRAG(
            collection_name="persistant_docs",
            vector_store=app_state.shared_vector_store
        )
        logger.info("RAG system initialized")
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        app_state.initialization_errors["rag"] = str(e)
    
    try:
        # Load system prompt from prompts directory
        logger.info("Loading system prompt...")
        from src.utils.prompt_loader import load_prompt
        fallback = "You are a helpful AI assistant."
        app_state.system_prompt = load_prompt("chat_system_prompt.md", fallback=fallback)
        if app_state.system_prompt:
            logger.info("System prompt loaded from prompts directory")
        else:
            logger.warning("Using fallback system prompt")
            app_state.system_prompt = fallback
    except Exception as e:
        logger.error(f"Failed to load system prompt: {e}")
        app_state.initialization_errors["system_prompt"] = str(e)
        app_state.system_prompt = "You are a helpful AI assistant."
    
    try:
        # Initialize artifact generators
        if app_state.rag_system:
            logger.info("Initializing artifact generators...")
            app_state.flashcard_generator = FlashcardGenerator(app_state.rag_system)
            app_state.mcq_generator = MCQGenerator(app_state.rag_system)
            app_state.insights_generator = InsightsGenerator(app_state.rag_system)
            logger.info("Artifact generators initialized")
        else:
            logger.warning("Skipping generator initialization (RAG system not available)")
    except Exception as e:
        logger.error(f"Failed to initialize generators: {e}")
        app_state.initialization_errors["generators"] = str(e)
    
    try:
        # Initialize chat service (using shared RAG system for persistant_docs)
        logger.info("Initializing chat service...")
        app_state.chat_service = ChatService(
            system_prompt=app_state.system_prompt,
            vector_store=app_state.shared_vector_store,
            rag_system=app_state.rag_system  # Pass shared RAG system
        )
        logger.info("Chat service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize chat service: {e}")
        app_state.initialization_errors["chat_service"] = str(e)
    
    app_state.initialized = True
    logger.info(f"Application initialization completed in {time.time() - app_state.startup_time:.2f}s")


async def shutdown_app():
    """Cleanup on application shutdown"""
    logger.info("Starting application shutdown...")
    
    try:
        # Clear chat session
        if app_state.chat_service:
            try:
                app_state.chat_service.clear_session()
                logger.info("Chat session cleared")
            except Exception as e:
                logger.warning(f"Error clearing chat session during shutdown: {e}")
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}")
    
    logger.info("Application shutdown completed")


# Dependency functions for FastAPI

def get_rag_system() -> BasicRAG:
    """Get shared RAG system instance"""
    if not app_state.rag_system:
        raise RuntimeError("RAG system not initialized")
    return app_state.rag_system


def get_flashcard_generator() -> FlashcardGenerator:
    """Get shared flashcard generator instance"""
    if not app_state.flashcard_generator:
        raise RuntimeError("Flashcard generator not initialized")
    return app_state.flashcard_generator


def get_mcq_generator() -> MCQGenerator:
    """Get shared MCQ generator instance"""
    if not app_state.mcq_generator:
        raise RuntimeError("MCQ generator not initialized")
    return app_state.mcq_generator


def get_insights_generator() -> InsightsGenerator:
    """Get shared insights generator instance"""
    if not app_state.insights_generator:
        raise RuntimeError("Insights generator not initialized")
    return app_state.insights_generator


def get_chat_service() -> ChatService:
    """Get shared chat service instance"""
    if not app_state.chat_service:
        raise RuntimeError("Chat service not initialized")
    return app_state.chat_service

