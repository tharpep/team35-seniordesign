"""
Shared utilities for CLI commands
"""

import os
import sys
import requests
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

# Add project root to path for imports (same pattern as existing code)
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


class APIClient:
    """Reusable API client for CLI commands"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url.rstrip('/')
    
    def check_health(self) -> Tuple[bool, Optional[str]]:
        """
        Check if API server is running
        
        Returns:
            Tuple of (is_healthy, error_message)
        """
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                return True, None
            else:
                return False, f"API returned status {response.status_code}"
        except requests.ConnectionError:
            return False, "Cannot connect to API - is the server running?"
        except requests.Timeout:
            return False, "API health check timed out"
        except Exception as e:
            return False, f"Health check failed: {e}"
    
    def chat(self, message: str, session_id: str = "global") -> Optional[Dict[str, Any]]:
        """Send chat message to API"""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={"message": message, "session_id": session_id},
                timeout=120
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                print(f"Response: {response.text}")
                return None
        except requests.Timeout:
            print("[ERROR] Request timed out (>2 minutes)")
            return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None
    
    def clear_session(self, session_id: str = "global") -> bool:
        """Clear chat session"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/chat/session/{session_id}",
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[ERROR] Clear session failed: {e}")
            return False
    
    def generate_flashcard(self, topic: str, num_items: int = 1) -> Optional[Dict[str, Any]]:
        """Generate flashcard artifact"""
        try:
            response = requests.post(
                f"{self.base_url}/api/flashcards",
                json={"topic": topic, "num_items": num_items},
                timeout=120
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None
    
    def generate_mcq(self, topic: str, num_items: int = 1) -> Optional[Dict[str, Any]]:
        """Generate MCQ artifact"""
        try:
            response = requests.post(
                f"{self.base_url}/api/mcq",
                json={"topic": topic, "num_items": num_items},
                timeout=120
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None
    
    def generate_insight(self, topic: str, num_items: int = 1) -> Optional[Dict[str, Any]]:
        """Generate insight artifact"""
        try:
            response = requests.post(
                f"{self.base_url}/api/insights",
                json={"topic": topic, "num_items": num_items},
                timeout=120
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None


def get_project_root() -> Path:
    """Get the project root directory (gen-ai folder)"""
    return Path(__file__).parent.parent


def get_documents_path() -> Path:
    """Get default documents path"""
    return get_project_root() / "src" / "data" / "documents" / "notes"


def get_artifact_output_path() -> Path:
    """Get artifact output directory"""
    return get_project_root() / "src" / "artifact_creation" / "artifact_output"


def require_api_server(client: APIClient) -> bool:
    """
    Check if API server is running, display error if not
    
    Returns:
        True if server is running, False otherwise
    """
    is_healthy, error_msg = client.check_health()
    if not is_healthy:
        print(f"[ERROR] API server is not available!")
        if error_msg:
            print(f"   Reason: {error_msg}")
        print("\nPlease start the API server first in a separate terminal:")
        print("   genai server")
        return False
    return True


def print_header(title: str):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def print_section(title: str):
    """Print formatted section header"""
    print("\n" + "-" * 70)
    print(title)
    print("-" * 70)


