"""
Test Purdue GenAI API client
"""

import pytest
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, mock_open

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))

from src.ai_providers.purdue_api import PurdueGenAI


class TestPurdueGenAI:
    """Test cases for PurdueGenAI client"""
    
    def test_init_with_api_key(self):
        """Test initialization with API key"""
        client = PurdueGenAI("test-api-key")
        assert client.api_key == "test-api-key"
        assert client.base_url == "https://genai.rcac.purdue.edu/api/chat/completions"
    
    def test_init_from_env(self):
        """Test initialization from environment variable"""
        with patch.dict(os.environ, {'PURDUE_API_KEY': 'env-api-key'}):
            client = PurdueGenAI()
            assert client.api_key == "env-api-key"
    
    def test_init_no_api_key(self):
        """Test initialization without API key"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="API key is required"):
                PurdueGenAI()
    
    @patch('urllib.request.urlopen')
    def test_chat_string_message(self, mock_urlopen):
        """Test chat with string message"""
        # Mock response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": "Test response"}}]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = PurdueGenAI("test-key")
        response = client.chat("Hello")
        
        assert response == "Test response"
    
    @patch('urllib.request.urlopen')
    def test_chat_list_message(self, mock_urlopen):
        """Test chat with message list"""
        # Mock response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": "Test response"}}]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = PurdueGenAI("test-key")
        messages = [{"role": "user", "content": "Hello"}]
        response = client.chat(messages)
        
        assert response == "Test response"
    
    @patch('urllib.request.urlopen')
    def test_chat_custom_model(self, mock_urlopen):
        """Test chat with custom model"""
        # Mock response
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": "Test response"}}]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = PurdueGenAI("test-key")
        response = client.chat("Hello", model="custom-model")
        
        assert response == "Test response"
    
    @patch('urllib.request.urlopen')
    def test_chat_api_error(self, mock_urlopen):
        """Test chat with API error"""
        # Mock error response
        mock_response = MagicMock()
        mock_response.status = 400
        mock_response.read.return_value = b"Bad Request"
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        client = PurdueGenAI("test-key")
        
        with pytest.raises(Exception, match="API Error 400"):
            client.chat("Hello")
    
    @patch('urllib.request.urlopen')
    def test_chat_http_error(self, mock_urlopen):
        """Test chat with HTTP error"""
        import urllib.error
        
        # Mock HTTP error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="test", code=500, msg="Internal Server Error", hdrs={}, fp=None
        )
        
        client = PurdueGenAI("test-key")
        
        with pytest.raises(Exception, match="HTTP Error 500"):
            client.chat("Hello")
    
    def test_get_available_models(self):
        """Test getting available models"""
        client = PurdueGenAI("test-key")
        models = client.get_available_models()
        
        expected_models = [
            "llama3.1:latest",
            "llama3.1:70b", 
            "mistral:latest",
            "mixtral:latest"
        ]
        
        assert models == expected_models
    
    def test_health_check(self):
        """Test health check (inherited from BaseLLMClient)"""
        client = PurdueGenAI("test-key")
        # Base implementation returns True
        assert client.health_check() is True
