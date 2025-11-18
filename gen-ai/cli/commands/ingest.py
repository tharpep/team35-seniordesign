"""
Document ingestion command
Ingests documents from default folder into RAG system
"""

import typer
from pathlib import Path
from cli.utils import get_documents_path, print_header, print_section

app = typer.Typer(name="ingest", help="Ingest documents into RAG system")


@app.command()
def documents(
    path: str = typer.Option(
        None,
        "--path",
        help="Path to documents folder (defaults to src/data/documents/notes/)"
    )
):
    """
    Ingest documents from folder into RAG system
    
    Defaults to src/data/documents/notes/ if no path specified.
    Processes all .txt and .md files in the folder.
    """
    print_header("DOCUMENT INGESTION")
    
    # Determine path
    if path:
        documents_path = Path(path)
    else:
        documents_path = get_documents_path()
    
    print(f"\n[PATH] Ingesting from: {documents_path}")
    
    if not documents_path.exists():
        print(f"[ERROR] Path does not exist: {documents_path}")
        raise typer.Exit(1)
    
    if not documents_path.is_dir():
        print(f"[ERROR] Path is not a directory: {documents_path}")
        raise typer.Exit(1)
    
    # Import required modules
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    
    from src.rag.rag_setup import BasicRAG
    from src.rag.document_ingester import DocumentIngester
    from config import get_rag_config
    
    try:
        # Get configuration
        config = get_rag_config()
        print(f"\n[CONFIG]")
        print(f"   Model:    {config.model_name}")
        print(f"   Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
        print(f"   Storage:  {'Persistent' if config.use_persistent else 'In-memory'}")
        print(f"   Collection: {config.collection_name}")
        
        # Initialize RAG system
        print("\n[INIT] Initializing RAG system...")
        rag = BasicRAG(
            config=config,
            collection_name=config.collection_name,
            use_persistent=config.use_persistent
        )
        
        # Check if we should clear collection
        if config.clear_on_ingest:
            print("\n[CLEAR] Clearing existing documents...")
            clear_result = rag.clear_collection()
            if clear_result.get("success"):
                print(f"[OK] {clear_result['message']}")
            else:
                print(f"[WARNING] {clear_result.get('error', 'Failed to clear collection')}")
        
        # Initialize ingester
        print("\n[INGEST] Starting document ingestion...")
        ingester = DocumentIngester(rag)
        
        # Ingest folder
        result = ingester.ingest_folder(str(documents_path))
        
        if result.get("success"):
            print_section("INGESTION RESULTS")
            print(f"   Processed: {result['processed']} files")
            print(f"   Failed:    {result['failed']} files")
            print(f"   Total chunks indexed: {sum(f.get('chunks', 0) for f in result.get('files', []))}")
            
            if result.get('errors'):
                print("\n[ERRORS]")
                for error in result['errors'][:5]:  # Show first 5 errors
                    print(f"   {error}")
                if len(result['errors']) > 5:
                    print(f"   ... and {len(result['errors']) - 5} more errors")
            
            print_section("SUCCESS")
            print(f"[OK] Documents ingested successfully!")
            print(f"   Collection: {config.collection_name}")
            print(f"   Ready for queries and artifact generation")
        else:
            print(f"\n[ERROR] Ingestion failed: {result.get('error', 'Unknown error')}")
            raise typer.Exit(1)
    
    except Exception as e:
        print(f"\n[ERROR] Failed to ingest documents: {e}")
        import traceback
        traceback.print_exc()
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Document ingestion - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(documents)


