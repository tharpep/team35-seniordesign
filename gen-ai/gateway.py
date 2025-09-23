"""
Simple AI Gateway
Routes requests to AI providers (currently Purdue GenAI Studio)
Designed to be easily extended for additional providers
"""

from typing import Dict, Any
from .purdue_api import PurdueGenAI


class AIGateway:
    """Simple gateway for AI requests"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize gateway with configuration
        
        Args:
            config: Dictionary with provider configurations
                   Example: {"purdue": {"api_key": "your-key"}}
        """
        self.providers = {}
        self._setup_providers(config)
    
    def _setup_providers(self, config: Dict[str, Any]):
        """Setup available AI providers"""
        if "purdue" in config:
            self.providers["purdue"] = PurdueGenAI(config["purdue"]["api_key"])
        
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
    # Configuration
    config = {
        "purdue": {
            "api_key": "your-purdue-api-key-here"
        }
    }
    
    # Initialize gateway
    gateway = AIGateway(config)
    
    try:
        # Simple chat
        response = gateway.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
        
        # Check available providers
        print(f"Available providers: {gateway.get_available_providers()}")
        
    except Exception as e:
        print(f"Error: {e}")
