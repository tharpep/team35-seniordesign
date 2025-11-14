"""
Real-Time Artifact Injection Demo
Demonstrates generating artifacts and injecting them into webapp database
"""

import sys
import os
import time
from pathlib import Path

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.rag.rag_setup import BasicRAG
from src.artifact_creation.generators import FlashcardGenerator, MCQGenerator, InsightsGenerator
from src.artifact_creation.artifact_injector import ArtifactInjector
from config import get_rag_config


def run_injection_demo(session_id=None, backend_url="http://localhost:3001"):
    """
    Run complete demo: generate artifacts and inject into webapp
    
    Args:
        session_id: Optional session ID. If None, uses most recent session
        backend_url: Backend URL (default: http://localhost:3001)
    """
    print("=" * 70)
    print("  REAL-TIME ARTIFACT INJECTION DEMO")
    print("=" * 70)
    print()
    
    # Get configuration
    config = get_rag_config()
    print(f"📝 Configuration:")
    print(f"   Model: {config.model_name}")
    print(f"   Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    print(f"   Backend: {backend_url}")
    print()
    
    # Initialize injector and check backend health
    print("🔍 Step 1: Checking backend connection...")
    injector = ArtifactInjector(backend_url)
    
    if not injector.health_check():
        print()
        print("❌ ERROR: Cannot connect to backend!")
        print()
        print("Please start the backend server first:")
        print("  cd webapp/backend")
        print("  npm start")
        print()
        return False
    print("   ✓ Backend is running and healthy")
    print()
    
    # Initialize RAG system
    print("🔍 Step 2: Initializing RAG system...")
    try:
        rag = BasicRAG()
        stats = rag.get_stats()
        print(f"   Collection: {stats['collection_name']}")
        print(f"   Documents: {stats['document_count']}")
        
        if stats['document_count'] == 0:
            print("   ⚠ Warning: No documents in vector store")
            print("   Artifacts will be generated with limited context")
        else:
            print("   ✓ RAG system ready")
        print()
    except Exception as e:
        print(f"   ✗ Failed to initialize RAG: {str(e)}")
        return False
    
    # Initialize generators
    print("🔍 Step 3: Initializing artifact generators...")
    try:
        flashcard_gen = FlashcardGenerator(rag)
        mcq_gen = MCQGenerator(rag)
        insights_gen = InsightsGenerator(rag)
        print("   ✓ All generators initialized")
        print()
    except Exception as e:
        print(f"   ✗ Failed to initialize generators: {str(e)}")
        return False
    
    # Demo topic
    topic = "Newton's laws of motion"
    print(f"🎯 Generating artifacts for topic: '{topic}'")
    print()
    
    # Generate and inject artifacts
    artifacts_generated = []
    injection_results = []
    
    # 1. Flashcard
    print("📇 Generating FLASHCARD...")
    start_time = time.time()
    try:
        flashcard = flashcard_gen.generate(topic, num_items=1)
        gen_time = time.time() - start_time
        print(f"   ✓ Generated in {gen_time:.2f}s")
        artifacts_generated.append(("Flashcard", flashcard))
        
        # Inject to database
        print("   💉 Injecting to database...")
        result = injector.inject_artifact(flashcard, session_id)
        injection_results.append(("Flashcard", result, True))
        print(f"   ✓ Injected with ID: {result['material']['id']}")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")
        injection_results.append(("Flashcard", None, False))
    print()
    
    # 2. Multiple Choice Question
    print("✅ Generating MCQ...")
    start_time = time.time()
    try:
        mcq = mcq_gen.generate(topic, num_items=1)
        gen_time = time.time() - start_time
        print(f"   ✓ Generated in {gen_time:.2f}s")
        artifacts_generated.append(("MCQ", mcq))
        
        # Inject to database
        print("   💉 Injecting to database...")
        result = injector.inject_artifact(mcq, session_id)
        injection_results.append(("MCQ", result, True))
        print(f"   ✓ Injected with ID: {result['material']['id']}")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")
        injection_results.append(("MCQ", None, False))
    print()
    
    # 3. Insight
    print("💡 Generating INSIGHT...")
    start_time = time.time()
    try:
        insight = insights_gen.generate(topic, num_items=1)
        gen_time = time.time() - start_time
        print(f"   ✓ Generated in {gen_time:.2f}s")
        artifacts_generated.append(("Insight", insight))
        
        # Inject to database
        print("   💉 Injecting to database...")
        result = injector.inject_artifact(insight, session_id)
        injection_results.append(("Insight", result, True))
        print(f"   ✓ Injected with ID: {result['material']['id']}")
    except Exception as e:
        print(f"   ✗ Failed: {str(e)}")
        injection_results.append(("Insight", None, False))
    print()
    
    # Summary
    print("=" * 70)
    print("  INJECTION SUMMARY")
    print("=" * 70)
    print()
    
    successful = sum(1 for _, _, success in injection_results if success)
    total = len(injection_results)
    
    print(f"Total artifacts generated: {total}")
    print(f"Successfully injected: {successful}")
    print(f"Failed: {total - successful}")
    print()
    
    if successful > 0:
        print("📊 Injected Artifacts:")
        for artifact_type, result, success in injection_results:
            if success and result:
                material = result.get('material', {})
                print(f"   • {artifact_type}")
                print(f"     - ID: {material.get('id')}")
                print(f"     - Session: {material.get('session_id')}")
                print(f"     - Type: {material.get('type')}")
                print(f"     - Title: {material.get('title', '')[:60]}...")
        print()
    
    print("✓ Demo complete!")
    print()
    print("💡 Next steps:")
    print("   1. Check webapp database for new artifacts")
    print("   2. Open webapp frontend to see real-time updates")
    print("   3. Query: SELECT * FROM study_artifacts ORDER BY created_at DESC LIMIT 3;")
    print()
    
    return successful == total


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Real-time artifact injection demo')
    parser.add_argument('--session-id', type=int, help='Session ID to inject artifacts into')
    parser.add_argument('--backend-url', default='http://localhost:3001', help='Backend URL')
    
    args = parser.parse_args()
    
    success = run_injection_demo(args.session_id, args.backend_url)
    
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
