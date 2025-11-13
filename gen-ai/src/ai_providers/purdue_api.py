"""
Simple Purdue GenAI Studio API Client
Basic chat functionality for testing and verification
"""

import json
import os
import urllib.request
import urllib.error
import time
from typing import Optional, List, Any
from .base_client import BaseLLMClient
from logging_config import get_logger

logger = get_logger(__name__)

# Load environment variables from .env file
def load_env_file():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()


class PurdueGenAI(BaseLLMClient):
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
    
    def chat(self, messages: Any, model: Optional[str] = None, max_tokens: Optional[int] = None, **kwargs) -> str:
        """
        Send a message and get a response
        
        Args:
            messages: Your message (str) or messages list
            model: Model to use (default: llama3.1:latest)
            max_tokens: Maximum tokens in response (optional)
            
        Returns:
            str: AI response
        """
        # Use default model if none specified
        if model is None:
            model = "llama3.1:latest"
            
        # Handle both string and message list formats
        if isinstance(messages, list):
            messages = messages
        elif isinstance(messages, str):
            messages = [{"role": "user", "content": messages}]
        else:
            messages = [{"role": "user", "content": str(messages)}]
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            body = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            # Add max_tokens if specified
            if max_tokens is not None:
                body["max_tokens"] = max_tokens
            
            # Make request
            data = json.dumps(body).encode('utf-8')
            req = urllib.request.Request(self.base_url, data=data, headers=headers, method='POST')
            
            request_start_time = time.time()
            
            try:
                with urllib.request.urlopen(req) as response:
                    request_time = time.time() - request_start_time
                    
                    # Check for rate limiting (HTTP 429)
                    if response.status == 429:
                        logger.warning("⚠️  RATE LIMIT DETECTED: Purdue API returned HTTP 429 (Too Many Requests)")
                        logger.warning(f"   Request time: {request_time:.2f}s")
                        logger.warning(f"   Model: {model}")
                        error_text = response.read().decode('utf-8')
                        logger.warning(f"   Error details: {error_text}")
                        raise Exception(f"Rate Limited: HTTP 429 - {error_text}")
                    
                    # Check for other rate limit indicators in headers
                    rate_limit_remaining = response.headers.get('X-RateLimit-Remaining')
                    rate_limit_reset = response.headers.get('X-RateLimit-Reset')
                    
                    if rate_limit_remaining is not None:
                        remaining = int(rate_limit_remaining)
                        if remaining <= 5:
                            logger.warning(f"⚠️  RATE LIMIT WARNING: Only {remaining} requests remaining before rate limit")
                            if rate_limit_reset:
                                logger.warning(f"   Rate limit resets at: {rate_limit_reset}")
                    
                    if response.status == 200:
                        response_data = json.loads(response.read().decode('utf-8'))
                        return response_data["choices"][0]["message"]["content"]
                    else:
                        error_text = response.read().decode('utf-8')
                        logger.error(f"Purdue API Error {response.status}: {error_text}")
                        raise Exception(f"API Error {response.status}: {error_text}")
                        
            except urllib.error.HTTPError as e:
                request_time = time.time() - request_start_time
                
                # Check for rate limiting
                if e.code == 429:
                    logger.warning("⚠️  RATE LIMIT DETECTED: Purdue API returned HTTP 429 (Too Many Requests)")
                    logger.warning(f"   Request time: {request_time:.2f}s")
                    logger.warning(f"   Model: {model}")
                    error_text = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
                    logger.warning(f"   Error details: {error_text}")
                    
                    # Try to extract retry-after header
                    retry_after = e.headers.get('Retry-After') if hasattr(e, 'headers') else None
                    if retry_after:
                        logger.warning(f"   Retry after: {retry_after} seconds")
                    
                    raise Exception(f"Rate Limited: HTTP 429 - {error_text}")
                
                error_text = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
                logger.error(f"Purdue API HTTP Error {e.code}: {error_text}")
                raise Exception(f"HTTP Error {e.code}: {error_text}")
        except Exception as e:
            # Re-raise if it's already a rate limit exception
            if "Rate Limited" in str(e):
                raise
            logger.error(f"Error calling Purdue GenAI: {str(e)}")
            raise Exception(f"Error calling Purdue GenAI: {str(e)}")
    
    def get_available_models(self) -> List[str]:
        """Get list of available models (hardcoded for Purdue)"""
        return [
            "llama3.1:latest",
            "llama3.1:70b",
            "mistral:latest",
            "mixtral:latest"
        ]


# Example usage
if __name__ == "__main__":
    # Debug: Check if environment variable is loaded
    api_key = os.getenv('PURDUE_API_KEY')
    if api_key:
        print(f" Found API key")
    else:
        print(" No API key found in environment variables")
        print("Make sure your .env file contains: PURDUE_API_KEY=your-key-here")
        exit(1)
    
    try:
        client = PurdueGenAI()  # Uses PURDUE_API_KEY from environment
        response = client.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
    except Exception as e:
        print(f"Error: {e}")