"""
Simple Purdue GenAI Studio API Client
Basic chat functionality for testing and verification
"""

import json
import os
import urllib.request
import urllib.error
from typing import Optional

# Load environment variables from .env file
def load_env_file():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()


class PurdueGenAI:
    """Simple client for Purdue GenAI Studio"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Purdue GenAI client
        
        Args:
            api_key: API key for Purdue GenAI Studio. If None, will try to load from PURDUE_API_KEY environment variable
        """
        self.api_key = api_key or os.getenv('PURDUE_API_KEY')
        if not self.api_key:
            raise ValueError("API key is required. Provide it directly or set PURDUE_API_KEY environment variable.")
        self.base_url = "https://genai.rcac.purdue.edu/api/chat/completions"
    
    def chat(self, message: str, model: str = "llama3.1:latest") -> str:
        """
        Send a message and get a response
        
        Args:
            message: Your message to the AI
            model: Model to use (default: llama3.1:latest)
            
        Returns:
            str: AI response
            
        Raises:
            Exception: If API call fails
        """
        try:
            # Prepare request
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            body = {
                "model": model,
                "messages": [{"role": "user", "content": message}],
                "stream": False
            }
            
            # Make request
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(self.base_url, data=data, headers=headers, method='POST')
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    response_data = json.loads(response.read().decode('utf-8'))
                    return response_data["choices"][0]["message"]["content"]
                else:
                    error_text = response.read().decode('utf-8')
                    raise Exception(f"API Error {response.status}: {error_text}")
                    
        except urllib.error.HTTPError as e:
            error_text = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            raise Exception(f"HTTP Error {e.code}: {error_text}")
        except Exception as e:
            raise Exception(f"Error calling Purdue GenAI: {str(e)}")


# Example usage
if __name__ == "__main__":
    # Debug: Check if environment variable is loaded
    api_key = os.getenv('PURDUE_API_KEY')
    if api_key:
        print(f"✅ Found API key: {api_key[:10]}...")
    else:
        print("❌ No API key found in environment variables")
        print("Make sure your .env file contains: PURDUE_API_KEY=your-key-here")
        exit(1)
    
    try:
        client = PurdueGenAI()  # Uses PURDUE_API_KEY from environment
        response = client.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
    except Exception as e:
        print(f"Error: {e}")