"""
Simple Configuration Management
Basic settings for RAG system testing and operation
"""

import os
from dataclasses import dataclass


@dataclass
class RAGConfig:
    """Simple configuration for RAG system"""
    
    # Hardware settings
    use_laptop: bool = True  # True for laptop (llama3.2:1b), False for PC (qwen3:8b)
    
    # AI Provider settings
    use_ollama: bool = False  # True for Ollama (local), False for Purdue API
    
    # Vector store settings
    use_persistent: bool = True  # True for persistent storage, False for in-memory only
    collection_name: str = "persistant_docs"  # Name for Qdrant collection
    clear_on_ingest: bool = True  # Clear collection before ingesting new documents
    
    # Retrieval settings
    top_k: int = 5  # Number of documents to retrieve (increased for better context)
    similarity_threshold: float = 0.7  # Minimum similarity score (0.0-1.0)
    
    # Generation settings
    max_tokens: int = 500  # Maximum tokens in response (optimal for artifact generation)
    max_chat_tokens: int = 150  # Maximum tokens for chatbot responses
    temperature: float = 0.4  # Creativity level (lower for more focused JSON generation)
    
    # Chat session settings
    max_history_size: int = 10  # Maximum number of conversation exchanges to keep in memory
    summary_interval: int = 5  # Regenerate summary every N messages when at history limit
    
    @property
    def model_name(self) -> str:
        """Get model name based on hardware and provider configuration"""
        if self.use_ollama:
            return "llama3.2:1b" if self.use_laptop else "qwen3:8b"
        else:
            return "mistral:latest"  # Balanced speed and accuracy


# Default configurations
DEFAULT_RAG_CONFIG = RAGConfig()


def get_rag_config() -> RAGConfig:
    """Get RAG configuration with environment variable overrides
    
    Environment variables that can be set:
        - USE_LAPTOP: "true" or "false" (laptop=llama3.2:1b, PC=qwen3:8b)
    - USE_OLLAMA: "true" or "false" (use Ollama vs Purdue API)
    - USE_PERSISTENT: "true" or "false" (persistent vs in-memory storage)
    - COLLECTION_NAME: name for Qdrant collection
    """
    config = RAGConfig()
    
    # Override with environment variables if set
    use_laptop_env = os.getenv("USE_LAPTOP")
    if use_laptop_env:
        config.use_laptop = use_laptop_env.lower() == "true"
    
    use_ollama_env = os.getenv("USE_OLLAMA")
    if use_ollama_env:
        config.use_ollama = use_ollama_env.lower() == "true"
    
    use_persistent_env = os.getenv("USE_PERSISTENT")
    if use_persistent_env:
        config.use_persistent = use_persistent_env.lower() == "true"
    
    collection_name_env = os.getenv("COLLECTION_NAME")
    if collection_name_env:
        config.collection_name = collection_name_env
    
    return config

