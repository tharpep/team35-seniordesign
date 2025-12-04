"""
Configuration display command
Shows current system configuration
"""

import typer
from cli.utils import print_header

app = typer.Typer(name="config", help="Show current configuration")


@app.command()
def show():
    """
    Display current configuration settings
    """
    print_header("GENAI CONFIGURATION")
    
    # Import config
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    
    try:
        from config import get_rag_config
        
        config = get_rag_config()
        
        print("\n[HARDWARE CONFIGURATION]")
        print(f"   Platform: {'Laptop' if config.use_laptop else 'PC'}")
        print(f"   Model:     {config.model_name}")
        
        print("\n[AI PROVIDER SETTINGS]")
        print(f"   Provider:  {'Ollama (Local)' if config.use_ollama else 'Purdue API'}")
        
        print("\n[VECTOR STORE SETTINGS]")
        print(f"   Storage:   {'Persistent' if config.use_persistent else 'In-memory'}")
        print(f"   Collection: {config.collection_name}")
        print(f"   Clear on ingest: {config.clear_on_ingest}")
        
        print("\n[RETRIEVAL SETTINGS]")
        print(f"   Top-K:     {config.top_k}")
        print(f"   Similarity threshold: {config.similarity_threshold}")
        
        print("\n[GENERATION SETTINGS]")
        print(f"   Max tokens (artifacts): {config.max_tokens}")
        print(f"   Max tokens (chat):      {config.max_chat_tokens}")
        print(f"   Temperature:            {config.temperature}")
        
        print("\n[CHAT SESSION SETTINGS]")
        print(f"   Max history size:  {config.max_history_size}")
        print(f"   Summary interval:  {config.summary_interval}")
        
        print("\n[NOTE]")
        print("   You can override these settings by:")
        print("   - Editing config.py")
        print("   - Setting environment variables:")
        print("     USE_LAPTOP, USE_OLLAMA, USE_PERSISTENT, COLLECTION_NAME")
        
    except ImportError as e:
        print(f"\n[ERROR] Could not import config module: {e}")
        raise typer.Exit(1)
    except Exception as e:
        print(f"\n[ERROR] Failed to load configuration: {e}")
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Show configuration - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(show)


