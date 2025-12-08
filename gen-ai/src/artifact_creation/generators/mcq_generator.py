"""
MCQ Generator
Generates multiple-choice questions from retrieved context using RAG
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional

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
    
    def generate(self, topic: Optional[str] = None, num_items: int = 1, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate MCQ questions for the given topic
        
        Args:
            topic: Topic to generate MCQs about (None to extract from RAG)
            num_items: Number of MCQ questions to generate (default 1)
            session_context: Optional session context dict with session_id, session_title
            
        Returns:
            Dictionary containing the generated MCQ questions (includes extracted_topic if topic was None)
        """
        start_time = time.time()
        
        # Extract topic from RAG if not provided
        extracted_topic = None
        if topic is None:
            extracted_topic = self._extract_topic_from_rag(session_context)
            topic = extracted_topic
        
        # Build variation instruction FIRST (before loading template)
        # This ensures it's prominent in the prompt
        variation_instruction = "CRITICAL REQUIREMENT - You MUST create a UNIQUE multiple-choice question that is DIFFERENT from all previous MCQ questions.\n\n"
        
        # Add existing artifacts list if available
        if session_context and session_context.get('existing_artifacts'):
            existing = session_context['existing_artifacts']
            if existing:
                variation_instruction += "EXISTING MCQ QUESTIONS TO AVOID DUPLICATING:\n"
                for i, preview in enumerate(existing, 1):
                    variation_instruction += f"{i}. {preview}\n"
                variation_instruction += "\n"
        
        variation_instruction += """MCQ-SPECIFIC REQUIREMENTS:
- Create a question stem that tests a DIFFERENT specific aspect, subtopic, or application than existing MCQs
- If existing MCQs ask general questions, create something that tests ONE specific detail, calculation, or concept in depth
- If existing MCQs are general, create something specific (test understanding of a particular law, formula, or application scenario)
- If existing MCQs are specific, create something about relationships, comparisons, or broader conceptual understanding
- Use different question types: instead of "What is X?" try "Which scenario demonstrates X?", "What would happen if X?", "Calculate X given Y", or "Which statement about X is correct?"
- Focus on different Bloom's taxonomy levels: if existing test knowledge, test comprehension, application, or analysis
- Create plausible distractors that test common misconceptions or related but incorrect concepts
- Explore unique angles: problem-solving scenarios, calculation-based questions, scenario analysis, comparative questions, cause-and-effect relationships

"""
        
        # Load MCQ generation prompt template
        from src.utils.prompt_loader import load_prompt_template
        base_prompt = load_prompt_template(
            "artifact_mcq_template.txt",
            num_items=num_items,
            topic=topic
        )
        if not base_prompt:
            # Fallback if template file missing
            base_prompt = f'Create {num_items} multiple-choice question about "{topic}". Respond with ONLY valid JSON matching the MCQ schema.'
        
        # Prepend variation instruction to the prompt (not append)
        prompt = variation_instruction + base_prompt
        
        # Append session context to prompt if available
        if session_context:
            context_parts = []
            if session_context.get('session_id'):
                context_parts.append(f"Session ID: {session_context['session_id']}")
            if session_context.get('session_title'):
                context_parts.append(f"Session: {session_context['session_title']}")
            
            if context_parts:
                context_text = "\n\nSession Context:\n" + "\n".join(context_parts)
                prompt = prompt + context_text
        
        # Determine collection name from session context
        collection_name = None
        if session_context and session_context.get('session_id'):
            collection_name = f"session_docs_{session_context['session_id']}"
        
        # Use existing RAG system with artifact token limit
        result = self.rag.query(prompt, max_tokens=self.rag.config.max_tokens, collection_name=collection_name)
        
        # Handle tuple return format
        if isinstance(result, tuple):
            answer, context_docs, context_scores = result
        else:
            answer = result
            context_docs = []
            context_scores = []
        
        # Check if we got a "no documents" message - this means collection is empty or doesn't exist
        if answer and ("No documents" in answer or "not found" in answer.lower() or "still be ingesting" in answer.lower()):
            # Return a user-friendly error artifact
            return {
                "artifact_type": "mcq",
                "version": "1.0",
                "error": "insufficient_context",
                "message": answer,
                "topic": topic,
                "questions": [],
                "provenance": {},
                "metrics": {
                    "tokens_in": len(prompt) // 4,
                    "tokens_out": 0,
                    "latency_ms": round((time.time() - start_time) * 1000, 2),
                    "retrieval_scores": []
                }
            }
        
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
        
        # Add extracted_topic if topic was extracted from RAG
        if extracted_topic is not None:
            artifact["extracted_topic"] = extracted_topic
        
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
