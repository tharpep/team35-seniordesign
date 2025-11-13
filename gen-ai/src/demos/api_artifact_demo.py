"""
API Artifact Generation Demo
Demonstrates calling the FastAPI artifact endpoints with timing and metrics
Tests single and multiple artifact generation, including concurrent calls
"""

import json
import asyncio
import time
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import httpx
from statistics import mean, median

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from config import get_rag_config


# API base URL
API_BASE_URL = "http://127.0.0.1:8000"
API_TIMEOUT = 120.0  # 2 minutes timeout for artifact generation


class APIClient:
    """Async HTTP client for API calls"""
    
    def __init__(self, base_url: str = API_BASE_URL, timeout: float = API_TIMEOUT):
        self.base_url = base_url
        self.timeout = timeout
        self.client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()
    
    async def check_health(self) -> Dict[str, Any]:
        """Check API health"""
        try:
            response = await self.client.get("/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Health check failed: {e}")
    
    async def generate_flashcards(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """Generate flashcards via API"""
        start_time = time.time()
        try:
            response = await self.client.post(
                "/api/flashcards",
                json={"topic": topic, "num_items": num_items}
            )
            response.raise_for_status()
            result = response.json()
            elapsed = time.time() - start_time
            result["_api_metrics"] = {
                "total_time_seconds": elapsed,
                "http_status": response.status_code
            }
            return result
        except httpx.HTTPStatusError as e:
            elapsed = time.time() - start_time
            return {
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": e.response.status_code
                }
            }
        except Exception as e:
            elapsed = time.time() - start_time
            return {
                "error": str(e),
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": 0
                }
            }
    
    async def generate_mcq(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """Generate MCQ via API"""
        start_time = time.time()
        try:
            response = await self.client.post(
                "/api/mcq",
                json={"topic": topic, "num_items": num_items}
            )
            response.raise_for_status()
            result = response.json()
            elapsed = time.time() - start_time
            result["_api_metrics"] = {
                "total_time_seconds": elapsed,
                "http_status": response.status_code
            }
            return result
        except httpx.HTTPStatusError as e:
            elapsed = time.time() - start_time
            return {
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": e.response.status_code
                }
            }
        except Exception as e:
            elapsed = time.time() - start_time
            return {
                "error": str(e),
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": 0
                }
            }
    
    async def generate_insights(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """Generate insights via API"""
        start_time = time.time()
        try:
            response = await self.client.post(
                "/api/insights",
                json={"topic": topic, "num_items": num_items}
            )
            response.raise_for_status()
            result = response.json()
            elapsed = time.time() - start_time
            result["_api_metrics"] = {
                "total_time_seconds": elapsed,
                "http_status": response.status_code
            }
            return result
        except httpx.HTTPStatusError as e:
            elapsed = time.time() - start_time
            return {
                "error": f"HTTP {e.response.status_code}: {e.response.text}",
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": e.response.status_code
                }
            }
        except Exception as e:
            elapsed = time.time() - start_time
            return {
                "error": str(e),
                "_api_metrics": {
                    "total_time_seconds": elapsed,
                    "http_status": 0
                }
            }


def extract_metrics(artifact: Dict[str, Any]) -> Dict[str, Any]:
    """Extract and format metrics from artifact"""
    metrics = {
        "api_total_time_seconds": artifact.get("_api_metrics", {}).get("total_time_seconds", 0),
        "http_status": artifact.get("_api_metrics", {}).get("http_status", 0),
        "generation_latency_ms": artifact.get("metrics", {}).get("latency_ms", 0),
        "tokens_in": artifact.get("metrics", {}).get("tokens_in", 0),
        "tokens_out": artifact.get("metrics", {}).get("tokens_out", 0),
        "retrieval_scores": artifact.get("metrics", {}).get("retrieval_scores", []),
        "num_sources": len(artifact.get("provenance", {})),
        "has_error": "error" in artifact
    }
    
    # Count items generated
    if "cards" in artifact:
        metrics["items_generated"] = len(artifact["cards"])
    elif "questions" in artifact:
        metrics["items_generated"] = len(artifact["questions"])
    elif "insights" in artifact:
        metrics["items_generated"] = len(artifact["insights"])
    else:
        metrics["items_generated"] = 0
    
    return metrics


def display_artifact_summary(artifact_type: str, artifact: Dict[str, Any], topic: str):
    """Display summary of generated artifact"""
    print(f"\n[{artifact_type.upper()}] Topic: '{topic}'")
    print("-" * 60)
    
    metrics = extract_metrics(artifact)
    
    # Display metrics
    print(f"[METRICS]")
    print(f"   API Total Time: {metrics['api_total_time_seconds']:.2f}s")
    print(f"   Generation Latency: {metrics['generation_latency_ms']:.0f}ms")
    print(f"   HTTP Status: {metrics['http_status']}")
    print(f"   Items Generated: {metrics['items_generated']}")
    print(f"   Tokens In: {metrics['tokens_in']}")
    print(f"   Tokens Out: {metrics['tokens_out']}")
    print(f"   Sources Retrieved: {metrics['num_sources']}")
    
    if metrics['retrieval_scores']:
        avg_score = mean(metrics['retrieval_scores']) if metrics['retrieval_scores'] else 0
        print(f"   Avg Retrieval Score: {avg_score:.3f}")
    
    if metrics['has_error']:
        print(f"   [ERROR] {artifact.get('error', 'Unknown error')}")
    
    # Display preview
    if artifact_type == "flashcard" and "cards" in artifact:
        cards = artifact["cards"]
        if cards:
            card = cards[0]
            print(f"[PREVIEW]")
            print(f"   Front: {card.get('front', 'N/A')[:80]}...")
            print(f"   Back: {card.get('back', 'N/A')[:80]}...")
    
    elif artifact_type == "mcq" and "questions" in artifact:
        questions = artifact["questions"]
        if questions:
            q = questions[0]
            print(f"[PREVIEW]")
            print(f"   Question: {q.get('stem', 'N/A')[:80]}...")
            print(f"   Options: {len(q.get('options', []))} choices")
    
    elif artifact_type == "insights" and "insights" in artifact:
        insights = artifact["insights"]
        if insights:
            insight = insights[0]
            print(f"[PREVIEW]")
            print(f"   Title: {insight.get('title', 'N/A')}")
            print(f"   Takeaway: {insight.get('takeaway', 'N/A')[:80]}...")


async def test_single_artifacts(api_client: APIClient, topic: str):
    """Test generating one of each artifact type sequentially"""
    print("\n" + "=" * 60)
    print("TEST 1: Single Artifact Generation (Sequential)")
    print("=" * 60)
    
    results = {}
    total_start = time.time()
    
    # Generate flashcard
    print("\n[1/3] Generating flashcard...")
    results["flashcard"] = await api_client.generate_flashcards(topic, num_items=1)
    display_artifact_summary("flashcard", results["flashcard"], topic)
    
    # Generate MCQ
    print("\n[2/3] Generating MCQ...")
    results["mcq"] = await api_client.generate_mcq(topic, num_items=1)
    display_artifact_summary("mcq", results["mcq"], topic)
    
    # Generate insights
    print("\n[3/3] Generating insights...")
    results["insights"] = await api_client.generate_insights(topic, num_items=1)
    display_artifact_summary("insights", results["insights"], topic)
    
    total_time = time.time() - total_start
    
    print(f"\n[SUMMARY] Sequential Generation:")
    print(f"   Total Time: {total_time:.2f}s")
    print(f"   Average per Artifact: {total_time / 3:.2f}s")
    
    return results, {"total_time": total_time, "mode": "sequential"}


async def test_multiple_artifacts(api_client: APIClient, topic: str):
    """Test generating multiple items of each artifact type"""
    print("\n" + "=" * 60)
    print("TEST 2: Multiple Artifact Generation (Batch)")
    print("=" * 60)
    
    results = {}
    total_start = time.time()
    
    # Generate multiple flashcards
    print("\n[1/3] Generating 3 flashcards...")
    results["flashcard"] = await api_client.generate_flashcards(topic, num_items=3)
    display_artifact_summary("flashcard", results["flashcard"], topic)
    
    # Generate multiple MCQs
    print("\n[2/3] Generating 3 MCQs...")
    results["mcq"] = await api_client.generate_mcq(topic, num_items=3)
    display_artifact_summary("mcq", results["mcq"], topic)
    
    # Generate multiple insights
    print("\n[3/3] Generating 3 insights...")
    results["insights"] = await api_client.generate_insights(topic, num_items=3)
    display_artifact_summary("insights", results["insights"], topic)
    
    total_time = time.time() - total_start
    
    print(f"\n[SUMMARY] Batch Generation:")
    print(f"   Total Time: {total_time:.2f}s")
    print(f"   Average per Artifact Type: {total_time / 3:.2f}s")
    
    return results, {"total_time": total_time, "mode": "batch"}


async def test_concurrent_artifacts(api_client: APIClient, topic: str):
    """Test generating all artifact types concurrently"""
    print("\n" + "=" * 60)
    print("TEST 3: Concurrent Artifact Generation (Parallel)")
    print("=" * 60)
    
    print("\n[ALL] Generating all artifact types concurrently...")
    total_start = time.time()
    
    # Generate all types concurrently
    flashcard_task = api_client.generate_flashcards(topic, num_items=1)
    mcq_task = api_client.generate_mcq(topic, num_items=1)
    insights_task = api_client.generate_insights(topic, num_items=1)
    
    results = await asyncio.gather(
        flashcard_task,
        mcq_task,
        insights_task,
        return_exceptions=True
    )
    
    total_time = time.time() - total_start
    
    # Process results
    results_dict = {
        "flashcard": results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])},
        "mcq": results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])},
        "insights": results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])}
    }
    
    # Display summaries
    for artifact_type, artifact in results_dict.items():
        display_artifact_summary(artifact_type, artifact, topic)
    
    print(f"\n[SUMMARY] Concurrent Generation:")
    print(f"   Total Time: {total_time:.2f}s")
    print(f"   Average per Artifact: {total_time / 3:.2f}s")
    print(f"   Speedup vs Sequential: ~{3:.1f}x (theoretical)")
    
    return results_dict, {"total_time": total_time, "mode": "concurrent"}


def save_demo_results(all_results: Dict[str, Any], output_dir: Path):
    """Save demo results to JSON file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"api_demo_summary_{timestamp}.json"
    filepath = output_dir / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SAVED] Demo results saved to: {filepath}")
    return filepath


async def _run_api_artifact_demo_async(mode: str = "automated"):
    """Run API artifact generation demo (async implementation)"""
    print("=" * 60)
    print("API Artifact Generation Demo")
    print("=" * 60)
    
    # Get configuration
    config = get_rag_config()
    print(f"\n[CONFIG]")
    print(f"   Model: {config.model_name}")
    print(f"   Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    print(f"   API URL: {API_BASE_URL}")
    
    # Check if API is running
    print(f"\n[CHECK] Verifying API is running at {API_BASE_URL}...")
    try:
        async with APIClient() as api_client:
            health = await api_client.check_health()
            print(f"   [OK] API is healthy")
            print(f"   Status: {health.get('status', 'unknown')}")
            
            if health.get('status') != 'healthy':
                print(f"   [WARNING] API status is {health.get('status')}")
                print(f"   Components: {health.get('components', {})}")
    except Exception as e:
        print(f"   [ERROR] Cannot connect to API: {e}")
        print(f"   Please start the API server first:")
        print(f"   python run start")
        return
    
    # Create output directory
    output_dir = Path(__file__).parent
    output_dir.mkdir(exist_ok=True)
    
    # Test topic
    if mode == "interactive":
        topic = input("\nEnter topic for artifact generation: ").strip()
        if not topic:
            topic = "Newton's laws of motion"
            print(f"Using default topic: '{topic}'")
    else:
        topic = "Newton's laws of motion"
        print(f"\n[TOPIC] Using test topic: '{topic}'")
    
    all_results = {
        "demo_info": {
            "timestamp": datetime.now().isoformat(),
            "topic": topic,
            "config": {
                "model": config.model_name,
                "provider": "Ollama" if config.use_ollama else "Purdue API"
            }
        },
        "tests": {}
    }
    
    try:
        async with APIClient() as api_client:
            # Test 1: Single artifacts (sequential)
            results1, metrics1 = await test_single_artifacts(api_client, topic)
            all_results["tests"]["single_sequential"] = {
                "results": results1,
                "metrics": metrics1,
                "artifact_metrics": {
                    k: extract_metrics(v) for k, v in results1.items()
                }
            }
            
            # Test 2: Multiple artifacts (batch)
            results2, metrics2 = await test_multiple_artifacts(api_client, topic)
            all_results["tests"]["multiple_batch"] = {
                "results": results2,
                "metrics": metrics2,
                "artifact_metrics": {
                    k: extract_metrics(v) for k, v in results2.items()
                }
            }
            
            # Test 3: Concurrent artifacts (parallel)
            results3, metrics3 = await test_concurrent_artifacts(api_client, topic)
            all_results["tests"]["concurrent_parallel"] = {
                "results": results3,
                "metrics": metrics3,
                "artifact_metrics": {
                    k: extract_metrics(v) for k, v in results3.items()
                }
            }
            
            # Overall summary
            print("\n" + "=" * 60)
            print("OVERALL SUMMARY")
            print("=" * 60)
            
            sequential_time = metrics1["total_time"]
            batch_time = metrics2["total_time"]
            concurrent_time = metrics3["total_time"]
            
            print(f"\n[PERFORMANCE COMPARISON]")
            print(f"   Sequential (1 each): {sequential_time:.2f}s")
            print(f"   Batch (3 each):     {batch_time:.2f}s")
            print(f"   Concurrent (1 each): {concurrent_time:.2f}s")
            print(f"\n   Speedup (Concurrent vs Sequential): {sequential_time / concurrent_time:.2f}x")
            
            all_results["summary"] = {
                "sequential_time": sequential_time,
                "batch_time": batch_time,
                "concurrent_time": concurrent_time,
                "speedup_ratio": sequential_time / concurrent_time if concurrent_time > 0 else 0
            }
            
    except Exception as e:
        print(f"\n[ERROR] Demo failed: {e}")
        import traceback
        print(f"Traceback:\n{traceback.format_exc()}")
        all_results["error"] = str(e)
        all_results["traceback"] = traceback.format_exc()
    
    # Save results
    save_demo_results(all_results, output_dir)
    
    print("\n[OK] API artifact demo completed!")


def run_api_artifact_demo(mode: str = "automated"):
    """Run API artifact generation demo (sync wrapper for run script)"""
    asyncio.run(_run_api_artifact_demo_async(mode))


def main():
    """Main function for direct execution"""
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "automated"
    asyncio.run(_run_api_artifact_demo_async(mode))


if __name__ == "__main__":
    main()

