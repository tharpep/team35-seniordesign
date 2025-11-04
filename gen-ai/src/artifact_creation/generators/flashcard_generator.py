"""
Flashcard Generator
Generates flashcards from retrieved context using RAG
"""

import json
import time
from pathlib import Path
from typing import Dict, Any

# Add project root to path for imports
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from artifact_creation.base_generator import BaseArtifactGenerator
from src.rag.rag_setup import BasicRAG


class FlashcardGenerator(BaseArtifactGenerator):
    """Generates flashcards from retrieved context"""
    
    def __init__(self, rag_system: BasicRAG):
        """
        Initialize flashcard generator
        
        Args:
            rag_system: BasicRAG instance for context retrieval
        """
        # Get paths relative to this file
        base_path = Path(__file__).parent.parent
        template_path = base_path / "templates" / "flashcard.json"
        
        super().__init__(rag_system, str(template_path))
    
    def generate(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """
        Generate flashcards for the given topic
        
        Args:
            topic: Topic to generate flashcards about
            num_items: Number of flashcards to generate (default 1)
            
        Returns:
            Dictionary containing the generated flashcards
        """
        start_time = time.time()
        
        # Create specific prompt for flashcards
        prompt = f"""Create {num_items} flashcard about "{topic}".

IMPORTANT: Respond with ONLY valid JSON. No additional text, explanations, or markdown formatting.

Required JSON format:
{{
  "artifact_type": "flashcards",
  "version": "1.0",
  "cards": [
    {{
      "id": "fc_001",
      "front": "Question here",
      "back": "Answer here",
      "tags": ["topic"],
      "difficulty": 2,
      "source_refs": ["N1"],
      "hints": []
    }}
  ]
}}

Generate the JSON now:"""
        
        # Use existing RAG system with artifact token limit
        result = self.rag.query(prompt, max_tokens=self.rag.config.max_tokens)
        
        # Handle tuple return format
        if isinstance(result, tuple):
            answer, context_docs, context_scores = result
        else:
            answer = result
            context_docs = []
            context_scores = []
        
        # Try to parse JSON with cleanup
        try:
            # Clean up common JSON issues
            cleaned_answer = answer.strip()
            
            # Remove markdown code blocks if present
            if cleaned_answer.startswith('```json'):
                cleaned_answer = cleaned_answer[7:]  # Remove ```json
            if cleaned_answer.startswith('```'):
                cleaned_answer = cleaned_answer[3:]   # Remove ```
            if cleaned_answer.endswith('```'):
                cleaned_answer = cleaned_answer[:-3]  # Remove trailing ```
            
            cleaned_answer = cleaned_answer.strip()
            
            artifact = json.loads(cleaned_answer)
        except json.JSONDecodeError:
            artifact = self._create_fallback_artifact(answer, topic)
        
        # Add provenance and metrics
        artifact["provenance"] = self._create_provenance(context_docs, context_scores)
        artifact["metrics"] = {
            "tokens_in": len(prompt) // 4,
            "tokens_out": len(answer) // 4,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "retrieval_scores": context_scores
        }
        
        return artifact
    
    def _get_generation_instructions(self, topic: str, num_items: int) -> str:
        """
        Get flashcard-specific generation instructions
        
        Args:
            topic: Topic to generate flashcards about
            num_items: Number of flashcards to generate
            
        Returns:
            Instructions string
        """
        return f"""Generate {num_items} high-quality flashcard(s) about "{topic}".

Each flashcard should have:
- **Front**: A clear, concise question or prompt
- **Back**: A detailed, accurate answer
- **Tags**: Relevant topic tags
- **Difficulty**: Integer 1-5 (1=easy, 5=expert)
- **Hints**: Optional hints for the front side

Focus on:
- Key concepts, definitions, and important facts
- Clear, educational language
- Appropriate difficulty level
- Comprehensive but concise answers

Use the retrieved context to ensure accuracy and relevance."""
    
