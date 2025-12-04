"""
Interactive RAG query command
REPL for querying the RAG system directly
"""

import typer
from cli.utils import print_header, print_section

app = typer.Typer(name="query", help="Interactive RAG query REPL")


def print_help():
    """Print help text"""
    print("\n[COMMANDS]")
    print("   Type your query to search the RAG system")
    print("   'help'   - Show this help")
    print("   'quit'   - Exit the query REPL")
    print("\n[FEATURES]")
    print("   • Direct RAG queries using persistant_docs collection")
    print("   • Shows retrieved context documents with similarity scores")
    print("   • LLM-generated answers based on retrieved context")


@app.command()
def interactive():
    """
    Start interactive RAG query REPL
    
    Queries the persistant_docs collection directly (no API server required)
    """
    print_header("GENAI RAG QUERY REPL")
    
    # Import required modules
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    
    from src.rag.rag_setup import BasicRAG
    from config import get_rag_config
    
    try:
        # Get configuration
        config = get_rag_config()
        print(f"\n[CONFIG]")
        print(f"   Model:    {config.model_name}")
        print(f"   Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
        print(f"   Collection: persistant_docs")
        
        # Initialize RAG system
        print("\n[INIT] Initializing RAG system...")
        rag = BasicRAG(
            config=config,
            collection_name="persistant_docs",
            use_persistent=config.use_persistent
        )
        
        # Check collection stats
        stats = rag.get_stats()
        print(f"\n[COLLECTION]")
        print(f"   Name:     {stats['collection_name']}")
        print(f"   Documents: {stats['document_count']}")
        
        if stats['document_count'] == 0:
            print("\n[WARNING] No documents found in collection!")
            print("   Run 'genai ingest' first to add documents.")
            print("   Continuing anyway...")
        
        print_help()
        
        # Query loop
        query_count = 0
        
        while True:
            try:
                print("\n" + "-" * 70)
                query = input("Query: ").strip()
                
                if not query:
                    continue
                
                # Handle commands
                if query.lower() in ['quit', 'exit', 'q']:
                    print("\n[EXIT] Ending query session...")
                    break
                elif query.lower() == 'help':
                    print_help()
                    continue
                
                # Execute query
                print("\n[SEARCHING] Querying RAG system...")
                query_count += 1
                
                result = rag.query(query, context_limit=config.top_k, max_tokens=config.max_chat_tokens)
                
                if isinstance(result, tuple):
                    answer, context_docs, context_scores = result
                else:
                    answer = result
                    context_docs = []
                    context_scores = []
                
                # Display results
                print_section("ANSWER")
                print(answer)
                
                if context_docs:
                    print_section("RETRIEVED CONTEXT")
                    print(f"   Found {len(context_docs)} relevant document(s):\n")
                    for i, (doc, score) in enumerate(zip(context_docs, context_scores), 1):
                        print(f"   [{i}] Similarity: {score:.3f}")
                        print(f"       {doc[:150]}...")
                        print()
                else:
                    print_section("CONTEXT")
                    print("   No relevant documents found")
                
                print(f"\n[QUERY #{query_count}] Completed")
            
            except KeyboardInterrupt:
                print("\n\n[EXIT] Query interrupted by user")
                break
            except EOFError:
                print("\n\n[EXIT] Ending query session...")
                break
            except Exception as e:
                print(f"\n[ERROR] Query failed: {e}")
                import traceback
                traceback.print_exc()
                print("Type 'quit' to exit or try another query.")
        
        print("\n[GOODBYE] Thanks for using GenAI Query!")
    
    except Exception as e:
        print(f"\n[ERROR] Failed to initialize RAG system: {e}")
        import traceback
        traceback.print_exc()
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Interactive RAG query - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(interactive)


