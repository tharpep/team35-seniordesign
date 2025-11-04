"""
Simple AI Gateway
Routes requests to AI providers (Purdue GenAI Studio, Local Ollama)
Designed to be easily extended for additional providers
"""

import os
import sys
import asyncio
from typing import Dict, Any, Optional, List
from .purdue_api import PurdueGenAI
from .local import OllamaClient, OllamaConfig

# Add project root to path for config import
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config import get_rag_config

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


class AIGateway:
    """Simple gateway for AI requests"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize gateway with configuration
        
        Args:
            config: Dictionary with provider configurations
                   If None, will try to load from environment variables and config.py
        """
        self.providers = {}
        self.rag_config = get_rag_config()
        self._setup_providers(config or {})
    
    def _setup_providers(self, config: Dict[str, Any]):
        """Setup available AI providers"""
        # Setup Purdue provider
        if "purdue" in config:
            api_key = config["purdue"].get("api_key")
            self.providers["purdue"] = PurdueGenAI(api_key)
        elif os.getenv('PURDUE_API_KEY'):
            self.providers["purdue"] = PurdueGenAI()
        
        # Setup Local Ollama provider
        if "ollama" in config:
            ollama_config = OllamaConfig(
                base_url=config["ollama"].get("base_url", "http://localhost:11434"),
                default_model=config["ollama"].get("default_model", self.rag_config.model_name)
            )
            self.providers["ollama"] = OllamaClient(ollama_config)
        elif self.rag_config.use_ollama or os.getenv('USE_OLLAMA', 'false').lower() == 'true':
            ollama_config = OllamaConfig(
                default_model=self.rag_config.model_name
            )
            self.providers["ollama"] = OllamaClient(ollama_config)
    
    def chat(self, message: str, provider: Optional[str] = None, model: Optional[str] = None, max_tokens: Optional[int] = None, system_prompt: Optional[str] = None) -> str:
        """
        Send a chat message to specified AI provider
        
        Args:
            message: Your message to the AI
            provider: AI provider to use (auto-selects based on availability)
            model: Model to use (uses provider default if not specified)
            max_tokens: Maximum tokens in response (optional)
            system_prompt: System prompt to set AI behavior (optional)
            
        Returns:
            str: AI response
        """
        # Auto-select provider based on config
        if provider is None:
            if self.rag_config.use_ollama and "ollama" in self.providers:
                provider = "ollama"
            elif not self.rag_config.use_ollama and "purdue" in self.providers:
                provider = "purdue"
            elif "ollama" in self.providers:
                provider = "ollama"
            elif "purdue" in self.providers:
                provider = "purdue"
            else:
                raise Exception("No providers available. Set PURDUE_API_KEY or USE_OLLAMA=true")
        
        if provider not in self.providers:
            available = ", ".join(self.providers.keys())
            raise Exception(f"Provider '{provider}' not available. Available: {available}")
        
        provider_client = self.providers[provider]
        
        # Handle different provider types
        if provider == "ollama":
            return self._chat_ollama(provider_client, message, model, max_tokens, system_prompt)
        else:
            # Use config model for Purdue API if no model specified
            model = model or self.rag_config.model_name
            return self._chat_with_system_prompt(provider_client, message, model, max_tokens, system_prompt)
    
    def _chat_ollama(self, client: OllamaClient, message: str, model: Optional[str] = None, max_tokens: Optional[int] = None, system_prompt: Optional[str] = None) -> str:
        """Helper to handle Ollama calls"""
        # For now, Ollama doesn't support system prompts in our current implementation
        # Just use the message directly
        return client.chat(message, model=model, max_tokens=max_tokens)
    
    def _chat_with_system_prompt(self, client, message: str, model: Optional[str] = None, max_tokens: Optional[int] = None, system_prompt: Optional[str] = None) -> str:
        """Helper to handle calls with system prompt"""
        if system_prompt:
            # Create messages list with system prompt
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            return client.chat(messages, model, max_tokens)
        else:
            # Use simple string message
            return client.chat(message, model, max_tokens)
    
    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        return list(self.providers.keys())


if __name__ == "__main__":
    try:
        gateway = AIGateway()
        response = gateway.chat("Hello! What is your name?")
        print(f"AI Response: {response}")
        print(f"Available providers: {gateway.get_available_providers()}")
    except Exception as e:
        print(f"Error: {e}")
