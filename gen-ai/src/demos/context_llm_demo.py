"""
Context-Aware LLM Demo - Interactive chat with conversation context
Builds off the existing LLM demo but adds conversation context management
"""

import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.ai_providers.gateway import AIGateway
from src.rag.rag_setup import BasicRAG
from config import get_rag_config
from logging_config import log_rag_result


class ContextChatSession:
    """Manages a context-aware chat session with conversation history"""
    
    def __init__(self):
        self.config = get_rag_config()
        self.gateway = AIGateway()
        self.conversation_history = []
        self.conversation_summary = ""
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Initialize RAG system for context storage
        self.context_rag = BasicRAG(
            config=self.config,
            collection_name="context_docs",
            use_persistent=True
        )
    
    def _load_system_prompt(self) -> str:
        """Load system prompt from file"""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), "system_prompt.md")
            if os.path.exists(prompt_path):
                with open(prompt_path, 'r', encoding='utf-8') as f:
                    return f.read().strip()
        except Exception:
            pass
        # Fallback system prompt
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
            return count
        except Exception as e:
            return 0
    
    def get_conversation_context(self, current_question: str = "") -> str:
        """Get formatted conversation context for the LLM"""
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
        
        # Add LLM-generated conversation summary
        if self.conversation_history:
            conversation_summary = self._generate_conversation_summary()
            if conversation_summary:
                context_parts.append(f"Conversation summary: {conversation_summary}")
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
    
    def _generate_conversation_summary(self) -> str:
        """Generate a focused summary of the conversation using LLM"""
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
            return summary.strip()
        except Exception as e:
            return ""
    
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
            return ""
    
    def clear_vector_store(self):
        """Clear the context vector store"""
        try:
            # Delete the entire collection to clear all context
            self.context_rag.vector_store.client.delete_collection("context_docs")
            # Recreate the collection
            self.context_rag._setup_collection()
        except Exception as e:
            pass
    
    def end_session(self):
        """End the chat session and clear all context"""
        self.conversation_history = []
        self.conversation_summary = ""
        self.clear_vector_store()
    
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
    
    def chat_with_context(self, question: str) -> Dict[str, Any]:
        """Process question with conversation context only"""
        # Build conversation context for the LLM
        conversation_context = self.get_conversation_context(question)
        
        # Create the user message with context
        if conversation_context:
            user_message = f"{conversation_context}Current question: {question}"
        else:
            user_message = question
        
        # Use the gateway to get response with system prompt
        start_time = time.time()
        answer = self.gateway.chat(user_message, system_prompt=self.system_prompt)
        response_time = time.time() - start_time
        
        # Clean up the response
        answer = self._clean_response(answer)
        
        # Add to history
        self.add_to_history(question, answer)
        
        return {
            "answer": answer,
            "response_time": response_time,
            "conversation_length": len(self.conversation_history)
        }


def run_context_llm_demo(mode="interactive"):
    """Run context-aware LLM demo"""
    print("=== Context-Aware LLM Demo ===")
    
    try:
        session = ContextChatSession()
        
        if mode == "interactive":
            run_interactive_mode(session)
        else:
            run_automated_mode(session)
            
    except Exception as e:
        print(f"Error: {e}")


def run_interactive_mode(session: ContextChatSession):
    """Run interactive chat mode"""
    print("\n=== Interactive Context Chat ===")
    print("Commands:")
    print("  /memory - Show memory context (recent exchanges)")
    print("  /vector - Show vector context (stored exchanges)")
    print("  /clear - Clear all context")
    print("  /help - Show this help")
    print("  quit/exit/q - Exit the demo")
    print("\nStart chatting! (All questions will use conversation context)")
    
    while True:
        question = input("\nYou: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            session.end_session()  # Auto-clear on exit
            break
        
        if question.lower() == '/help':
            print("\nCommands:")
            print("  /memory - Show memory context (recent exchanges)")
            print("  /vector - Show vector context (stored exchanges)")
            print("  /clear - Clear all context")
            print("  /help - Show this help")
            print("  quit/exit/q - Exit the demo")
            print("  Any other text - Ask a question with context")
            continue
        
        if question.lower() == '/memory':
            show_memory_context(session)
            continue
        
        if question.lower() == '/vector':
            show_vector_context(session)
            continue
        
        if question.lower() == '/clear':
            session.end_session()
            continue
        
        if question:
            try:
                result = session.chat_with_context(question)
                
                print(f"\nAssistant: {result['answer']}")
                print(f"Response time: {result['response_time']:.2f}s")
                print(f"Conversation length: {result['conversation_length']} exchanges")
                
                # Log the result
                log_rag_result(
                    question=question,
                    answer=result['answer'],
                    response_time=result['response_time'],
                    model_name=session.config.model_name,
                    provider="Context Chat",
                    context_docs=[],
                    context_scores=[]
                )
                
            except Exception as e:
                print(f"Error: {e}")


def run_automated_mode(session: ContextChatSession):
    """Run automated demo mode with context testing and LLM grading"""
    print("\n=== Automated Context Demo ===")
    
    # Test scenarios for context functionality
    test_scenarios = [
        {
            "name": "Name Introduction",
            "question": "Hello, my name is Alice. What's your name?",
            "expected_context": "user_name_alice"
        },
        {
            "name": "Topic Discussion", 
            "question": "I love machine learning. What do you think about it?",
            "expected_context": "user_likes_ml"
        },
        {
            "name": "Name Recall",
            "question": "What is my name?",
            "expected_context": "should_remember_alice"
        },
        {
            "name": "Topic Continuation",
            "question": "Tell me more about what I mentioned I love.",
            "expected_context": "should_remember_ml"
        },
        {
            "name": "Context Summary",
            "question": "What have we talked about so far?",
            "expected_context": "should_summarize_conversation"
        }
    ]
    
    print("Testing context functionality...")
    results = []
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n--- Test {i}: {scenario['name']} ---")
        print(f"Q: {scenario['question']}")
        
        try:
            result = session.chat_with_context(scenario['question'])
            
            print(f"A: {result['answer'][:200]}...")
            print(f"Response time: {result['response_time']:.2f}s")
            print(f"Conversation length: {result['conversation_length']} exchanges")
            
            # Store result for grading
            results.append({
                "scenario": scenario['name'],
                "question": scenario['question'],
                "answer": result['answer'],
                "expected_context": scenario['expected_context'],
                "response_time": result['response_time']
            })
            
        except Exception as e:
            print(f"Error: {e}")
            results.append({
                "scenario": scenario['name'],
                "question": scenario['question'],
                "answer": f"ERROR: {e}",
                "expected_context": scenario['expected_context'],
                "response_time": 0
            })
    
    # Grade the context performance using LLM
    print("\n" + "="*60)
    print("CONTEXT PERFORMANCE EVALUATION")
    print("="*60)
    
    context_score = evaluate_context_performance(session, results)
    
    print(f"\nOverall Context Score: {context_score['overall_score']:.1f}/10")
    print(f"Context Accuracy: {context_score['accuracy']:.1f}%")
    print(f"Context Consistency: {context_score['consistency']:.1f}%")
    
    # End the session to clear all context
    session.end_session()


def evaluate_context_performance(session: ContextChatSession, results: List[Dict]) -> Dict:
    """Use LLM to evaluate context performance"""
    
    # Build evaluation prompt
    evaluation_prompt = f"""Evaluate the context performance of this AI conversation. Rate each scenario on a scale of 1-10 for context awareness.

Conversation Results:
"""
    
    for i, result in enumerate(results, 1):
        evaluation_prompt += f"""
Test {i}: {result['scenario']}
Question: {result['question']}
Answer: {result['answer']}
Expected: {result['expected_context']}
"""
    
    evaluation_prompt += """
Rate the overall context performance considering:
1. Name memory (does it remember the user's name?)
2. Topic continuity (does it reference previous topics?)
3. Context awareness (does it show understanding of conversation flow?)
4. Consistency (does it maintain context throughout?)

Provide scores in this format:
- Overall Score: X/10
- Name Memory: X/10  
- Topic Continuity: X/10
- Context Awareness: X/10
- Consistency: X/10
- Accuracy: X%
- Consistency: X%

Evaluation:"""
    
    try:
        # Get LLM evaluation
        evaluation = session.gateway.chat(evaluation_prompt, max_tokens=300)
        print("LLM Evaluation:")
        print(evaluation)
        
        # Parse scores (simple extraction)
        overall_score = 7.0  # Default if parsing fails
        accuracy = 75.0
        consistency = 70.0
        
        # Try to extract scores from evaluation
        lines = evaluation.split('\n')
        for line in lines:
            line = line.strip()
            if 'Overall Score:' in line:
                try:
                    overall_score = float(line.split(':')[1].split('/')[0].strip())
                except:
                    pass
            elif 'Accuracy:' in line:
                try:
                    # Extract number before % or before (
                    score_text = line.split(':')[1].strip()
                    if '%' in score_text:
                        accuracy = float(score_text.split('%')[0].strip())
                    elif '(' in score_text:
                        accuracy = float(score_text.split('(')[0].strip())
                except:
                    pass
            elif 'Consistency:' in line and '%' in line:
                try:
                    # Extract number before % or before (
                    score_text = line.split(':')[1].strip()
                    if '%' in score_text:
                        consistency = float(score_text.split('%')[0].strip())
                    elif '(' in score_text:
                        consistency = float(score_text.split('(')[0].strip())
                except:
                    pass
        
        return {
            "overall_score": overall_score,
            "accuracy": accuracy,
            "consistency": consistency,
            "evaluation_text": evaluation
        }
        
    except Exception as e:
        print(f"Evaluation error: {e}")
        return {
            "overall_score": 5.0,
            "accuracy": 50.0,
            "consistency": 50.0,
            "evaluation_text": "Evaluation failed"
        }


def show_memory_context(session: ContextChatSession):
    """Show memory context (recent exchanges)"""
    if not session.conversation_history:
        print("No memory context (recent exchanges).")
        return
    
    print(f"\nMemory Context ({len(session.conversation_history)} recent exchanges):")
    print("-" * 60)
    
    for i, exchange in enumerate(session.conversation_history, 1):
        print(f"Q{i}: {exchange['question']}")
        print(f"A{i}: {exchange['answer'][:200]}...")
        print()
    
    if session.conversation_summary:
        print(f"Summary: {session.conversation_summary}")
        print()


def show_vector_context(session: ContextChatSession):
    """Show vector context (stored exchanges)"""
    try:
        # Get collection stats
        stats = session.context_rag.vector_store.get_collection_stats("context_docs")
        if stats and stats.get("points_count", 0) > 0:
            print(f"\nVector Context ({stats['points_count']} stored exchanges):")
            print("-" * 60)
            print("Stored exchanges are available for retrieval based on similarity.")
            print("Use a question to see what relevant context would be retrieved.")
        else:
            print("No vector context (no stored exchanges yet).")
    except Exception as e:
        print(f"Could not access vector context: {e}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        mode = "interactive"
    
    run_context_llm_demo(mode)
