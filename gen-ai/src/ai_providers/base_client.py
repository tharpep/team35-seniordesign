"""
Base class for LLM clients.
All providers must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients"""
    
    @abstractmethod
    def chat(self, messages: Any, model: Optional[str] = None, **kwargs) -> str:
        """
        Send chat messages and get response.
        
        Args:
            messages: Chat messages (format can vary by provider)
            model: Model name (optional, uses default if not specified)
            **kwargs: Provider-specific parameters
            
        Returns:
            str: AI response text
        """
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[str]:
        """
        Get list of available models for this provider.
        
        Returns:
            List of model names
        """
        pass
    
    def health_check(self) -> bool:
        """
        Check if provider is available/healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            # Default implementation - can be overridden
            return True
        except:
            return False

