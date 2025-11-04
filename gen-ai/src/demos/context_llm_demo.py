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
from config import get_rag_config
from logging_config import log_rag_result


class ContextChatSession:
    """Manages a context-aware chat session with conversation history"""
    
    def __init__(self):
        self.config = get_rag_config()
        self.gateway = AIGateway()
        self.conversation_history = []
        self.max_history = 10  # Keep last 10 exchanges
        
    def add_to_history(self, question: str, answer: str):
        """Add exchange to conversation history"""
        exchange = {
            "question": question,
            "answer": answer,
            "timestamp": time.time()
        }
        self.conversation_history.append(exchange)
        
        # Keep only recent history
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-self.max_history:]
    
    def get_conversation_context(self) -> str:
        """Get formatted conversation context for the LLM"""
        if not self.conversation_history:
            return ""
        
        context = "Our conversation so far:\n"
        for i, exchange in enumerate(self.conversation_history[-3:], 1):  # Last 3 exchanges
            context += f"Q{i}: {exchange['question']}\n"
            context += f"A{i}: {exchange['answer'][:200]}...\n\n"
        
        return context
    
    def chat_with_context(self, question: str) -> Dict[str, Any]:
        """Process question with conversation context only"""
        print("Processing with conversation context...")
        
        # Build conversation context for the LLM
        conversation_context = self.get_conversation_context()
        
        # Create the full prompt with context
        if conversation_context:
            full_prompt = f"{conversation_context}Now, {question}"
        else:
            full_prompt = question
        
        # Use the gateway to get response
        start_time = time.time()
        answer = self.gateway.chat(full_prompt)
        response_time = time.time() - start_time
        
        # Clean up answer for Windows console compatibility
        if isinstance(answer, str):
            # Remove problematic Unicode characters
            answer = answer.encode('ascii', 'ignore').decode('ascii')
        
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
    print("Interactive chat with conversation context")
    
    try:
        # Initialize chat session
        print("\nInitializing chat system...")
        session = ContextChatSession()
        
        print(f"[OK] Using model: {session.config.model_name}")
        print(f"[OK] Provider: {'Ollama' if session.config.use_ollama else 'Purdue API'}")
        print(f"[OK] Chat system ready with conversation context")
        
        if mode == "interactive":
            run_interactive_mode(session)
        else:
            run_automated_mode(session)
            
    except Exception as e:
        print(f"[ERROR] Failed to initialize context demo: {e}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")


def run_interactive_mode(session: ContextChatSession):
    """Run interactive chat mode"""
    print("\n=== Interactive Context Chat ===")
    print("Commands:")
    print("  /context - Show conversation history")
    print("  /clear - Clear conversation history")
    print("  /help - Show this help")
    print("  quit/exit/q - Exit the demo")
    print("\nStart chatting! (All questions will use conversation context)")
    
    while True:
        question = input("\nYou: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        if question.lower() == '/help':
            print("\nCommands:")
            print("  /context - Show conversation history")
            print("  /clear - Clear conversation history")
            print("  /help - Show this help")
            print("  quit/exit/q - Exit the demo")
            print("  Any other text - Ask a question with context")
            continue
        
        if question.lower() == '/context':
            show_conversation_context(session)
            continue
        
        if question.lower() == '/clear':
            session.conversation_history = []
            print("Conversation history cleared!")
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
                print(f"❌ Error: {e}")
                import traceback
                print(f"Full traceback:\n{traceback.format_exc()}")


def run_automated_mode(session: ContextChatSession):
    """Run automated demo mode"""
    print("\n=== Automated Context Demo ===")
    
    test_questions = [
        "What is machine learning?",
        "How does it relate to artificial intelligence?",
        "Can you give me an example of a machine learning algorithm?",
        "What are the different types of machine learning?"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n--- Question {i} ---")
        print(f"Q: {question}")
        
        try:
            result = session.chat_with_context(question)
            
            print(f"A: {result['answer'][:200]}...")
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


def show_conversation_context(session: ContextChatSession):
    """Show current conversation context"""
    if not session.conversation_history:
        print("No conversation history yet.")
        return
    
    print(f"\nConversation History ({len(session.conversation_history)} exchanges):")
    print("-" * 50)
    
    for i, exchange in enumerate(session.conversation_history, 1):
        print(f"\n{i}. Q: {exchange['question']}")
        print(f"   A: {exchange['answer'][:150]}...")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        mode = "interactive"
    
    run_context_llm_demo(mode)
