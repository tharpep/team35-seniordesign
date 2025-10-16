"""
Simple Logging Configuration
Centralized logging setup for the entire codebase
"""

import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path
from typing import Optional


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "./logs",
    enable_file_logging: bool = True,
    enable_console_logging: bool = True
) -> None:
    """
    Setup simple logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files
        enable_file_logging: Whether to log to files
        enable_console_logging: Whether to log to console
    """
    
    # Create log directory
    if enable_file_logging:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(levelname)s | %(message)s'
    )
    
    # Console handler
    if enable_console_logging:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(simple_formatter)
        # Set encoding for console output
        if hasattr(console_handler.stream, 'reconfigure'):
            try:
                console_handler.stream.reconfigure(encoding='utf-8', errors='replace')
            except:
                pass  # Fallback if reconfigure is not available
        root_logger.addHandler(console_handler)
    
    # File handlers
    if enable_file_logging:
        # RAG demo log (with simple rotation)
        rag_log_file = os.path.join(log_dir, "rag", "rag_results.log")
        Path(os.path.dirname(rag_log_file)).mkdir(parents=True, exist_ok=True)
        rag_handler = logging.handlers.RotatingFileHandler(
            rag_log_file, maxBytes=1024*1024, backupCount=3, encoding='utf-8'  # 1MB max, keep 3 backups
        )
        rag_handler.setLevel(logging.INFO)
        rag_handler.setFormatter(detailed_formatter)
        
        # Create RAG logger
        rag_logger = logging.getLogger("rag_demo")
        rag_logger.addHandler(rag_handler)
        rag_logger.setLevel(logging.INFO)
        rag_logger.propagate = False  # Don't propagate to root logger
        


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


def get_rag_logger() -> logging.Logger:
    """Get the RAG demo logger"""
    return logging.getLogger("rag_demo")




def log_rag_result(
    question: str,
    answer: str,
    response_time: float,
    model_name: str,
    provider: str,
    context_docs: list = None,
    context_scores: list = None,
    retrieval_time: float = 0.0,
    generation_time: float = 0.0
) -> None:
    """
    Log RAG demo results with retrieved context
    
    Args:
        question: The question asked
        answer: The answer generated
        response_time: Total response time in seconds
        model_name: Model used for generation
        provider: Provider used (ollama, purdue, etc.)
        context_docs: List of retrieved document texts
        context_scores: List of relevance scores for retrieved documents
        retrieval_time: Time spent on retrieval
        generation_time: Time spent on generation
    """
    rag_logger = get_rag_logger()
    
    # Simple log format with wrapped answers
    import textwrap
    wrapped_answer = textwrap.fill(answer, width=80, initial_indent="    ", subsequent_indent="    ")
    rag_logger.info(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | {model_name} | {response_time:.2f}s | Q: {question[:100]}...")
    rag_logger.info(f"A: {wrapped_answer}")
    
    # Log retrieved context details (show what was found, not full content)
    if context_docs and context_scores:
        rag_logger.info(f"CONTEXT: Retrieved {len(context_docs)} documents")
        for i, (doc, score) in enumerate(zip(context_docs, context_scores)):
            # Show first 100 chars to see what type of content was retrieved
            doc_preview = doc[:100] + "..." if len(doc) > 100 else doc
            # Handle Unicode characters by encoding to ASCII with replacement
            try:
                doc_preview_safe = doc_preview.encode('ascii', 'replace').decode('ascii')
            except:
                doc_preview_safe = doc_preview
            rag_logger.info(f"  Doc {i+1} (score: {score:.3f}): {doc_preview_safe}")
    elif context_docs:
        rag_logger.info(f"CONTEXT: Retrieved {len(context_docs)} documents (no scores)")
        for i, doc in enumerate(context_docs):
            doc_preview = doc[:100] + "..." if len(doc) > 100 else doc
            # Handle Unicode characters by encoding to ASCII with replacement
            try:
                doc_preview_safe = doc_preview.encode('ascii', 'replace').decode('ascii')
            except:
                doc_preview_safe = doc_preview
            rag_logger.info(f"  Doc {i+1}: {doc_preview_safe}")






# Initialize logging when module is imported
if __name__ != "__main__":
    # Only setup logging if not being run directly
    setup_logging()
