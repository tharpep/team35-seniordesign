"""
Quick RAG Demo - Uses pre-ingested data with study session context
Fast demo that doesn't need to re-ingest documents
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


def run_quick_rag_demo(mode="automated"):
    """Run quick RAG demo using pre-ingested data with study session context"""
    print("=== Quick RAG Demo (Pre-ingested Data) ===")
    
    # Get configuration
    config = get_rag_config()
    print(f"Using model: {config.model_name}")
    print(f"Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    
    try:
        # Initialize RAG system (uses existing collection)
        print("\nInitializing RAG system with existing data...")
        rag = BasicRAG()
        
        # Check if we have existing data
        try:
            stats = rag.get_stats()
            doc_count = stats.get('points_count', 0)
            if doc_count > 0:
                print(f"✅ Found existing collection with {doc_count} documents")
            else:
                print("⚠️  Collection exists but is empty")
                print("💡 Run the Data Ingestion Demo first to populate the collection")
                return
        except Exception as e:
            print(f"⚠️  No existing data found: {e}")
            print("💡 Run the Data Ingestion Demo first to create and populate the collection")
            return
        
        # Show final stats
        try:
            final_stats = rag.get_stats()
            print(f"\n📊 Collection stats:")
            print(f"   Documents: {final_stats.get('points_count', 0)}")
            print(f"   Collection: {config.collection_name}")
        except Exception as e:
            print(f"⚠️  Could not get final stats: {e}")
        
        if mode == "interactive":
            # Interactive mode
            print("\n=== Interactive Mode ===")
            print("Ask questions about your study topics:")
            print("- Calculus and derivatives")
            print("- Linear algebra and matrices") 
            print("- Python programming and OOP")
            print("- Physics and Newton's laws")
            print("- Study techniques and exam prep")
            print("\nType 'quit', 'exit', or 'q' to stop")
            print("Type 'help' for more commands")
            
            while True:
                question = input("\nStudy Question: ").strip()
                if question.lower() in ['quit', 'exit', 'q']:
                    break
                
                if question.lower() == 'help':
                    print("\nAvailable commands:")
                    print("  quit/exit/q - Exit the demo")
                    print("  Any other text - Ask a study question")
                    continue
                
                if question:
                    print("🤔 Thinking about your study question...")
                    try:
                        start_time = time.time()
                        result = rag.query(question)
                        response_time = time.time() - start_time
                        
                        # Handle new return format (answer, context_docs, context_scores)
                        if isinstance(result, tuple):
                            answer, context_docs, context_scores = result
                        else:
                            # Fallback for old format
                            answer = result
                            context_docs = []
                            context_scores = []
                        
                        print(f"📖 Study Assistant: {answer}")
                        
                        # Log the result
                        log_rag_result(
                            question=question,
                            answer=answer,
                            response_time=response_time,
                            model_name=config.model_name,
                            provider="Ollama" if config.use_ollama else "Purdue API",
                            context_docs=context_docs,
                            context_scores=context_scores
                        )
                        
                    except Exception as e:
                        print(f"❌ Error:")
                        print(f"Raw error: {e}")
                        import traceback
                        print(f"Full traceback:\n{traceback.format_exc()}")
        else:
            # Automated mode - run test queries
            print("\n=== Automated Mode ===")
            study_queries = [
                "How do I know when to use the chain rule vs product rule in calculus?",
                "What's the difference between row and column vectors in linear algebra?",
                "How do I implement multiple inheritance in Python classes?",
                "What's the relationship between force, mass, and acceleration in physics?",
                "What are some effective study techniques for mathematics?",
                "How can I improve my focus during long study sessions?",
                "What's the best way to prepare for a calculus exam?",
                "How do I approach word problems in physics?"
            ]
            
            for query in study_queries:
                print(f"\n📚 Study Question: {query}")
                try:
                    start_time = time.time()
                    result = rag.query(query)
                    response_time = time.time() - start_time
                    
                    # Handle new return format (answer, context_docs, context_scores)
                    if isinstance(result, tuple):
                        answer, context_docs, context_scores = result
                    else:
                        # Fallback for old format
                        answer = result
                        context_docs = []
                        context_scores = []
                    
                    print(f"📖 Answer: {answer[:150]}...")  # Truncate long answers
                    
                    # Log the result
                    log_rag_result(
                        question=query,
                        answer=answer,
                        response_time=response_time,
                        model_name=config.model_name,
                        provider="Ollama" if config.use_ollama else "Purdue API",
                        context_docs=context_docs,
                        context_scores=context_scores
                    )
                    
                except Exception as e:
                    print(f"Error: {e}")
                    import traceback
                    print(f"Full traceback:\n{traceback.format_exc()}")
    
    except Exception as e:
        print(f"❌ Failed to initialize quick RAG demo: {e}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")


def show_study_session_summary():
    """Show a summary of the current study session context"""
    print("=== Study Session Summary ===")
    print("📚 Current Study Session:")
    print("   Student: Alex Johnson")
    print("   Date: December 15, 2024")
    print("   Time: 2:00 PM - 4:00 PM")
    print("   Location: University Library, Room 302")
    print("")
    print("🎯 Current Topics:")
    print("   • Calculus: Derivatives and chain rule")
    print("   • Linear Algebra: Matrix operations and eigenvalues")
    print("   • Python: Object-oriented programming and inheritance")
    print("   • Physics: Newton's laws and problem-solving")
    print("")
    print("📈 Progress:")
    print("   • Energy Level: Good (7/10)")
    print("   • Focus: Moderate (6/10)")
    print("   • Confidence: Improving (5/10)")
    print("   • Motivation: High (8/10)")
    print("")
    print("🎯 Goals for This Session:")
    print("   • Master derivative rules")
    print("   • Understand matrix operations")
    print("   • Practice OOP design patterns")
    print("   • Review physics formulas")
    print("   • Create exam study notes")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        mode = sys.argv[1]
    else:
        mode = "automated"
    
    if mode == "summary":
        show_study_session_summary()
    else:
        run_quick_rag_demo(mode)
