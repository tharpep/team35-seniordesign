"""
Simple AI Gateway
Routes requests to AI providers (currently Purdue GenAI Studio)
Designed to be easily extended for additional providers
"""

import os
from typing import Dict, Any, Optional
from purdue_api import PurdueGenAI

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


class AIGateway:
    """Simple gateway for AI requests"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize gateway with configuration
        
        Args:
            config: Dictionary with provider configurations
                   Example: {"purdue": {"api_key": "your-key"}}
                   If None, will try to load from environment variables
        """
        self.providers = {}
        self._setup_providers(config or {})
    
    def _setup_providers(self, config: Dict[str, Any]):
        """Setup available AI providers"""
        # Setup Purdue provider
        if "purdue" in config:
            api_key = config["purdue"].get("api_key")
            self.providers["purdue"] = PurdueGenAI(api_key)
        elif os.getenv('PURDUE_API_KEY'):
            # Auto-setup Purdue if API key is in environment
            self.providers["purdue"] = PurdueGenAI()
        
        # Future providers can be added here:
        # if "openai" in config:
        #     self.providers["openai"] = OpenAIClient(config["openai"]["api_key"])
        # if "ollama" in config:
        #     self.providers["ollama"] = OllamaClient(config["ollama"]["base_url"])
    
    def chat(self, message: str, provider: str = "purdue", model: str = "llama3.1:latest") -> str:
        """
        Send a chat message to specified AI provider
        
        Args:
            message: Your message to the AI
            provider: AI provider to use (default: "purdue")
            model: Model to use (default: "llama3.1:latest")
            
        Returns:
            str: AI response
            
        Raises:
            Exception: If provider not found or API call fails
        """
        if provider not in self.providers:
            available = ", ".join(self.providers.keys())
            raise Exception(f"Provider '{provider}' not available. Available: {available}")
        
        provider_client = self.providers[provider]
        return provider_client.chat(message, model)
    
    def get_available_providers(self) -> list:
        """Get list of available providers"""
        return list(self.providers.keys())


# Example usage
if __name__ == "__main__":
    # Gateway will auto-load from PURDUE_API_KEY environment variable
    # or you can provide config: AIGateway({"purdue": {"api_key": "your-key"}})
    
    try:
        # Initialize gateway (auto-loads from environment)
        gateway = AIGateway()
        
        # Simple chat
        response = gateway.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
        
        # Check available providers
        print(f"Available providers: {gateway.get_available_providers()}")
        
    except Exception as e:
        print(f"Error: {e}")
