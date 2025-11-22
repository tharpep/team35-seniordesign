"""
LLM Chat Demo - Interactive API Testing
Test the stateful chat functionality with metrics display
"""

import os
import sys
import time
import requests
from datetime import datetime
from typing import Optional, Tuple

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from config import get_rag_config


class ChatDemoClient:
    """Client for testing the chat API"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session_id = "global"
        self.message_count = 0
    
    def check_health(self) -> Tuple[bool, Optional[str]]:
        """
        Check if API is running
        
        Returns:
            Tuple of (is_healthy, error_message)
        """
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                return True, None
            else:
                return False, f"API returned status {response.status_code}"
        except requests.ConnectionError:
            return False, "Cannot connect to API - is it running?"
        except requests.Timeout:
            return False, "API health check timed out"
        except Exception as e:
            return False, f"Health check failed: {e}"
    
    def send_message(self, message: str) -> Optional[dict]:
        """Send a chat message and get response"""
        try:
            start_time = time.time()
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "message": message,
                    "session_id": self.session_id
                },
                timeout=120  # 2 minute timeout for LLM response
            )
            
            request_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                data['total_request_time'] = request_time
                self.message_count += 1
                return data
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except requests.Timeout:
            print("[ERROR] Request timed out (>2 minutes)")
            return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None
    
    def clear_session(self) -> bool:
        """Clear the chat session"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/chat/session/{self.session_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                self.message_count = 0
                return True
            else:
                print(f"[ERROR] Failed to clear session: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[ERROR] Clear session failed: {e}")
            return False
    
    def display_response(self, response_data: dict):
        """Display chat response with metrics"""
        print("\n" + "=" * 70)
        print("[RESPONSE]")
        print("-" * 70)
        print(response_data['answer'])
        print("-" * 70)
        
        # Timing breakdown
        timings = response_data.get('timings', {})
        print("\n[TIMING BREAKDOWN]")
        print(f"   RAG Search:          {timings.get('rag_search', 0):.3f}s")
        print(f"   Query Optimization: {timings.get('query_optimization', 0):.3f}s")
        print(f"   Summary Generation:  {timings.get('summary_generation', 0):.3f}s")
        print(f"   LLM Call:            {timings.get('llm_call', 0):.3f}s")
        print(f"   Total (API):         {timings.get('total', response_data.get('response_time', 0)):.3f}s")
        print(f"   Total (Request):     {response_data.get('total_request_time', 0):.2f}s")
        
        # RAG info
        rag_info = response_data.get('rag_info', {})
        print("\n[RAG CONTEXT]")
        if rag_info.get('results_count', 0) > 0:
            print(f"   Found {rag_info['results_count']} relevant document(s)")
            for i, result in enumerate(rag_info.get('results', [])[:3], 1):
                print(f"   [{i}] Score: {result['score']:.3f} - {result['text']}")
        else:
            print("   No relevant documents found in RAG database")
        
        # General metrics
        print("\n[METRICS]")
        print(f"   Conversation Length: {response_data['conversation_length']} exchanges")
        print(f"   Session ID:          {response_data['session_id']}")
        
        # Context info
        print("\n[CONTEXT STATUS]")
        conv_len = response_data['conversation_length']
        if conv_len == 0:
            print("   • Fresh conversation (no history)")
        elif conv_len < 5:
            print(f"   • Building context ({conv_len} exchanges)")
        elif conv_len < 10:
            print(f"   • Active conversation ({conv_len} exchanges)")
            print("   • Summary will be generated soon")
        else:
            print(f"   • Long conversation ({conv_len} exchanges)")
            print("   • Using cached summary + recent history")
        
        print("=" * 70)


def print_header():
    """Print demo header"""
    print("\n" + "=" * 70)
    print("LLM CHAT DEMO - Interactive API Testing")
    print("=" * 70)
    
    # Show configuration
    config = get_rag_config()
    print(f"\n[CONFIG]")
    print(f"   Model:    {config.model_name}")
    print(f"   Provider: {'Ollama (Local)' if config.use_ollama else 'Purdue API'}")
    print(f"   History:  {config.max_history_size} exchanges max")
    print(f"   Summary:  Regenerates every {config.summary_interval} messages")


def print_help():
    """Print help text"""
    print("\n[COMMANDS]")
    print("   Just type your message to chat")
    print("   'clear'  - Clear the chat session (reset context)")
    print("   'stats'  - Show session statistics")
    print("   'help'   - Show this help")
    print("   'quit'   - Exit the demo")
    print("\n[FEATURES]")
    print("   • Three-layer context: RAG + Summary + Recent messages")
    print("   • Stateful conversation maintained through API")
    print("   • Real-time metrics and performance tracking")


def show_stats(client: ChatDemoClient):
    """Show session statistics"""
    print("\n[SESSION STATS]")
    print(f"   Messages sent:  {client.message_count}")
    print(f"   Session ID:     {client.session_id}")
    print(f"   Status:         {'Active' if client.message_count > 0 else 'New session'}")


def run_interactive_demo():
    """Run interactive chat demo"""
    print_header()
    
    # Initialize client
    client = ChatDemoClient()
    
    # Check API availability
    print("\n[STARTUP] Checking API connection...")
    is_healthy, error_msg = client.check_health()
    if not is_healthy:
        print(f"[ERROR] API is not available!")
        if error_msg:
            print(f"   Reason: {error_msg}")
        print("\nPlease start the API first in a separate terminal:")
        print("   cd gen-ai")
        print("   python -m src.api.main")
        print("\nThen run this demo again.")
        return
    
    print("[OK] API is running and healthy")
    
    # Show help
    print_help()
    
    # Interactive loop
    print("\n" + "=" * 70)
    print("Ready to chat! Type your message below:")
    print("=" * 70)
    
    while True:
        try:
            # Get user input
            print(f"\n[You] ({client.message_count} messages sent)")
            user_message = input("> ").strip()
            
            # Handle empty input
            if not user_message:
                continue
            
            # Handle commands
            if user_message.lower() in ['quit', 'exit', 'q']:
                print("\n[EXIT] Goodbye!")
                break
            
            elif user_message.lower() == 'clear':
                print("\n[ACTION] Clearing chat session...")
                if client.clear_session():
                    print("[OK] Session cleared successfully")
                    print("     Starting fresh conversation")
                continue
            
            elif user_message.lower() == 'stats':
                show_stats(client)
                continue
            
            elif user_message.lower() == 'help':
                print_help()
                continue
            
            # Send message to API
            print(f"\n[PROCESSING] Sending message to LLM...")
            response_data = client.send_message(user_message)
            
            if response_data:
                client.display_response(response_data)
            else:
                print("[ERROR] Failed to get response from API")
        
        except KeyboardInterrupt:
            print("\n\n[EXIT] Interrupted by user. Goodbye!")
            break
        
        except Exception as e:
            print(f"\n[ERROR] Unexpected error: {e}")
            import traceback
            print(f"Traceback:\n{traceback.format_exc()}")


def run_automated_test():
    """Run automated test sequence"""
    print_header()
    print("\n[MODE] Automated Testing")
    
    # Initialize client
    client = ChatDemoClient()
    
    # Check API
    print("\n[1/5] Checking API connection...")
    is_healthy, error_msg = client.check_health()
    if not is_healthy:
        print(f"[ERROR] API is not available!")
        if error_msg:
            print(f"   Reason: {error_msg}")
        print("\nPlease start the API first:")
        print("   cd gen-ai")
        print("   python -m src.api.main")
        return
    print("[OK] API is available and healthy")
    
    # Test messages
    test_messages = [
        "Hello! What's your name?",
        "Can you help me understand Newton's first law of motion?",
        "How does it relate to everyday life?",
        "Thanks for the explanation!"
    ]
    
    print(f"\n[2/5] Sending {len(test_messages)} test messages...")
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n--- Test Message {i}/{len(test_messages)} ---")
        print(f"[You] {message}")
        
        response_data = client.send_message(message)
        
        if response_data:
            print(f"\n[Assistant] {response_data['answer'][:200]}...")
            print(f"\n[Metrics] Response: {response_data['response_time']:.2f}s | "
                  f"Conversation: {response_data['conversation_length']} exchanges")
        else:
            print("[ERROR] Test message failed")
            break
        
        time.sleep(1)  # Brief pause between messages
    
    print("\n[3/5] Checking session state...")
    show_stats(client)
    
    print("\n[4/5] Clearing session...")
    if client.clear_session():
        print("[OK] Session cleared")
    
    print("\n[5/5] Verifying fresh session...")
    response_data = client.send_message("Hello again!")
    if response_data:
        print(f"[OK] Fresh session has {response_data['conversation_length']} exchanges (should be 1)")
    
    print("\n[COMPLETE] Automated test completed successfully!")


def run_llm_chat_demo(mode="interactive"):
    """
    Main entry point for LLM Chat Demo
    Called by the run script with mode parameter
    
    Args:
        mode: "interactive" or "automated"
    """
    if mode == "automated":
        run_automated_test()
    else:
        run_interactive_demo()


def main():
    """Main function for direct execution"""
    import sys
    
    # Check for mode argument
    mode = "interactive"
    if len(sys.argv) > 1:
        if sys.argv[1] in ["auto", "automated", "test"]:
            mode = "automated"
    
    run_llm_chat_demo(mode)


if __name__ == "__main__":
    main()

