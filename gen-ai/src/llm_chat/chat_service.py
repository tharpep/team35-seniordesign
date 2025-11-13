"""
Production chat service with performance optimizations
Extracted from context_llm_demo.py with cached summary for improved latency
"""

import os
import sys
import time
from pathlib import Path
from typing import Dict, Any

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.ai_providers.gateway import AIGateway
from src.rag.rag_setup import BasicRAG
from config import get_rag_config
from logging_config import get_logger

logger = get_logger(__name__)


class ChatService:
    """
    Production chat service with single global session
    
    Features:
    - Context-aware conversation with history
    - RAG integration for relevant context retrieval
    - Performance optimization: cached summary with smart regeneration
    - System prompt integration
    """
    
    def __init__(self, system_prompt: str = None, vector_store=None):
        """
        Initialize chat service with single global session
        
        Args:
            system_prompt: System prompt for LLM (loaded from file if not provided)
            vector_store: Optional shared VectorStore instance for Qdrant client sharing
        """
        self.config = get_rag_config()
        self.gateway = AIGateway()
        
        # Single global session state
        self.conversation_history = []
        self.conversation_summary = ""
        
        # Performance optimization: cached summary
        self.conversation_summary_cached = ""
        self.last_summary_exchange_count = 0
        
        # Load system prompt
        self.system_prompt = system_prompt or self._load_system_prompt()
        
        # Initialize RAG system for context storage
        # Use shared vector_store if provided to avoid Qdrant client conflicts
        self.context_rag = BasicRAG(
            config=self.config,
            collection_name="context_docs",
            use_persistent=True,
            vector_store=vector_store
        )
        
        logger.info("ChatService initialized with single global session")
    
    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            # Look in src/demos/ directory for system_prompt.md
            prompt_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "demos",
                "system_prompt.md"
            )
            if os.path.exists(prompt_path):
                with open(prompt_path, 'r', encoding='utf-8') as f:
                    logger.info(f"Loaded system prompt from {prompt_path}")
                    return f.read().strip()
        except Exception as e:
            logger.warning(f"Failed to load system prompt: {e}")
        
        # Fallback system prompt
        logger.info("Using fallback system prompt")
        return "You are a helpful AI assistant. Respond directly and conversationally without formatting headers or markdown."
    
    def add_to_history(self, question: str, answer: str):
        """Add exchange to conversation history"""
        exchange = {
            "question": question,
            "answer": answer,
            "timestamp": time.time()
        }
        self.conversation_history.append(exchange)
        
        # Summarize when we have many exchanges
        if len(self.conversation_history) > 8:
            self._summarize_older_context()
        
        # Keep only recent history (last 10)
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
    
    def _summarize_older_context(self):
        """Summarize older conversation context and ingest into vector store"""
        if len(self.conversation_history) < 6:  # Need at least 6 exchanges to summarize
            return
        
        # Get older exchanges (everything except last 3)
        older_exchanges = self.conversation_history[:-3]
        
        # Build context for summarization
        context_text = ""
        for i, exchange in enumerate(older_exchanges, 1):
            context_text += f"Q{i}: {exchange['question']}\n"
            context_text += f"A{i}: {exchange['answer']}\n\n"
        
        # Create summarization prompt
        summary_prompt = f"""Please summarize the following conversation in 2-3 sentences, focusing on the main topics discussed and key information shared:

{context_text}

Summary:"""
        
        try:
            # Get summary from LLM
            summary = self.gateway.chat(summary_prompt, max_tokens=100)
            self.conversation_summary = summary.strip()
            
            # Ingest the older exchanges into vector store for retrieval
            self._ingest_exchanges_to_vector_store(older_exchanges)
            
        except Exception as e:
            logger.warning(f"Failed to summarize older context: {e}")
            # Fallback: keep a simple summary
            self.conversation_summary = f"Previous conversation covered {len(older_exchanges)} exchanges on various topics."
    
    def _ingest_exchanges_to_vector_store(self, exchanges):
        """Ingest conversation exchanges into the context vector store"""
        try:
            # Convert exchanges to documents for ingestion
            documents = []
            for exchange in exchanges:
                # Create a document that combines question and answer
                doc = f"Question: {exchange['question']}\nAnswer: {exchange['answer']}"
                documents.append(doc)
            
            # Add to vector store
            count = self.context_rag.add_documents(documents)
            logger.info(f"Ingested {count} exchanges into vector store")
            return count
        except Exception as e:
            logger.warning(f"Failed to ingest exchanges: {e}")
            return 0
    
    def get_conversation_context(self, current_question: str = "") -> str:
        """
        Get formatted conversation context for the LLM
        
        PERFORMANCE OPTIMIZATION: Uses cached summary instead of generating on every request
        """
        if not self.conversation_history and not self.conversation_summary:
            return ""
        
        context_parts = []
        
        # Add summary of older context if available
        if self.conversation_summary:
            context_parts.append(f"Previous conversation summary: {self.conversation_summary}")
            context_parts.append("")
        
        # Search vector store for relevant context if we have a current question
        if current_question and self.conversation_summary:
            relevant_context = self._retrieve_relevant_context(current_question)
            if relevant_context:
                context_parts.append(f"Relevant previous discussion: {relevant_context}")
                context_parts.append("")
        
        # OPTIMIZATION: Use cached summary with smart regeneration
        if self.conversation_history:
            if self._should_regenerate_summary():
                # Regenerate summary
                conversation_summary = self._generate_conversation_summary()
                if conversation_summary:
                    self.conversation_summary_cached = conversation_summary
                    self.last_summary_exchange_count = len(self.conversation_history)
            
            # Use cached summary
            if self.conversation_summary_cached:
                context_parts.append(f"Conversation summary: {self.conversation_summary_cached}")
                context_parts.append("")
        
        # Add recent exchanges (last 2 for immediate context)
        recent_exchanges = self.conversation_history[-2:]
        if recent_exchanges:
            context_parts.append("Recent exchanges:")
            for exchange in recent_exchanges:
                context_parts.append(f"User: {exchange['question']}")
                context_parts.append(f"Assistant: {exchange['answer'][:150]}...")
                context_parts.append("")
        
        return "\n".join(context_parts) + "\n\n"
    
    def _should_regenerate_summary(self) -> bool:
        """
        Determine if conversation summary should be regenerated
        
        PERFORMANCE OPTIMIZATION: Only regenerate every 3-5 exchanges
        """
        if len(self.conversation_history) < 2:
            return False
        
        # Calculate how many exchanges since last summary
        exchanges_since_last = len(self.conversation_history) - self.last_summary_exchange_count
        
        # Regenerate if we have 4+ new exchanges since last summary
        return exchanges_since_last >= 4
    
    def _generate_conversation_summary(self) -> str:
        """
        Generate a focused summary of the conversation using LLM
        
        CACHED: Result is cached and reused until regeneration needed
        """
        if len(self.conversation_history) < 2:
            return ""
        
        # Build conversation text for summarization
        conversation_text = ""
        for exchange in self.conversation_history:
            conversation_text += f"User: {exchange['question']}\n"
            conversation_text += f"Assistant: {exchange['answer']}\n\n"
        
        # Create summarization prompt
        summary_prompt = f"""Create a concise summary focusing on KEY FACTS:
- User's name: [if mentioned, state clearly]
- Main topics: [list key topics]
- Important facts: [any specific information shared]

Conversation:
{conversation_text}

Summary:"""
        
        try:
            # Get summary from LLM
            summary = self.gateway.chat(summary_prompt, max_tokens=150)
            logger.info("Generated conversation summary")
            return summary.strip()
        except Exception as e:
            logger.warning(f"Failed to generate summary: {e}")
            # Return cached summary as fallback
            return self.conversation_summary_cached
    
    def _retrieve_relevant_context(self, question: str) -> str:
        """Retrieve relevant context from vector store"""
        try:
            # Search for relevant exchanges
            results = self.context_rag.search(question, limit=2)
            if results:
                # Combine the most relevant results
                relevant_texts = [result[0] for result in results if result[1] > 0.7]  # Only high similarity
                if relevant_texts:
                    return " ".join(relevant_texts[:2])  # Max 2 relevant exchanges
            return ""
        except Exception as e:
            logger.warning(f"Failed to retrieve relevant context: {e}")
            return ""
    
    def clear_vector_store(self):
        """Clear the context vector store"""
        try:
            # Delete the entire collection to clear all context
            self.context_rag.vector_store.client.delete_collection("context_docs")
            # Recreate the collection
            self.context_rag._setup_collection()
            logger.info("Cleared vector store")
        except Exception as e:
            logger.warning(f"Failed to clear vector store: {e}")
    
    def clear_session(self):
        """Clear the global chat session and all context"""
        self.conversation_history = []
        self.conversation_summary = ""
        self.conversation_summary_cached = ""
        self.last_summary_exchange_count = 0
        self.clear_vector_store()
        logger.info("Cleared global chat session")
    
    def _clean_response(self, response: str) -> str:
        """Clean up LLM response to remove unwanted formatting"""
        if not isinstance(response, str):
            return str(response)
        
        # Remove common formatting headers
        lines = response.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Skip lines that look like headers
            if line.strip().startswith('###') or line.strip().startswith('##') or line.strip().startswith('#'):
                continue
            # Skip empty lines at the start
            if not cleaned_lines and not line.strip():
                continue
            cleaned_lines.append(line)
        
        # Join and clean up
        cleaned = '\n'.join(cleaned_lines).strip()
        
        # Remove any remaining markdown formatting
        cleaned = cleaned.replace('**', '').replace('*', '')
        
        return cleaned
    
    def chat(self, message: str) -> Dict[str, Any]:
        """
        Process chat message with conversation context
        
        Args:
            message: User message
            
        Returns:
            Dictionary with answer, response_time, conversation_length
        """
        logger.info(f"Processing chat message (history length: {len(self.conversation_history)})")
        
        # Build conversation context for the LLM
        conversation_context = self.get_conversation_context(message)
        
        # Create the user message with context
        if conversation_context:
            user_message = f"{conversation_context}Current question: {message}"
        else:
            user_message = message
        
        # Use the gateway to get response with system prompt
        start_time = time.time()
        answer = self.gateway.chat(user_message, system_prompt=self.system_prompt)
        response_time = time.time() - start_time
        
        # Clean up the response
        answer = self._clean_response(answer)
        
        # Add to history
        self.add_to_history(message, answer)
        
        logger.info(f"Chat response generated in {response_time:.2f}s")
        
        return {
            "answer": answer,
            "response_time": response_time,
            "conversation_length": len(self.conversation_history),
            "session_id": "global"  # Single global session
        }
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get information about the current session"""
        return {
            "session_id": "global",
            "conversation_length": len(self.conversation_history),
            "has_summary": bool(self.conversation_summary or self.conversation_summary_cached),
            "last_summary_count": self.last_summary_exchange_count
        }

