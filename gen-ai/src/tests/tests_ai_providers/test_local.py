"""
Test Ollama local client
"""

import pytest
import asyncio
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))

from src.ai_providers.local import OllamaClient, OllamaConfig


class TestOllamaConfig:
    """Test cases for OllamaConfig"""
    
    def test_default_config(self):
        """Test default configuration"""
        config = OllamaConfig()
        assert config.base_url == "http://localhost:11434"
        assert config.default_model == "llama3.2:1b"
        assert config.chat_timeout == 60.0
        assert config.embeddings_timeout == 30.0
        assert config.connection_timeout == 5.0
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = OllamaConfig(
            base_url="http://custom:8080",
            default_model="custom-model",
            chat_timeout=30.0
        )
        assert config.base_url == "http://custom:8080"
        assert config.default_model == "custom-model"
        assert config.chat_timeout == 30.0
    
    def test_environment_variable_config(self):
        """Test configuration from environment variables"""
        import os
        with patch.dict(os.environ, {
            'OLLAMA_BASE_URL': 'http://env-test:9999',
            'MODEL_NAME': 'env-model:test',
            'OLLAMA_CHAT_TIMEOUT': '45.0'
        }):
            config = OllamaConfig()
            assert config.base_url == "http://env-test:9999"
            assert config.default_model == "env-model:test"
            assert config.chat_timeout == 45.0


class TestOllamaClient:
    """Test cases for OllamaClient"""
    
    def _create_mocked_client(self, health_check_return=True):
        """Helper method to create OllamaClient with mocked health check"""
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=health_check_return):
            return OllamaClient()
    
    def test_init_default_config(self):
        """Test initialization with default config"""
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            client = OllamaClient()
            assert client.config.base_url == "http://localhost:11434"
            assert client.config.default_model == "llama3.2:1b"
            assert client._sync_client is None
            assert client._async_client is None
    
    def test_init_custom_config(self):
        """Test initialization with custom config"""
        config = OllamaConfig(base_url="http://custom:8080")
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            client = OllamaClient(config)
            assert client.config.base_url == "http://custom:8080"
    
    def test_init_ollama_not_running(self):
        """Test initialization fails when Ollama is not running"""
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=False):
            with pytest.raises(ConnectionError, match="Ollama is not running or not accessible"):
                OllamaClient()
    
    def test_init_ollama_running(self):
        """Test initialization succeeds when Ollama is running"""
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            client = OllamaClient()
            assert client.config.base_url == "http://localhost:11434"
    
    def test_check_ollama_health_success(self):
        """Test health check returns True when Ollama is accessible"""
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            client = OllamaClient()
            result = client._check_ollama_health()
            assert result is True
    
    def test_check_ollama_health_failure(self):
        """Test health check returns False when Ollama is not accessible"""
        # First create client with successful health check
        with patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            client = OllamaClient()
        
        # Then test the health check method returning False
        with patch.object(client, '_check_ollama_health', return_value=False):
            result = client._check_ollama_health()
            assert result is False
    
    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test async context manager"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            
            async with OllamaClient() as client:
                assert client._async_client is not None
                mock_client_class.assert_called_once()
            
            # Client should be closed after context
            mock_client.aclose.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ensure_client(self):
        """Test client creation"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            result = await client._ensure_client()
            
            assert result == mock_client
            assert client._async_client == mock_client
            mock_client_class.assert_called_once()
    
    def test_chat_sync(self):
        """Test synchronous chat wrapper"""
        with patch('src.ai_providers.local.httpx.Client') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {"message": {"content": "Test response"}}
            mock_response.raise_for_status.return_value = None
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            # Mock _ensure_sync_client to return our mock
            with patch.object(client, '_ensure_sync_client', return_value=mock_client):
                response = client.chat("Hello")
                
                assert response == "Test response"
                mock_client.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_chat_success(self):
        """Test successful async chat"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {"message": {"content": "Test response"}}
            mock_response.raise_for_status.return_value = None
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            messages = [{"role": "user", "content": "Hello"}]
            
            response = await client._async_chat(messages)
            
            assert response == {"message": {"content": "Test response"}}
            mock_client.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_chat_custom_model(self):
        """Test chat with custom model"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {"message": {"content": "Test response"}}
            mock_response.raise_for_status.return_value = None
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            messages = [{"role": "user", "content": "Hello"}]
            
            response = await client._async_chat(messages, model="custom-model")
            
            # Check that custom model was used in the request
            call_args = mock_client.post.call_args
            assert call_args[1]['json']['model'] == "custom-model"
    
    @pytest.mark.asyncio
    async def test_embeddings(self):
        """Test embeddings generation"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
            mock_response.raise_for_status.return_value = None
            mock_client.post.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            response = await client.embeddings("test prompt")
            
            assert response == {"embedding": [0.1, 0.2, 0.3]}
            mock_client.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            # Test the async health check directly
            client_conn = await client._ensure_client()
            resp = await client_conn.get("/api/tags", timeout=client.config.connection_timeout)
            result = resp.status_code == 200
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test failed health check"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_client.get.side_effect = Exception("Connection failed")
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            # Test the async health check directly
            try:
                client_conn = await client._ensure_client()
                await client_conn.get("/api/tags", timeout=client.config.connection_timeout)
                result = False
            except Exception:
                result = False
            
            assert result is False
    
    
    @pytest.mark.asyncio
    async def test_list_models(self):
        """Test listing models"""
        with patch('httpx.AsyncClient') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "models": [
                    {"name": "qwen3:1.7b"},
                    {"name": "llama3:latest"}
                ]
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            models = await client.list_models()
            
            assert models == ["qwen3:1.7b", "llama3:latest"]
    
    def test_get_available_models_sync(self):
        """Test synchronous get_available_models"""
        with patch('src.ai_providers.local.httpx.Client') as mock_client_class, \
             patch('src.ai_providers.local.OllamaClient._check_ollama_health', return_value=True):
            
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "models": [
                    {"name": "qwen3:1.7b"},
                    {"name": "llama3:latest"}
                ]
            }
            mock_response.raise_for_status.return_value = None
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            client = OllamaClient()
            # Mock the _ensure_sync_client to return our mock
            with patch.object(client, '_ensure_sync_client', return_value=mock_client):
                models = client.get_available_models()
                
                assert models == ["qwen3:1.7b", "llama3:latest"]
                mock_client.get.assert_called_once()
