"""
Artifact Injector
Sends generated artifacts to webapp backend API for real-time database injection
"""

import requests
import json
from typing import Dict, Any, Optional
from pathlib import Path


class ArtifactInjector:
    """Sends artifacts to webapp backend API"""
    
    def __init__(self, backend_url: str = "http://localhost:3001"):
        """
        Initialize artifact injector
        
        Args:
            backend_url: Base URL of the webapp backend (default: http://localhost:3001)
        """
        self.backend_url = backend_url.rstrip('/')
        self.inject_endpoint = f"{self.backend_url}/api/materials/inject"
    
    def inject_artifact(self, artifact: Dict[str, Any], session_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Inject a generated artifact into the webapp database
        
        Args:
            artifact: Generated artifact dictionary (from generator)
            session_id: Optional session ID. If None, uses most recent session
            
        Returns:
            Response from backend API
            
        Raises:
            requests.exceptions.RequestException: If API call fails
        """
        try:
            payload = {
                "artifact": artifact,
                "session_id": session_id
            }
            
            print(f"[Injector] Sending {artifact.get('artifact_type', 'unknown')} artifact to backend...")
            if session_id:
                print(f"[Injector] Target session: {session_id}")
            else:
                print(f"[Injector] Using most recent session")
            
            response = requests.post(
                self.inject_endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            response.raise_for_status()
            result = response.json()
            
            print(f"[Injector] ✓ Success! Artifact ID: {result.get('material', {}).get('id')}")
            return result
            
        except requests.exceptions.ConnectionError:
            error_msg = f"Failed to connect to backend at {self.backend_url}. Is the server running?"
            print(f"[Injector] ✗ {error_msg}")
            raise Exception(error_msg)
        
        except requests.exceptions.Timeout:
            error_msg = "Request timed out"
            print(f"[Injector] ✗ {error_msg}")
            raise Exception(error_msg)
        
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error {e.response.status_code}: {e.response.text}"
            print(f"[Injector] ✗ {error_msg}")
            raise Exception(error_msg)
        
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            print(f"[Injector] ✗ {error_msg}")
            raise
    
    def inject_multiple(self, artifacts: list, session_id: Optional[int] = None) -> list:
        """
        Inject multiple artifacts
        
        Args:
            artifacts: List of artifact dictionaries
            session_id: Optional session ID for all artifacts
            
        Returns:
            List of responses from backend API
        """
        results = []
        for i, artifact in enumerate(artifacts, 1):
            try:
                print(f"\n[Injector] Injecting artifact {i}/{len(artifacts)}...")
                result = self.inject_artifact(artifact, session_id)
                results.append({"success": True, "result": result})
            except Exception as e:
                print(f"[Injector] Failed to inject artifact {i}: {str(e)}")
                results.append({"success": False, "error": str(e)})
        
        return results
    
    def health_check(self) -> bool:
        """
        Check if backend is reachable
        
        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            response = requests.get(
                f"{self.backend_url}/api/health",
                timeout=5
            )
            if response.status_code == 200:
                print(f"[Injector] ✓ Backend is healthy: {self.backend_url}")
                return True
            else:
                print(f"[Injector] ✗ Backend returned status {response.status_code}")
                return False
        except Exception as e:
            print(f"[Injector] ✗ Backend health check failed: {str(e)}")
            return False


def inject_artifact_simple(artifact: Dict[str, Any], session_id: Optional[int] = None, backend_url: str = "http://localhost:3001"):
    """
    Simple helper function to inject a single artifact
    
    Args:
        artifact: Generated artifact dictionary
        session_id: Optional session ID
        backend_url: Backend URL (default: http://localhost:3001)
        
    Returns:
        Response from backend API
    """
    injector = ArtifactInjector(backend_url)
    return injector.inject_artifact(artifact, session_id)


if __name__ == "__main__":
    # Test the injector with a sample artifact
    print("=== Artifact Injector Test ===\n")
    
    # Create test artifact
    test_artifact = {
        "artifact_type": "flashcards",
        "version": "1.0",
        "cards": [
            {
                "id": "fc_test_001",
                "front": "What is the capital of France?",
                "back": "Paris",
                "tags": ["geography", "test"],
                "difficulty": 1,
                "source_refs": ["test"],
                "hints": []
            }
        ],
        "provenance": {
            "test": {"note_id": "test_note", "similarity": 1.0}
        },
        "metrics": {
            "tokens_in": 50,
            "tokens_out": 20,
            "latency_ms": 100
        }
    }
    
    # Initialize injector
    injector = ArtifactInjector()
    
    # Health check
    if not injector.health_check():
        print("\n⚠ Backend is not running!")
        print("Please start the backend server first:")
        print("  cd webapp/backend")
        print("  npm start")
        exit(1)
    
    # Inject test artifact
    try:
        result = injector.inject_artifact(test_artifact)
        print("\n✓ Test injection successful!")
        print(f"Artifact stored with ID: {result.get('material', {}).get('id')}")
    except Exception as e:
        print(f"\n✗ Test injection failed: {str(e)}")
