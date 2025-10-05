"""
LLM Demo - Direct communication with AI providers
Basic testing for LLM functionality without RAG
"""

import os
import sys
import time
from pathlib import Path
# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.ai_providers.gateway import AIGateway
from src.ai_providers.purdue_api import PurdueGenAI
from src.ai_providers.local import OllamaClient
from config import get_rag_config
from logging_config import log_rag_result


def run_llm_demo(mode="automated"):
    """Run LLM demo in automated or interactive mode"""
    print("=== LLM Demo ===")
    
    # Get configuration
    config = get_rag_config()
    print(f"Using model: {config.model_name}")
    print(f"Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    
    try:
        # Initialize AI Gateway
        print("\nInitializing AI Gateway...")
        gateway = AIGateway()
        
        # Show available providers
        available_providers = gateway.get_available_providers()
        print(f"Available providers: {', '.join(available_providers)}")
        
        if not available_providers:
            print("❌ No AI providers available!")
            return
        
        # Show stats
        print(f"\n✅ AI Gateway initialized successfully")
        print(f"✅ Ready to chat with {len(available_providers)} provider(s)")
        
        if mode == "interactive":
            # Interactive mode
            print("\n=== Interactive Mode ===")
            print("Type 'quit', 'exit', or 'q' to stop")
            print("Type 'switch' to change providers")
            print("Type 'providers' to see available providers")
            print("Type 'help' for more commands")
            
            current_provider = None
            if available_providers:
                current_provider = available_providers[0]
                print(f"Current provider: {current_provider}")
            
            while True:
                question = input("\nQuestion: ").strip()
                if question.lower() in ['quit', 'exit', 'q']:
                    break
                
                if question.lower() == 'help':
                    print("\nAvailable commands:")
                    print("  quit/exit/q - Exit the demo")
                    print("  switch - Switch to a different provider")
                    print("  providers - Show available providers")
                    print("  Any other text - Ask a question to the LLM")
                    continue
                
                if question.lower() == 'providers':
                    print(f"\nAvailable providers: {', '.join(available_providers)}")
                    if current_provider:
                        print(f"Current provider: {current_provider}")
                    continue
                
                if question.lower() == 'switch':
                    if len(available_providers) > 1:
                        print(f"\nAvailable providers: {', '.join(available_providers)}")
                        choice = input("Enter provider name: ").strip()
                        if choice in available_providers:
                            current_provider = choice
                            print(f"Switched to: {current_provider}")
                        else:
                            print(f"Invalid provider. Available: {', '.join(available_providers)}")
                    else:
                        print("Only one provider available.")
                    continue
                
                if question:
                    print("LLM: Thinking...")
                    try:
                        start_time = time.time()
                        
                        # Use specific provider if specified, otherwise use gateway's default
                        if current_provider:
                            result = gateway.chat(question, provider=current_provider)
                        else:
                            result = gateway.chat(question)
                        
                        response_time = time.time() - start_time
                        
                        print(f"LLM: {result}")
                        
                        # Log the result
                        log_rag_result(
                            question=question,
                            answer=result,
                            response_time=response_time,
                            model_name=config.model_name,
                            provider=current_provider or "Gateway Default",
                            context_docs=[],
                            context_scores=[]
                        )
                        
                    except Exception as e:
                        print(f"❌ Error:")
                        print(f"Raw error: {e}")
                        import traceback
                        print(f"Full traceback:\n{traceback.format_exc()}")
        else:
            # Automated mode - run test queries
            print("\n=== Automated Mode ===")
            test_queries = [
                "What is artificial intelligence?",
                "Explain the concept of machine learning",
                "What are the benefits of renewable energy?",
                "How does photosynthesis work?",
                "What is the difference between a list and a tuple in Python?",
                "Explain the water cycle"
            ]
            
            for query in test_queries:
                print(f"\nQ: {query}")
                try:
                    start_time = time.time()
                    result = gateway.chat(query)
                    response_time = time.time() - start_time
                    
                    print(f"A: {result[:200]}...")  # Truncate long answers
                    
                    # Log the result
                    log_rag_result(
                        question=query,
                        answer=result,
                        response_time=response_time,
                        model_name=config.model_name,
                        provider="Gateway Default",
                        context_docs=[],
                        context_scores=[]
                    )
                    
                except Exception as e:
                    print(f"Error: {e}")
                    import traceback
                    print(f"Full traceback:\n{traceback.format_exc()}")
    
    except Exception as e:
        print(f"❌ Failed to initialize LLM demo: {e}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")


def test_individual_providers():
    """Test individual providers directly"""
    print("=== Individual Provider Tests ===")
    
    config = get_rag_config()
    
    # Test Purdue API if available
    if not config.use_ollama:
        print("\n--- Testing Purdue API ---")
        try:
            purdue_client = PurdueGenAI()
            test_question = "What is the capital of France?"
            print(f"Q: {test_question}")
            
            start_time = time.time()
            result = purdue_client.chat(test_question)
            response_time = time.time() - start_time
            
            print(f"A: {result}")
            print(f"Response time: {response_time:.2f} seconds")
            
        except Exception as e:
            print(f"❌ Purdue API test failed: {e}")
    
    # Test Ollama if available
    if config.use_ollama:
        print("\n--- Testing Ollama ---")
        try:
            ollama_client = OllamaClient()
            test_question = "What is the largest planet in our solar system?"
            print(f"Q: {test_question}")
            
            start_time = time.time()
            result = ollama_client.chat(test_question)
            response_time = time.time() - start_time
            
            print(f"A: {result}")
            print(f"Response time: {response_time:.2f} seconds")
            
        except Exception as e:
            print(f"❌ Ollama test failed: {e}")


def run_provider_comparison():
    """Compare responses from different providers"""
    print("=== Provider Comparison ===")
    
    config = get_rag_config()
    test_question = "Explain the concept of gravity in simple terms."
    
    print(f"Test question: {test_question}")
    print("-" * 50)
    
    # Test Purdue API
    if not config.use_ollama:
        print("\n--- Purdue API Response ---")
        try:
            purdue_client = PurdueGenAI()
            start_time = time.time()
            purdue_result = purdue_client.chat(test_question)
            purdue_time = time.time() - start_time
            
            print(f"Response: {purdue_result}")
            print(f"Time: {purdue_time:.2f} seconds")
            
        except Exception as e:
            print(f"❌ Purdue API failed: {e}")
    
    # Test Ollama
    if config.use_ollama:
        print("\n--- Ollama Response ---")
        try:
            ollama_client = OllamaClient()
            start_time = time.time()
            ollama_result = ollama_client.chat(test_question)
            ollama_time = time.time() - start_time
            
            print(f"Response: {ollama_result}")
            print(f"Time: {ollama_time:.2f} seconds")
            
        except Exception as e:
            print(f"❌ Ollama failed: {e}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        mode = "automated"
    
    if mode == "interactive":
        run_llm_demo("interactive")
    elif mode == "test":
        test_individual_providers()
    elif mode == "compare":
        run_provider_comparison()
    else:
        run_llm_demo("automated")
