"""
Artifact Generation Demo
Automated demo that generates all 3 artifact types using RAG
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.rag.rag_setup import BasicRAG
from src.artifact_creation.generators import FlashcardGenerator, MCQGenerator, InsightsGenerator
from config import get_rag_config


def generate_artifacts_for_topic(topic, flashcard_gen, mcq_gen, insights_gen):
    """Generate all 3 artifact types for a given topic"""
    artifacts = {}
    
    # Generate flashcard
    print("\n   [FLASHCARD] Generating flashcard...")
    start_time = time.time()
    flashcard_artifact = flashcard_gen.generate(topic, num_items=1)
    generation_time = time.time() - start_time
    artifacts['flashcard'] = flashcard_artifact
    print(f"   [OK] Flashcard generated in {generation_time:.2f}s")
    
    # Generate MCQ
    print("\n   [MCQ] Generating MCQ...")
    start_time = time.time()
    mcq_artifact = mcq_gen.generate(topic, num_items=1)
    generation_time = time.time() - start_time
    artifacts['mcq'] = mcq_artifact
    print(f"   [OK] MCQ generated in {generation_time:.2f}s")
    
    # Generate insight
    print("\n   [INSIGHT] Generating insight...")
    start_time = time.time()
    insight_artifact = insights_gen.generate(topic, num_items=1)
    generation_time = time.time() - start_time
    artifacts['insight'] = insight_artifact
    print(f"   [OK] Insight generated in {generation_time:.2f}s")
    
    return artifacts


def save_and_display_artifacts(artifacts, topic, output_dir):
    """Save artifacts to files and display results"""
    # Save artifacts to files
    print(f"\n4. Saving artifacts to {output_dir}...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_topic = safe_topic.replace(' ', '_')[:20]  # Limit length
    
    for artifact_type, artifact in artifacts.items():
        filename = f"{artifact_type}_{safe_topic}_{timestamp}.json"
        filepath = output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(artifact, f, indent=2, ensure_ascii=False)
        
        print(f"   [SAVED] {artifact_type}: {filename}")
    
    # Display results summary
    print(f"\n5. Results Summary:")
    print("=" * 60)
    
    for artifact_type, artifact in artifacts.items():
        print(f"\n[ARTIFACT] {artifact_type.upper()}:")
        print("-" * 40)
        
        # Show metrics
        metrics = artifact.get('metrics', {})
        if metrics:
            print(f"[METRICS]")
            print(f"   Tokens in: {metrics.get('tokens_in', 'N/A')}")
            print(f"   Tokens out: {metrics.get('tokens_out', 'N/A')}")
            print(f"   Latency: {metrics.get('latency_ms', 'N/A')}ms")
        
        # Show provenance
        provenance = artifact.get('provenance', {})
        if provenance:
            print(f"[SOURCES] {len(provenance)} documents retrieved")
            for ref, info in list(provenance.items())[:2]:  # Show first 2
                print(f"   {ref}: similarity={info.get('similarity', 'N/A')}")
        
        # Show artifact content preview
        if artifact_type == 'flashcard' and 'cards' in artifact:
            cards = artifact['cards']
            if cards:
                card = cards[0]
                print(f"[PREVIEW]")
                print(f"   Front: {card.get('front', 'N/A')[:100]}...")
                print(f"   Back: {card.get('back', 'N/A')[:100]}...")
        
        elif artifact_type == 'mcq' and 'questions' in artifact:
            questions = artifact['questions']
            if questions:
                q = questions[0]
                print(f"[PREVIEW]")
                print(f"   Question: {q.get('stem', 'N/A')[:100]}...")
                print(f"   Options: {len(q.get('options', []))} choices")
        
        elif artifact_type == 'insight' and 'insights' in artifact:
            insights = artifact['insights']
            if insights:
                insight = insights[0]
                print(f"[PREVIEW]")
                print(f"   Title: {insight.get('title', 'N/A')}")
                print(f"   Takeaway: {insight.get('takeaway', 'N/A')[:100]}...")
        
        # Show any errors
        if 'error' in artifact:
            print(f"[ERROR] {artifact['error']}")
    
    print(f"\n[OK] Artifacts completed for topic: '{topic}'")
    print(f"[SAVED] All artifacts saved to: {output_dir}")


def run_artifact_demo(mode="automated"):
    """Run artifact generation demo in automated or interactive mode"""
    print("=== Artifact Generation Demo ===\n")
    
    # Get configuration
    config = get_rag_config()
    print(f"Using model: {config.model_name}")
    print(f"Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    
    # Show switching instructions if needed
    if config.use_ollama:
        print("[TIP] For faster generation, switch to Purdue API by setting USE_OLLAMA=false")
    else:
        print("[OK] Using Purdue API for optimal performance")
    
    try:
        # Initialize RAG system (uses already ingested documents)
        print("\n1. Initializing RAG system...")
        rag = BasicRAG()
        
        # Check if we have documents
        stats = rag.get_stats()
        print(f"   Collection: {stats['collection_name']}")
        print(f"   Documents: {stats['document_count']}")
        
        if stats['document_count'] == 0:
            print("[ERROR] No documents found in vector store!")
            print("   Please run the RAG demo first to ingest documents.")
            return
        
        # Initialize artifact generators
        print("\n2. Initializing artifact generators...")
        flashcard_gen = FlashcardGenerator(rag)
        mcq_gen = MCQGenerator(rag)
        insights_gen = InsightsGenerator(rag)
        print("   [OK] All generators initialized")
        
        # Create output directory
        output_dir = Path(__file__).parent.parent / "artifact_creation" / "artifact_output"
        output_dir.mkdir(exist_ok=True)
        
        if mode == "interactive":
            # Interactive mode
            print("\n=== Interactive Mode ===")
            print("Enter topics to generate artifacts for (type 'quit' to exit):")
            
            while True:
                topic = input("\nTopic: ").strip()
                if topic.lower() in ['quit', 'exit', 'q']:
                    break
                
                if topic:
                    print(f"Generating artifacts for: '{topic}'")
                    artifacts = generate_artifacts_for_topic(topic, flashcard_gen, mcq_gen, insights_gen)
                    save_and_display_artifacts(artifacts, topic, output_dir)
        else:
            # Automated mode
            test_topic = "Newton's laws of motion"
            print(f"\n3. Generating artifacts for topic: '{test_topic}'")
            artifacts = generate_artifacts_for_topic(test_topic, flashcard_gen, mcq_gen, insights_gen)
            save_and_display_artifacts(artifacts, test_topic, output_dir)
        
        
    except Exception as e:
        print(f"[ERROR] Demo failed:")
        print(f"Raw error: {e}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")


def main():
    """Main function for direct execution"""
    run_artifact_demo("automated")


if __name__ == "__main__":
    main()
