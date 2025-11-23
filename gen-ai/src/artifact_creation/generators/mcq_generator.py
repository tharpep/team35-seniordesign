"""
MCQ Generator
Generates multiple-choice questions from retrieved context using RAG
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


class MCQGenerator(BaseArtifactGenerator):
    """Generates multiple-choice questions from retrieved context"""
    
    def __init__(self, rag_system: BasicRAG):
        """
        Initialize MCQ generator
        
        Args:
            rag_system: BasicRAG instance for context retrieval
        """
        # Get paths relative to this file
        base_path = Path(__file__).parent.parent
        template_path = base_path / "templates" / "mcq.json"
        
        super().__init__(rag_system, str(template_path))
    
    def generate(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """
        Generate MCQ questions for the given topic
        
        Args:
            topic: Topic to generate MCQs about
            num_items: Number of MCQ questions to generate (default 1)
            
        Returns:
            Dictionary containing the generated MCQ questions
        """
        start_time = time.time()
        
        # Load MCQ generation prompt template
        from src.utils.prompt_loader import load_prompt_template
        prompt = load_prompt_template(
            "artifact_mcq_template.txt",
            num_items=num_items,
            topic=topic
        )
        if not prompt:
            # Fallback if template file missing
            prompt = f'Create {num_items} multiple-choice question about "{topic}". Respond with ONLY valid JSON matching the MCQ schema.'
        
        # Use existing RAG system with artifact token limit
        result = self.rag.query(prompt, max_tokens=self.rag.config.max_tokens)
        
        # Handle tuple return format
        if isinstance(result, tuple):
            answer, context_docs, context_scores = result
        else:
            answer = result
            context_docs = []
            context_scores = []
        
        # Try to parse JSON using extraction method (more robust)
        artifact = self._extract_json_from_response(answer)
        
        # If extraction failed (error question present), try fallback
        if artifact.get("questions") and artifact["questions"][0].get("id") == "mcq_error":
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
        Get MCQ-specific generation instructions
        
        Args:
            topic: Topic to generate MCQs about
            num_items: Number of MCQ questions to generate
            
        Returns:
            Instructions string
        """
        return f"""Generate {num_items} high-quality multiple-choice question(s) about "{topic}".

Each question should have:
- **Stem**: A clear, well-formulated question or problem statement
- **Options**: 4-6 plausible answer choices (only one correct)
- **Answer Index**: The index (0-based) of the correct answer
- **Rationale**: Explanation of why the correct answer is right
- **Bloom Level**: Cognitive level (remember, understand, apply, analyze, evaluate, create)

Focus on:
- Testing understanding, not just memorization
- Creating plausible distractors (wrong answers)
- Clear, unambiguous question stems
- Educational value in the rationale
- Appropriate difficulty level

Use the retrieved context to ensure accuracy and create questions that test real understanding of the material."""
    
    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """
        Extract JSON from response that might contain extra text
        
        Args:
            response: Raw response from LLM
            
        Returns:
            Parsed JSON dictionary
        """
        # First, try to clean markdown code blocks
        cleaned = response.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:].strip()
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:].strip()
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3].strip()
        
        # Try direct parse first (most common case)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON block using brace counting (handles nested JSON)
        start_idx = cleaned.find('{')
        if start_idx != -1:
            brace_count = 0
            json_end = start_idx
            
            for i, char in enumerate(cleaned[start_idx:], start_idx):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i
                        break
            
            if brace_count == 0:  # Found complete JSON
                json_str = cleaned[start_idx:json_end + 1]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass
        
        # Fallback: return template structure with error
        return {
            "artifact_type": "mcq",
            "version": "1.0",
            "questions": [{
                "id": "mcq_error",
                "stem": "Error parsing response",
                "options": [
                    "Could not parse LLM response",
                    "JSON parsing failed",
                    "Invalid response format",
                    "Generation error occurred"
                ],
                "answer_index": 0,
                "rationale": f"Could not parse LLM response: {response[:200]}...",
                "bloom_level": "remember",
                "source_refs": []
            }]
        }
