"""
Base Artifact Generator
Simple base class for artifact generators using existing RAG system
"""

import json
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional

# Add project root to path for imports
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.rag.rag_setup import BasicRAG


class BaseArtifactGenerator(ABC):
    """Simple base class for artifact generators using existing RAG system"""
    
    def __init__(self, rag_system: BasicRAG, template_path: str):
        """
        Initialize base artifact generator
        
        Args:
            rag_system: BasicRAG instance for context retrieval
            template_path: Path to template JSON file
        """
        self.rag = rag_system
        self.template_path = Path(template_path)
        
        # Load template
        self.template = self._load_json_file(self.template_path)
        
        # Get artifact type from template
        self.artifact_type = self.template.get("artifact_type", "unknown")
    
    def _load_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file and return parsed data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise Exception(f"Failed to load JSON file {file_path}: {str(e)}")
    
    @abstractmethod
    def generate(self, topic: str, num_items: int = 1, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate artifacts for the given topic
        
        Args:
            topic: Topic to generate artifacts about
            num_items: Number of items to generate (default 1)
            session_context: Optional session context dict with session_id, session_title
            
        Returns:
            Dictionary containing the generated artifact
        """
        pass
    
    def _generate_with_rag(self, topic: str, prompt_template: str) -> Dict[str, Any]:
        """
        Generate artifact using RAG system (like existing chatbot)
        
        Args:
            topic: Topic to generate about
            prompt_template: Prompt template with {topic} placeholder
            
        Returns:
            Generated artifact dictionary
        """
        try:
            # Use existing RAG query method
            result = self.rag.query(f"Generate {self.artifact_type} about {topic}")
            
            # Handle tuple return format (answer, context_docs, context_scores)
            if isinstance(result, tuple):
                answer, context_docs, context_scores = result
            else:
                answer = result
                context_docs = []
                context_scores = []
            
            # Try to parse as JSON
            try:
                artifact = json.loads(answer)
            except json.JSONDecodeError:
                # Create fallback artifact
                artifact = self._create_fallback_artifact(answer, topic)
            
            # Add provenance and metrics
            artifact["provenance"] = self._create_provenance(context_docs, context_scores)
            artifact["metrics"] = {
                "tokens_in": len(answer) // 4,  # Rough estimate
                "tokens_out": len(answer) // 4,
                "latency_ms": 0,  # Will be set by caller
                "retrieval_scores": context_scores
            }
            
            return artifact
            
        except Exception as e:
            return self._create_error_artifact(str(e), topic)
    
    def _create_provenance(self, context_docs: list, context_scores: list) -> Dict[str, Any]:
        """Create simple provenance from context"""
        provenance = {}
        for i, (doc, score) in enumerate(zip(context_docs, context_scores), 1):
            provenance[f"N{i}"] = {
                "note_id": f"note_{i:03d}",
                "similarity": round(score, 3),
                "preview": doc[:100] + "..." if len(doc) > 100 else doc
            }
        return provenance
    
    def _create_fallback_artifact(self, response: str, topic: str) -> Dict[str, Any]:
        """Create fallback artifact when JSON parsing fails"""
        # Try to extract partial JSON if possible
        try:
            # Look for JSON structure in response
            start_idx = response.find('{')
            if start_idx != -1:
                # Try to find a complete JSON object
                brace_count = 0
                end_idx = start_idx
                for i, char in enumerate(response[start_idx:], start_idx):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i
                            break
                
                if brace_count == 0:  # Found complete JSON
                    json_str = response[start_idx:end_idx + 1]
                    return json.loads(json_str)
        except:
            pass
        
        # Fallback to error artifact
        return {
            "artifact_type": self.artifact_type,
            "version": "1.0",
            "error": "JSON parsing failed",
            "raw_response": response[:500] + "..." if len(response) > 500 else response,
            "topic": topic
        }
    
    def _create_error_artifact(self, error: str, topic: str) -> Dict[str, Any]:
        """Create error artifact"""
        return {
            "artifact_type": self.artifact_type,
            "version": "1.0",
            "error": error,
            "topic": topic,
            "provenance": {},
            "metrics": {"error": True}
        }
    
    @abstractmethod
    def _get_generation_instructions(self, topic: str, num_items: int) -> str:
        """
        Get specific generation instructions for this artifact type
        
        Args:
            topic: Topic to generate artifacts about
            num_items: Number of items to generate
            
        Returns:
            Instructions string
        """
        pass
