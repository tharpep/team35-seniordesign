"""
Production chat service with performance optimizations
Extracted from context_llm_demo.py with cached summary for improved latency
"""

import os
import sys
import time
import threading
import re
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
    - Three-layer context: RAG (persistant_docs or session-specific collections) + in-memory summary + recent messages
    - Messages array format for LLM API (stateful chat)
    - Performance optimization: cached summary with smart regeneration
    - System prompt integration
    - Session-based RAG: Uses session_docs_{session_id} collection when session_context is provided
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
    
    def _is_vague_question(self, question: str) -> bool:
        """
        Detect if a question is vague and needs context-aware query generation
        
        Vague questions include:
        - Pronouns: "that", "it", "this", "they"
        - Context-dependent: "what did we talk about", "can you explain that"
        - Questions without specific keywords
        
        Args:
            question: User's question
            
        Returns:
            True if question is vague, False otherwise
        """
        question_lower = question.lower().strip()
        
        # Skip vague detection for greetings and casual conversation
        greetings = ["hello", "hi", "hey", "yo", "greetings", "good morning", "good afternoon", "good evening"]
        if any(greeting in question_lower for greeting in greetings):
            return False
        
        # Very short questions are likely vague (but not greetings)
        if len(question_lower) < 10:
            return True
        
        # Check for vague pronouns and context-dependent phrases
        vague_indicators = [
            "what did we", "what did you", "what were we",
            "can you explain that", "tell me about that", "what about that",
            "how does that", "why is that", "what is that",
            "remind me", "what was", "what were",
            "that thing", "this thing", "it"
        ]
        
        for indicator in vague_indicators:
            if indicator in question_lower:
                return True
        
        # Check if question is mostly pronouns/function words (likely vague)
        pronouns = ["that", "this", "it", "they", "them", "these", "those"]
        words = question_lower.split()
        pronoun_count = sum(1 for word in words if word in pronouns)
        
        # If more than 30% of words are pronouns, likely vague
        if len(words) > 0 and pronoun_count / len(words) > 0.3:
            return True
        
        return False
    
    def _generate_search_query(self, user_question: str) -> str:
        """
        Generate optimized search query using LLM with minimal context
        
        Uses simplified context-aware approach:
        - Only uses last 2-3 exchanges (not full history)
        - Focuses on extracting main topic/subject
        - Fast and reliable
        
        Args:
            user_question: User's original question
            
        Returns:
            Optimized search query string
        """
        # Build minimal context from last 2 exchanges
        recent_context = ""
        if len(self.conversation_history) > 0:
            last_2 = self.conversation_history[-2:]
            for exchange in last_2:
                recent_context += f"Q: {exchange['question']}\n"
        
        if not recent_context:
            recent_context = "None"
        
        # Load query generation prompt template
        prompt = load_prompt_template(
            "rag_query_generation.txt",
            fallback="User question: {user_question}\n\nRecent conversation context:\n{recent_context}\n\nGenerate a concise search query (3-5 keywords) to find relevant study materials.\nSearch query:",
            user_question=user_question,
            recent_context=recent_context
        )
        
        try:
            # Generate optimized query (very short, fast)
            optimized_query = self.gateway.chat(prompt, max_tokens=30)
            # Clean up the response (remove any extra text)
            optimized_query = optimized_query.strip()
            # Take first line if multiple lines
            if '\n' in optimized_query:
                optimized_query = optimized_query.split('\n')[0].strip()
            
            # Safety check: if optimized query is empty or too short, use original
            if not optimized_query or len(optimized_query) < 3:
                logger.warning(f"Generated query too short/empty: '{optimized_query}', using original")
                return user_question
            
            logger.debug(f"Generated optimized query: '{optimized_query}' from original: '{user_question}'")
            return optimized_query
        except Exception as e:
            logger.warning(f"Failed to generate optimized query: {e}, using original question")
            return user_question
    
    def _get_rag_context(self, question: str, session_context: Optional[Dict[str, Any]] = None) -> tuple[str, List[tuple[str, float]], float]:
        """
        Retrieve RAG context from persistant_docs or session-specific collection (session notes/OCR data)
        
        Uses hybrid approach:
        1. Try original query first (fast, no LLM call)
        2. If low confidence or vague question, generate optimized query and retry
        
        Args:
            question: User question
            session_context: Optional session context dict with session_id to determine collection
        
        Returns:
            Tuple of (formatted context string, raw results list, query_optimization_time)
        """
        try:
            # Determine collection name from session context
            collection_name = None
            if session_context and session_context.get('session_id'):
                collection_name = f"session_docs_{session_context['session_id']}"
                logger.debug(f"Using session collection: {collection_name}")
            
            # Check if collection has documents
            target_collection = collection_name or self.rag_system.collection_name
            stats = self.rag_system.vector_store.get_collection_stats(target_collection)
            doc_count = stats.get("points_count", 0)
            
            if doc_count == 0:
                if collection_name:
                    logger.warning(f"Session collection '{target_collection}' has no documents yet. Documents may still be ingesting.")
                else:
                    logger.warning(f"RAG collection '{target_collection}' has no documents. Documents need to be ingested first.")
                return "", [], 0.0
            
            # Early exit for greetings and casual conversation (no RAG needed, saves time)
            question_lower = question.lower().strip()
            is_greeting = any(g in question_lower for g in ["hello", "hi", "hey", "yo", "greetings", "good morning", "good afternoon", "good evening", "what's your", "favorite"])
            if is_greeting:
                logger.debug(f"Skipping RAG for greeting/casual question: {question[:50]}")
                return "", [], 0.0
            
            # Step 1: Try original query first (fast, no LLM call)
            results = self.rag_system.search(question, limit=self.config.top_k, collection_name=collection_name)
            top_score = results[0][1] if results else 0.0
            
            # Step 2: Check if we need to optimize the query
            # Only optimize if we have conversation context AND query needs it
            is_vague = self._is_vague_question(question)
            low_confidence = top_score < 0.4  # Threshold for low confidence
            has_context = len(self.conversation_history) > 0  # Need context for optimization to work
            
            # Step 3: Generate optimized query if needed (track time)
            search_query = question
            query_optimization_time = 0.0
            if has_context and (is_vague or low_confidence):
                logger.info(f"Query optimization needed (vague={is_vague}, low_confidence={low_confidence}, score={top_score:.4f})")
                opt_start = time.time()
                search_query = self._generate_search_query(question)
                query_optimization_time = time.time() - opt_start
                logger.info(f"Query optimization completed in {query_optimization_time:.4f}s (generated: '{search_query[:50]}...')")
                
                # Retry search with optimized query
                if search_query != question:
                    results = self.rag_system.search(search_query, limit=self.config.top_k, collection_name=collection_name)
                    new_top_score = results[0][1] if results else 0.0
                    logger.info(f"Optimized query search: original_score={top_score:.4f}, optimized_score={new_top_score:.4f}")
                else:
                    logger.debug(f"Optimized query same as original, using original results")
            
            if not results:
                logger.debug(f"RAG search returned no results for query: {search_query[:50]}... (collection '{target_collection}' has {doc_count} documents)")
                return "", [], query_optimization_time
            
            # Log all results for debugging
            logger.debug(f"RAG search returned {len(results)} results:")
            for i, (doc, score) in enumerate(results, 1):
                logger.debug(f"  [{i}] Score: {score:.4f}, Text preview: {doc[:100]}...")
            
            # Format retrieved documents
            # Use a more lenient threshold - Qdrant cosine similarity scores can vary
            # For all-MiniLM-L6-v2, relevant documents typically score 0.3-0.8
            # Lower threshold to 0.3 to capture more relevant results
            effective_threshold = max(0.3, self.config.similarity_threshold * 0.5)  # Use 50% of configured threshold or 0.3, whichever is higher
            
            context_parts = []
            filtered_results = []
            for i, (doc, score) in enumerate(results, 1):
                if score >= effective_threshold:
                    context_parts.append(f"[Note {i}] {doc}")
                    filtered_results.append((doc, score))
                else:
                    logger.debug(f"  Filtered out result {i} with score {score:.4f} (threshold: {effective_threshold:.4f})")
            
            if context_parts:
                # Load RAG context prefix from prompts directory
                prefix = load_prompt("rag_context_prefix.txt", fallback="<retrieved_context>\nRelevant notes and documents from your study session:\n")
                formatted_context = prefix + "\n\n".join(context_parts) + "\n</retrieved_context>"
                logger.info(f"RAG context retrieved: {len(filtered_results)} documents with scores >= {effective_threshold:.4f}")
                return formatted_context, filtered_results, query_optimization_time
            else:
                top_score_str = f"{results[0][1]:.4f}" if results else "N/A"
                logger.warning(f"RAG search found {len(results)} results but all were below threshold {effective_threshold:.4f}. Top score: {top_score_str}")
                # Return top result even if below threshold as fallback
                if results:
                    top_doc, top_score = results[0]
                    logger.info(f"Using top result as fallback (score: {top_score:.4f})")
                    prefix = load_prompt("rag_context_prefix.txt", fallback="<retrieved_context>\nRelevant notes and documents from your study session:\n")
                    formatted_context = prefix + f"\n[Note 1] {top_doc}" + "\n</retrieved_context>"
                    return formatted_context, [(top_doc, top_score)], query_optimization_time
            return "", filtered_results, query_optimization_time
        except Exception as e:
            # Fail the request, then continue
            logger.warning(f"Failed to get RAG context: {e}", exc_info=True)
            return "", [], 0.0
    
    def _build_messages_array(self, current_message: str, session_context: Optional[Dict[str, Any]] = None) -> tuple[List[Dict[str, str]], List[tuple[str, float]], float, float]:
        """
        Build messages array for LLM API call
        
        Structure:
        1. System prompt
        2. Session context (if provided)
        3. RAG context (from persistant_docs or session-specific collection if session_id provided)
        4. Chat summary (long-term conversation memory)
        5. Recent conversation history (last N exchanges from config)
        6. Current message
        
        Args:
            current_message: Current user message
            session_context: Optional session context dict with session_id, session_title, session_topic
        
        Returns:
            Tuple of (messages array, RAG results for debugging, summary generation time, query optimization time)
        """
        messages = []
        rag_results = []
        summary_gen_time = 0.0
        
        # 1. System prompt
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        
        # 2. Session context (if provided)
        if session_context:
            context_parts = []
            if session_context.get('session_id'):
                context_parts.append(f"Session ID: {session_context['session_id']}")
            if session_context.get('session_title'):
                context_parts.append(f"Session: {session_context['session_title']}")
            if session_context.get('session_topic'):
                context_parts.append(f"Topic: {session_context['session_topic']}")

            if context_parts:
                context_text = "\n".join(context_parts)
                messages.append({"role": "system", "content": context_text})
        
        # 3. RAG context (session notes)
        rag_context, rag_results, query_optimization_time = self._get_rag_context(current_message, session_context)
        if rag_context:
            messages.append({"role": "system", "content": rag_context})
        
        # 3. Chat summary (long-term conversation memory)
        # Use cached summary (generation is deferred to after response)
        # Summary generation time will be 0.0 since it's deferred
        
        # Only use summary if we have actual conversation history that matches it
        # This prevents stale summaries from previous sessions
        # Require at least 3 exchanges to ensure summary is relevant to current conversation
        if self.conversation_summary_cached and len(self.conversation_history) >= 3:
            # Additional validation: summary should only be used if it was generated from current history
            # Check if summary exchange count matches current history length (within reasonable range)
            summary_relevant = (
                self.last_summary_exchange_count > 0 and
                len(self.conversation_history) >= self.last_summary_exchange_count
            )
            
            if summary_relevant:
                # Load conversation summary prompt template
                summary_content = load_prompt_template(
                    "conversation_summary_with_content.txt",
                    fallback="Conversation summary (key facts, names, topics from earlier exchanges): {summary}",
                    summary=self.conversation_summary_cached
                )
                messages.append({
                    "role": "system",
                    "content": summary_content
                })
            else:
                logger.debug(f"Skipping stale summary (history={len(self.conversation_history)}, summary_count={self.last_summary_exchange_count})")
                self.conversation_summary_cached = ""  # Clear stale summary
        elif len(self.conversation_history) > 0:
            # For early exchanges, note that summary will be available after more exchanges
            building_content = load_prompt(
                "conversation_summary_building.txt",
                fallback="Note: Conversation summary is being built. Use recent conversation history for context."
            )
            messages.append({
                "role": "system",
                "content": building_content.strip()
            })
        
        # 4. Recent conversation history (last N exchanges from config)
        recent_exchanges = self.conversation_history[-self.config.max_history_size:]
        for exchange in recent_exchanges:
            messages.append({"role": "user", "content": exchange["question"]})
            messages.append({"role": "assistant", "content": exchange["answer"]})
        
        # 5. Current message
        messages.append({"role": "user", "content": current_message})
        
        return messages, rag_results, summary_gen_time, query_optimization_time
    
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
        
        # Remove meta-commentary patterns at the start
        # Patterns like "The assistant responds by providing information..." or "Assistant:"
        response = response.strip()
        
        # Remove "The assistant responds by..." patterns
        response = re.sub(r'^The assistant responds? (by providing information|with|by saying).*?:\s*', '', response, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove "Assistant:" prefix (with optional whitespace)
        response = re.sub(r'^Assistant:\s*', '', response, flags=re.IGNORECASE)
        
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
    
    def chat(self, message: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process chat message with three-layer context
        
        Uses:
        - Session context (session_id, session_title, session_topic)
        - RAG context from persistant_docs (session notes)
        - Chat summary (long-term conversation memory)
        - Recent conversation history (last N exchanges)

        Args:
            message: User message
            session_context: Optional session context dict with session_id, session_title, session_topic
            
        Returns:
            Dictionary with answer, response_time, conversation_length, timing breakdown, and RAG results
        """
        # Timing breakdown
        timings = {
            "rag_search": 0.0,
            "query_optimization": 0.0,
            "summary_generation": 0.0,
            "llm_call": 0.0,
            "total": 0.0
        }
        
        total_start = time.time()
        
        # Build messages array with all context layers
        # Track RAG search, query optimization, and summary generation separately
        rag_start = time.time()
        messages, rag_results, summary_gen_time, query_optimization_time = self._build_messages_array(message, session_context)
        rag_time = time.time() - rag_start
        
        # Separate RAG search time from query optimization and summary generation time
        # Note: summary_gen_time is always 0.0 because summary generation is deferred to background thread
        # query_optimization_time is tracked inside _get_rag_context and may be 0.0 if optimization wasn't needed
        timings["rag_search"] = max(0.0, rag_time - summary_gen_time - query_optimization_time)
        timings["query_optimization"] = query_optimization_time
        timings["summary_generation"] = summary_gen_time  # Always 0.0 (deferred to background thread)
        
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

