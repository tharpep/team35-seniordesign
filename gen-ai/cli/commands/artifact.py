"""
Artifact generation command
Generates flashcards, MCQ, and insights via API
"""

import json
import typer
from datetime import datetime
from pathlib import Path
from cli.utils import (
    APIClient, require_api_server, get_artifact_output_path,
    print_header, print_section
)

app = typer.Typer(name="artifact", help="Generate educational artifacts")


@app.command()
def generate(
    topic: str = typer.Option(
        "Newton's laws of motion",
        "--topic",
        help="Topic to generate artifacts for"
    ),
    base_url: str = typer.Option(
        "http://127.0.0.1:8000",
        "--base-url",
        help="API server base URL"
    )
):
    """
    Generate all artifact types (flashcards, MCQ, insights) for a topic
    
    Requires API server to be running (use 'genai server' in another terminal).
    Default topic: "Newton's laws of motion"
    """
    print_header("ARTIFACT GENERATION")
    
    print(f"\n[TOPIC] Generating artifacts for: '{topic}'")
    
    # Initialize client
    client = APIClient(base_url)
    
    # Check API availability
    print("\n[STARTUP] Checking API connection...")
    if not require_api_server(client):
        raise typer.Exit(1)
    
    print("[OK] Connected to API server")
    
    # Get output directory
    output_dir = get_artifact_output_path()
    output_dir.mkdir(parents=True, exist_ok=True)
    
    artifacts = {}
    
    try:
        # Generate flashcard
        print_section("GENERATING FLASHCARD")
        print("[FLASHCARD] Generating...")
        flashcard = client.generate_flashcard(topic, num_items=1)
        if flashcard:
            artifacts['flashcard'] = flashcard
            print("[OK] Flashcard generated")
        else:
            print("[ERROR] Failed to generate flashcard")
            artifacts['flashcard'] = {"error": "Generation failed"}
        
        # Generate MCQ
        print_section("GENERATING MCQ")
        print("[MCQ] Generating...")
        mcq = client.generate_mcq(topic, num_items=1)
        if mcq:
            artifacts['mcq'] = mcq
            print("[OK] MCQ generated")
        else:
            print("[ERROR] Failed to generate MCQ")
            artifacts['mcq'] = {"error": "Generation failed"}
        
        # Generate insight
        print_section("GENERATING INSIGHT")
        print("[INSIGHT] Generating...")
        insight = client.generate_insight(topic, num_items=1)
        if insight:
            artifacts['insight'] = insight
            print("[OK] Insight generated")
        else:
            print("[ERROR] Failed to generate insight")
            artifacts['insight'] = {"error": "Generation failed"}
        
        # Save artifacts
        print_section("SAVING ARTIFACTS")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_topic = safe_topic.replace(' ', '_')[:20]
        
        saved_files = []
        for artifact_type, artifact in artifacts.items():
            filename = f"{artifact_type}_{safe_topic}_{timestamp}.json"
            filepath = output_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(artifact, f, indent=2, ensure_ascii=False)
            
            saved_files.append(filename)
            print(f"   [SAVED] {artifact_type}: {filename}")
        
        # Display summary
        print_section("RESULTS SUMMARY")
        
        for artifact_type, artifact in artifacts.items():
            print(f"\n[ARTIFACT] {artifact_type.upper()}:")
            print("-" * 40)
            
            if 'error' in artifact:
                print(f"   [ERROR] {artifact['error']}")
                continue
            
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
                for ref, info in list(provenance.items())[:2]:
                    print(f"   {ref}: similarity={info.get('similarity', 'N/A')}")
            
            # Show preview
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
                    insight_item = insights[0]
                    print(f"[PREVIEW]")
                    print(f"   Title: {insight_item.get('title', 'N/A')}")
                    print(f"   Takeaway: {insight_item.get('takeaway', 'N/A')[:100]}...")
        
        print_section("SUCCESS")
        print(f"[OK] Artifacts completed for topic: '{topic}'")
        print(f"[SAVED] All artifacts saved to: {output_dir}")
        
    except Exception as e:
        print(f"\n[ERROR] Artifact generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Artifact generation - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(generate)


