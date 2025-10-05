"""
Data Ingestion Demo - Clears and ingests documents into RAG system
Prepares data for quick RAG demo usage
"""

import os
import sys
import time
from pathlib import Path

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.rag.rag_setup import BasicRAG
from src.rag.document_ingester import DocumentIngester
from config import get_rag_config
from logging_config import log_rag_result


def run_data_ingestion_demo(mode="automated"):
    """Run data ingestion demo - clears existing docs and ingests new data"""
    print("=== Data Ingestion Demo ===")
    
    # Get configuration
    config = get_rag_config()
    print(f"Using model: {config.model_name}")
    print(f"Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    print(f"Collection: {config.collection_name}")
    
    try:
        # Initialize RAG system
        print("\nInitializing RAG system...")
        rag = BasicRAG()
        
        # Clear existing documents
        print("🧹 Clearing existing documents...")
        clear_result = rag.clear_collection()
        if clear_result.get("success"):
            print(f"✅ {clear_result['message']}")
        else:
            print(f"⚠️  Warning: {clear_result.get('error', 'Failed to clear collection')}")
        
        # Load documents
        print("📚 Loading documents...")
        documents_folder = Path(__file__).parent.parent / "data" / "documents" / "notes"
        
        if not documents_folder.exists():
            print(f"❌ Documents folder not found: {documents_folder}")
            return
        
        print(f"📁 Found documents folder: {documents_folder}")
        
        # Show available files
        markdown_files = list(documents_folder.glob("*.md"))
        print(f"📄 Found {len(markdown_files)} markdown files:")
        for i, file in enumerate(markdown_files, 1):
            print(f"   {i}. {file.name}")
        
        if not markdown_files:
            print("❌ No markdown files found in documents folder!")
            return
        
        # Ingest documents
        ingester = DocumentIngester(rag)
        result = ingester.ingest_folder(str(documents_folder))
        
        if result["success"]:
            print(f"✅ Successfully ingested {result['processed']} documents")
            print(f"📊 Total chunks created: {sum(f['chunks'] for f in result['files'])}")
            
            # Show detailed results
            print("\n📋 Ingestion Details:")
            for file_info in result['files']:
                # Handle different file_info structures
                success = file_info.get('success', True)  # Default to True if not present
                status = "✅" if success else "❌"
                filename = file_info.get('filename', file_info.get('file', 'Unknown'))
                chunks = file_info.get('chunks', 0)
                print(f"   {status} {filename}: {chunks} chunks")
                if not success:
                    print(f"      Error: {file_info.get('error', 'Unknown error')}")
            
            if result['failed'] > 0:
                print(f"⚠️  {result['failed']} files failed to process")
        else:
            print(f"❌ Document ingestion failed: {result['error']}")
            return
        
        # Show final collection stats
        print("\n📊 Final Collection Statistics:")
        try:
            stats = rag.get_stats()
            print(f"   Collection: {config.collection_name}")
            print(f"   Total Documents: {stats.get('points_count', 0)}")
            print(f"   Vector Dimensions: {stats.get('vector_size', 'Unknown')}")
            print(f"   Distance Metric: {stats.get('distance', 'Unknown')}")
        except Exception as e:
            print(f"⚠️  Could not get collection stats: {e}")
        
        # Test a quick query to verify ingestion
        if mode == "automated":
            print("\n🧪 Testing ingestion with sample query...")
            test_query = "What is calculus?"
            try:
                start_time = time.time()
                result = rag.query(test_query)
                response_time = time.time() - start_time
                
                # Handle new return format (answer, context_docs, context_scores)
                if isinstance(result, tuple):
                    answer, context_docs, context_scores = result
                else:
                    # Fallback for old format
                    answer = result
                    context_docs = []
                    context_scores = []
                
                print(f"✅ Test Query: '{test_query}'")
                print(f"📖 Response: {answer[:200]}...")
                print(f"⏱️  Response Time: {response_time:.2f} seconds")
                print(f"📚 Retrieved {len(context_docs)} context documents")
                
                # Log the test result
                log_rag_result(
                    question=test_query,
                    answer=answer,
                    response_time=response_time,
                    model_name=config.model_name,
                    provider="Ollama" if config.use_ollama else "Purdue API",
                    context_docs=context_docs,
                    context_scores=context_scores
                )
                
            except Exception as e:
                print(f"❌ Test query failed: {e}")
                import traceback
                print(f"Full traceback:\n{traceback.format_exc()}")
        
        print(f"\n🎉 Data ingestion completed successfully!")
        print(f"💡 You can now run the Quick RAG Demo to use this data")
        
    except Exception as e:
        print(f"❌ Failed to run data ingestion demo: {e}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")


def show_ingestion_status():
    """Show current status of document ingestion"""
    print("=== Ingestion Status ===")
    
    try:
        config = get_rag_config()
        rag = BasicRAG()
        
        # Check collection stats
        stats = rag.get_stats()
        print(f"📊 Collection: {config.collection_name}")
        print(f"📄 Documents: {stats.get('points_count', 0)}")
        print(f"🔢 Vector Dimensions: {stats.get('vector_size', 'Unknown')}")
        print(f"📏 Distance Metric: {stats.get('distance', 'Unknown')}")
        
        # Check documents folder
        documents_folder = Path(__file__).parent.parent / "data" / "documents" / "notes"
        if documents_folder.exists():
            markdown_files = list(documents_folder.glob("*.md"))
            print(f"\n📁 Documents Folder: {documents_folder}")
            print(f"📄 Available Files: {len(markdown_files)}")
            for file in markdown_files:
                print(f"   • {file.name}")
        else:
            print(f"\n❌ Documents folder not found: {documents_folder}")
        
    except Exception as e:
        print(f"❌ Could not get ingestion status: {e}")


def clear_collection_only():
    """Clear the collection without re-ingesting"""
    print("=== Clear Collection Only ===")
    
    try:
        rag = BasicRAG()
        clear_result = rag.clear_collection()
        
        if clear_result.get("success"):
            print(f"✅ {clear_result['message']}")
        else:
            print(f"❌ Failed to clear collection: {clear_result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Failed to clear collection: {e}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        mode = "automated"
    
    if mode == "status":
        show_ingestion_status()
    elif mode == "clear":
        clear_collection_only()
    else:
        run_data_ingestion_demo(mode)
