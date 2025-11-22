"""
Interactive chat command
Uses API client to chat with the GenAI system
"""

import typer
from cli.utils import APIClient, require_api_server, print_header, print_section

app = typer.Typer(name="chat", help="Interactive chat with conversation context")


def print_help():
    """Print help text"""
    print("\n[COMMANDS]")
    print("   Just type your message to chat")
    print("   'clear'  - Clear the chat session (reset context)")
    print("   'stats'  - Show session statistics")
    print("   'help'   - Show this help")
    print("   'quit'   - Exit the chat")
    print("\n[FEATURES]")
    print("   • Three-layer context: RAG + Summary + Recent messages")
    print("   • Stateful conversation maintained through API")
    print("   • Real-time metrics and performance tracking")


def display_response(response_data: dict):
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
    print(f"   Total:               {timings.get('total', response_data.get('response_time', 0)):.3f}s")
    
    # RAG info
    rag_info = response_data.get('rag_info', {})
    print("\n[RAG CONTEXT]")
    if rag_info.get('results_count', 0) > 0:
        print(f"   Found {rag_info['results_count']} relevant document(s)")
        for i, result in enumerate(rag_info.get('results', [])[:3], 1):
            print(f"   [{i}] Score: {result['score']:.3f} - {result['text'][:80]}...")
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


@app.command()
def interactive(
    base_url: str = typer.Option("http://127.0.0.1:8000", "--base-url", help="API server base URL")
):
    """
    Start interactive chat session
    
    Requires API server to be running (use 'genai server' in another terminal)
    """
    print_header("GENAI INTERACTIVE CHAT")
    
    # Initialize client
    client = APIClient(base_url)
    
    # Check API availability
    print("\n[STARTUP] Checking API connection...")
    if not require_api_server(client):
        raise typer.Exit(1)
    
    print("[OK] Connected to API server")
    
    # Show configuration
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
        from config import get_rag_config
        config = get_rag_config()
        print("\n[CONFIG]")
        print(f"   Model:    {config.model_name}")
        print(f"   Provider: {'Ollama (Local)' if config.use_ollama else 'Purdue API'}")
        print(f"   History:  {config.max_history_size} exchanges max")
        print(f"   Summary:  Regenerates every {config.summary_interval} messages")
    except Exception:
        pass  # Config display is optional
    
    print_help()
    
    # Chat loop
    message_count = 0
    session_id = "global"
    
    while True:
        try:
            print("\n" + "-" * 70)
            message = input("You: ").strip()
            
            if not message:
                continue
            
            # Handle commands
            if message.lower() in ['quit', 'exit', 'q']:
                print("\n[EXIT] Ending chat session...")
                break
            elif message.lower() == 'clear':
                print("\n[CLEAR] Clearing chat session...")
                if client.clear_session(session_id):
                    message_count = 0
                    print("[OK] Session cleared")
                else:
                    print("[ERROR] Failed to clear session")
                continue
            elif message.lower() == 'stats':
                print("\n[SESSION STATS]")
                print(f"   Messages sent:  {message_count}")
                print(f"   Session ID:     {session_id}")
                print(f"   Status:         {'Active' if message_count > 0 else 'New session'}")
                continue
            elif message.lower() == 'help':
                print_help()
                continue
            
            # Send message
            print("\n[THINKING] Processing your message...")
            response = client.chat(message, session_id)
            
            if response:
                message_count += 1
                display_response(response)
            else:
                print("\n[ERROR] Failed to get response from API")
                print("Check that the server is still running and try again.")
        
        except KeyboardInterrupt:
            print("\n\n[EXIT] Chat interrupted by user")
            break
        except EOFError:
            print("\n\n[EXIT] Ending chat session...")
            break
        except Exception as e:
            print(f"\n[ERROR] Unexpected error: {e}")
            print("Type 'quit' to exit or continue chatting.")
    
    print("\n[GOODBYE] Thanks for using GenAI Chat!")


# Default command (when just 'genai chat' is called)
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Interactive chat - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(interactive, base_url="http://127.0.0.1:8000")


