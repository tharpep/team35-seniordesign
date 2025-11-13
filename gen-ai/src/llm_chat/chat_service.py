"""
Production chat service with performance optimizations
Extracted from context_llm_demo.py with cached summary for improved latency
"""

import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.ai_providers.gateway import AIGateway
from src.rag.rag_setup import BasicRAG
from config import get_rag_config
from logging_config import get_logger

logger = get_logger(__name__)


class ChatService:
    """
    Production chat service with stateful conversation
    
    Features:
    - Three-layer context: RAG (persistant_docs) + in-memory summary + recent messages
    - Messages array format for LLM API (stateful chat)
    - Performance optimization: cached summary with smart regeneration
    - System prompt integration
    """
    
    def __init__(self, system_prompt: Optional[str] = None, vector_store=None, rag_system=None):
        """
        Initialize chat service with stateful session
        
        Args:
            system_prompt: System prompt for LLM (loaded from file if not provided)
            vector_store: Optional shared VectorStore instance for Qdrant client sharing
            rag_system: Optional shared BasicRAG instance (uses persistant_docs)
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
        
        # Use shared RAG system (points to persistant_docs) or create new one
        if rag_system:
            self.rag_system = rag_system
        else:
            # Create new RAG instance pointing to persistant_docs
            self.rag_system = BasicRAG(
                config=self.config,
                collection_name="persistant_docs",
                use_persistent=True,
                vector_store=vector_store
            )
        
        logger.info("ChatService initialized with stateful session")
    
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
        
        # Summarize when we reach history limit
        if len(self.conversation_history) >= self.config.max_history_size:
            self._summarize_older_context()
        
        # Keep only recent history (use config max_history_size)
        if len(self.conversation_history) > self.config.max_history_size:
            self.conversation_history = self.conversation_history[-self.config.max_history_size:]
    
    def _summarize_older_context(self):
        """Summarize older conversation context (in-memory only, no vector store)"""
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
            # Get summary from LLM (use string format for summary generation)
            summary = self.gateway.chat(summary_prompt, max_tokens=100)
            self.conversation_summary = summary.strip()
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to summarize older context: {e}")
            # Fallback: keep a simple summary
            self.conversation_summary = f"Previous conversation covered {len(older_exchanges)} exchanges on various topics."
    
    def _get_rag_context(self, question: str) -> str:
        """
        Retrieve RAG context from persistant_docs (session notes/OCR data)
        
        Returns formatted context string for inclusion in messages array
        """
        try:
            results = self.rag_system.search(question, limit=self.config.top_k)
            if not results:
                return ""
            
            # Format retrieved documents
            context_parts = []
            for i, (doc, score) in enumerate(results, 1):
                if score > self.config.similarity_threshold:
                    context_parts.append(f"[Note {i}] {doc}")
            
            if context_parts:
                return "Relevant notes and documents from your study session:\n" + "\n\n".join(context_parts)
            return ""
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to get RAG context: {e}")
            return ""
    
    def _build_messages_array(self, current_message: str) -> List[Dict[str, str]]:
        """
        Build messages array for LLM API call
        
        Structure:
        1. System prompt
        2. RAG context (from persistant_docs)
        3. Chat summary (long-term conversation memory)
        4. Recent conversation history (last N exchanges from config)
        5. Current message
        """
        messages = []
        
        # 1. System prompt
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        
        # 2. RAG context (session notes)
        rag_context = self._get_rag_context(current_message)
        if rag_context:
            messages.append({"role": "system", "content": rag_context})
        
        # 3. Chat summary (long-term conversation memory)
        # Regenerate summary if needed (every N messages when at history limit)
        if len(self.conversation_history) >= self.config.max_history_size:
            if self._should_regenerate_summary():
                conversation_summary = self._generate_conversation_summary()
                if conversation_summary:
                    self.conversation_summary_cached = conversation_summary
                    self.last_summary_exchange_count = len(self.conversation_history)
        
        if self.conversation_summary_cached:
            messages.append({
                "role": "system",
                "content": f"Conversation summary: {self.conversation_summary_cached}"
            })
        
        # 4. Recent conversation history (last N exchanges from config)
        recent_exchanges = self.conversation_history[-self.config.max_history_size:]
        for exchange in recent_exchanges:
            messages.append({"role": "user", "content": exchange["question"]})
            messages.append({"role": "assistant", "content": exchange["answer"]})
        
        # 5. Current message
        messages.append({"role": "user", "content": current_message})
        
        return messages
    
    def _should_regenerate_summary(self) -> bool:
        """
        Determine if conversation summary should be regenerated
        
        Regenerate every N messages (from config) when at conversation history limit
        """
        if len(self.conversation_history) < self.config.max_history_size:
            return False
        
        # Calculate how many exchanges since last summary
        exchanges_since_last = len(self.conversation_history) - self.last_summary_exchange_count
        
        # Regenerate based on config interval
        return exchanges_since_last >= self.config.summary_interval
    
    def _generate_conversation_summary(self) -> str:
        """
        Generate a focused summary of ALL conversation history using LLM
        """
        if len(self.conversation_history) < 2:
            return ""
        
        # Build conversation text for summarization (ALL history)
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
            # Get summary from LLM (use string format for summary generation)
            summary = self.gateway.chat(summary_prompt, max_tokens=150)
            return summary.strip()
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to generate summary: {e}")
            # Return cached summary as fallback
            return self.conversation_summary_cached
    
    def clear_vector_store(self):
        """
        No-op for context_docs (not used anymore)
        persistant_docs is managed separately and not cleared here
        """
        pass
    
    def clear_session(self):
        """Clear the in-memory chat session (RAG persists)"""
        self.conversation_history = []
        self.conversation_summary = ""
        self.conversation_summary_cached = ""
        self.last_summary_exchange_count = 0
        # Note: We don't clear persistant_docs here - that's session-based and handled elsewhere
        logger.info("Cleared in-memory chat session")
    
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
        Process chat message with three-layer context
        
        Uses:
        - RAG context from persistant_docs (session notes)
        - Chat summary (long-term conversation memory)
        - Recent conversation history (last N exchanges)
        
        Args:
            message: User message
            
        Returns:
            Dictionary with answer, response_time, conversation_length
        """
        # Build messages array with all context layers
        messages = self._build_messages_array(message)
        
        # Call LLM with messages array (stateful chat)
        start_time = time.time()
        answer = self.gateway.chat(messages, max_tokens=self.config.max_chat_tokens)
        response_time = time.time() - start_time
        
        # Clean up the response
        answer = self._clean_response(answer)
        
        # Add to history
        self.add_to_history(message, answer)
        
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

