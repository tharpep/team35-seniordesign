"""
Production chat service with performance optimizations
Extracted from context_llm_demo.py with cached summary for improved latency
"""

import os
import sys
import time
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional
from copy import deepcopy

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.ai_providers.gateway import AIGateway
from src.rag.rag_setup import BasicRAG
from src.utils.prompt_loader import load_prompt, load_prompt_template
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
        """Load system prompt from prompts directory"""
        fallback = "You are a helpful AI assistant. Respond directly and conversationally without formatting headers or markdown."
        prompt = load_prompt("chat_system_prompt.md", fallback=fallback)
        if prompt:
            logger.info("Loaded chat system prompt from prompts directory")
        else:
            logger.warning("Using fallback system prompt")
        return prompt or fallback
    
    def add_to_history(self, question: str, answer: str):
        """Add exchange to conversation history"""
        exchange = {
            "question": question,
            "answer": answer,
            "timestamp": time.time()
        }
        self.conversation_history.append(exchange)
        
        # Keep only recent history (use config max_history_size)
        if len(self.conversation_history) > self.config.max_history_size:
            self.conversation_history = self.conversation_history[-self.config.max_history_size:]
    
    def _get_rag_context(self, question: str) -> tuple[str, List[tuple[str, float]]]:
        """
        Retrieve RAG context from persistant_docs (session notes/OCR data)
        
        Returns:
            Tuple of (formatted context string, raw results list)
        """
        try:
            results = self.rag_system.search(question, limit=self.config.top_k)
            if not results:
                return "", []
            
            # Format retrieved documents
            context_parts = []
            filtered_results = []
            for i, (doc, score) in enumerate(results, 1):
                if score > self.config.similarity_threshold:
                    context_parts.append(f"[Note {i}] {doc}")
                    filtered_results.append((doc, score))
            
            if context_parts:
                # Load RAG context prefix from prompts directory
                prefix = load_prompt("rag_context_prefix.txt", fallback="Relevant notes and documents from your study session:\n")
                formatted_context = prefix + "\n\n".join(context_parts)
                return formatted_context, filtered_results
            return "", filtered_results
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to get RAG context: {e}")
            return "", []
    
    def _build_messages_array(self, current_message: str) -> tuple[List[Dict[str, str]], List[tuple[str, float]], float]:
        """
        Build messages array for LLM API call
        
        Structure:
        1. System prompt
        2. RAG context (from persistant_docs)
        3. Chat summary (long-term conversation memory)
        4. Recent conversation history (last N exchanges from config)
        5. Current message
        
        Returns:
            Tuple of (messages array, RAG results for debugging, summary generation time)
        """
        messages = []
        rag_results = []
        summary_gen_time = 0.0
        
        # 1. System prompt
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        
        # 2. RAG context (session notes)
        rag_context, rag_results = self._get_rag_context(current_message)
        if rag_context:
            messages.append({"role": "system", "content": rag_context})
        
        # 3. Chat summary (long-term conversation memory)
        # Use cached summary (generation is deferred to after response)
        # Summary generation time will be 0.0 since it's deferred
        
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
        
        return messages, rag_results, summary_gen_time
    
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
    
    def _generate_conversation_summary_from_recent(self, recent_exchanges: List[Dict[str, Any]], old_summary: str = "") -> str:
        """
        Generate summary from recent exchanges + old summary (sliding window approach)
        
        This creates a rolling summary that compresses older context while keeping
        recent exchanges fresh. The summary is always "behind" but recent history
        makes up for it.
        
        Args:
            recent_exchanges: Last N exchanges to summarize (typically last 9)
            old_summary: Previous summary to incorporate (compressed older context)
            
        Returns:
            Generated summary string
        """
        if len(recent_exchanges) < 2:
            return old_summary if old_summary else ""
        
        # Build conversation text for summarization (recent exchanges only)
        conversation_text = ""
        for exchange in recent_exchanges:
            conversation_text += f"User: {exchange['question']}\n"
            conversation_text += f"Assistant: {exchange['answer']}\n\n"
        
        # Load summary generation prompt template
        if old_summary:
            summary_prompt = load_prompt_template(
                "summary_generation_with_old.md",
                old_summary=old_summary,
                recent_conversation=conversation_text
            )
        else:
            # First summary generation (no old summary)
            summary_prompt = load_prompt_template(
                "summary_generation_first.md",
                conversation=conversation_text
            )
        
        try:
            # Get summary from LLM (use string format for summary generation)
            summary = self.gateway.chat(summary_prompt, max_tokens=200)
            return summary.strip()
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to generate summary: {e}")
            # Return old summary as fallback
            return old_summary if old_summary else ""
    
    def _generate_summary_sync(self, recent_exchanges: List[Dict[str, Any]]):
        """
        Generate summary in background thread (non-blocking)
        
        Uses sliding window approach: generates summary from recent exchanges + old summary.
        This creates a rolling compression where summary is always "behind" but recent
        history makes up for it.
        
        Args:
            recent_exchanges: Last N exchanges to summarize (typically last 9)
        """
        try:
            old_summary = self.conversation_summary_cached
            logger.info(f"Generating summary in background from {len(recent_exchanges)} recent exchanges + old summary")
            summary = self._generate_conversation_summary_from_recent(recent_exchanges, old_summary)
            if summary:
                self.conversation_summary_cached = summary
                # Update count to reflect that summary now covers these exchanges
                self.last_summary_exchange_count = len(self.conversation_history)
                logger.info("Summary generated and cached successfully (sliding window)")
        except Exception as e:
            logger.error(f"Error in sync summary generation: {e}")
    
    def clear_vector_store(self):
        """
        No-op for context_docs (not used anymore)
        persistant_docs is managed separately and not cleared here
        """
        pass
    
    def clear_session(self):
        """Clear the in-memory chat session (RAG persists)"""
        self.conversation_history = []
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
            Dictionary with answer, response_time, conversation_length, timing breakdown, and RAG results
        """
        # Timing breakdown
        timings = {
            "rag_search": 0.0,
            "summary_generation": 0.0,
            "llm_call": 0.0,
            "total": 0.0
        }
        
        total_start = time.time()
        
        # Build messages array with all context layers
        # Track RAG search and summary generation separately
        rag_start = time.time()
        messages, rag_results, summary_gen_time = self._build_messages_array(message)
        rag_time = time.time() - rag_start
        
        # Separate RAG search time from summary generation time
        timings["rag_search"] = rag_time - summary_gen_time
        timings["summary_generation"] = summary_gen_time
        
        # Call LLM with messages array (stateful chat)
        llm_start = time.time()
        answer = self.gateway.chat(messages, max_tokens=self.config.max_chat_tokens)
        timings["llm_call"] = time.time() - llm_start
        
        timings["total"] = time.time() - total_start
        
        # Clean up the response
        answer = self._clean_response(answer)
        
        # Add to history first (this may trim old entries if over limit)
        self.add_to_history(message, answer)
        
        # Check if summary should be regenerated (sliding window approach)
        # Generate from last 9 exchanges + old summary, then history resets
        should_regenerate = False
        recent_exchanges_for_summary = None
        
        if len(self.conversation_history) >= self.config.max_history_size:
            # Check if we should regenerate based on interval
            exchanges_since_last = len(self.conversation_history) - self.last_summary_exchange_count
            if exchanges_since_last >= self.config.summary_interval:
                should_regenerate = True
                # Take last (max_history_size - 1) exchanges for summary
                # This keeps summary "behind" by 1, but recent history makes up for it
                num_exchanges_for_summary = self.config.max_history_size - 1
                recent_exchanges_for_summary = deepcopy(
                    self.conversation_history[-num_exchanges_for_summary:]
                )
        
        # Fire async summary generation if needed (sliding window: last 9 + old summary)
        # Uses threading to run in background without blocking the response
        if should_regenerate and recent_exchanges_for_summary:
            thread = threading.Thread(
                target=self._generate_summary_sync,
                args=(recent_exchanges_for_summary,),
                daemon=True,
                name="SummaryGenerator"
            )
            thread.start()
            logger.info(f"Started background summary generation from last {len(recent_exchanges_for_summary)} exchanges + old summary")
        
        # Format RAG results for response
        rag_info = {
            "results_count": len(rag_results),
            "results": [
                {"text": doc[:100] + "..." if len(doc) > 100 else doc, "score": float(score)}
                for doc, score in rag_results[:3]  # Return top 3 for debugging
            ]
        }
        
        return {
            "answer": answer,
            "response_time": timings["total"],
            "timings": timings,
            "rag_info": rag_info,
            "conversation_length": len(self.conversation_history),
            "session_id": "global"  # Single global session
        }
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get information about the current session"""
        return {
            "session_id": "global",
            "conversation_length": len(self.conversation_history),
            "has_summary": bool(self.conversation_summary_cached),
            "last_summary_count": self.last_summary_exchange_count
        }

