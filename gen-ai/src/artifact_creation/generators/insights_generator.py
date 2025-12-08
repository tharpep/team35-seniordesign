"""
Insights Generator
Generates key insights and takeaways from retrieved context using RAG
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


class InsightsGenerator(BaseArtifactGenerator):
    """Generates key insights and takeaways from retrieved context"""
    
    def __init__(self, rag_system: BasicRAG):
        """
        Initialize insights generator
        
        Args:
            rag_system: BasicRAG instance for context retrieval
        """
        # Get paths relative to this file
        base_path = Path(__file__).parent.parent
        template_path = base_path / "templates" / "insights.json"
        
        super().__init__(rag_system, str(template_path))
    
    def generate(self, topic: Optional[str] = None, num_items: int = 1, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate insights for the given topic
        
        Args:
            topic: Topic to generate insights about (None to extract from RAG)
            num_items: Number of insights to generate (default 1)
            session_context: Optional session context dict with session_id, session_title
            
        Returns:
            Dictionary containing the generated insights (includes extracted_topic if topic was None)
        """
        start_time = time.time()
        
        # Extract topic from RAG if not provided
        extracted_topic = None
        if topic is None:
            extracted_topic = self._extract_topic_from_rag(session_context)
            topic = extracted_topic
        
        # Build variation instruction FIRST (before loading template)
        # This ensures it's prominent in the prompt
        variation_instruction = "CRITICAL REQUIREMENT - You MUST create a UNIQUE insight that is DIFFERENT from all previous insights.\n\n"
        
        # Add existing artifacts list if available
        if session_context and session_context.get('existing_artifacts'):
            existing = session_context['existing_artifacts']
            if existing:
                variation_instruction += "EXISTING INSIGHTS TO AVOID DUPLICATING:\n"
                for i, preview in enumerate(existing, 1):
                    variation_instruction += f"{i}. {preview}\n"
                variation_instruction += "\n"
        
        variation_instruction += """INSIGHT-SPECIFIC REQUIREMENTS:
- Create an insight that highlights a DIFFERENT specific aspect, subtopic, or application than existing insights
- If existing insights cover general concepts, create something that highlights ONE specific detail, relationship, or implication in depth
- If existing insights are general, create something specific (highlight a particular application, connection, or deeper understanding)
- If existing insights are specific, create something about relationships, connections, or broader implications
- Focus on different insight types: if existing explain what, create insights about why, how, when, or what-if scenarios
- Explore unique angles: connections to other concepts, real-world implications, historical significance, practical applications, common misconceptions, deeper understanding, or unexpected relationships
- Provide actionable takeaways that complement but don't repeat existing insights

"""
        
        # Load insights generation prompt template
        from src.utils.prompt_loader import load_prompt_template
        base_prompt = load_prompt_template(
            "artifact_insights_template.txt",
            num_items=num_items,
            topic=topic
        )
        if not base_prompt:
            # Fallback if template file missing
            base_prompt = f'Create {num_items} key insight about "{topic}". Respond with ONLY valid JSON matching the insights schema.'
        
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
                "artifact_type": "insights",
                "version": "1.0",
                "error": "insufficient_context",
                "message": answer,
                "topic": topic,
                "insights": [],
                "provenance": {},
                "metrics": {
                    "tokens_in": len(prompt) // 4,
                    "tokens_out": 0,
                    "latency_ms": round((time.time() - start_time) * 1000, 2),
                    "retrieval_scores": []
                }
            }
        
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
        
        # Add extracted_topic if topic was extracted from RAG
        if extracted_topic is not None:
            artifact["extracted_topic"] = extracted_topic
        
        return artifact
    
    def _get_generation_instructions(self, topic: str, num_items: int) -> str:
        """
        Get insights-specific generation instructions
        
        Args:
            topic: Topic to generate insights about
            num_items: Number of insights to generate
            
        Returns:
            Instructions string
        """
        return f"""Generate {num_items} key insight(s) about "{topic}".

Each insight should have:
- **Title**: A concise, descriptive title
- **Takeaway**: The main insight or key point
- **Bullets**: Supporting details or sub-points
- **Action Items**: Practical steps or recommendations
- **Misconceptions**: Common misunderstandings to avoid
- **Confidence**: Confidence level (0.0-1.0) in the insight

Focus on:
- Synthesizing information from multiple sources
- Identifying patterns, connections, and implications
- Providing actionable insights
- Highlighting important nuances or caveats
- Building understanding beyond surface-level facts

Use the retrieved context to create insights that go beyond simple summarization and provide genuine value for learning and understanding."""
    
    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """
        Extract JSON from response that might contain extra text
        
        Args:
            response: Raw response from LLM
            
        Returns:
            Parsed JSON dictionary
        """
        # Try to find JSON block
        start_idx = response.find('{')
        end_idx = response.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = response[start_idx:end_idx + 1]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # Fallback: return template structure with error
        return {
            "artifact_type": "insights",
            "version": "1.0",
            "insights": [{
                "id": "ins_error",
                "title": "Error parsing response",
                "takeaway": f"Could not parse LLM response: {response[:200]}...",
                "bullets": ["JSON parsing failed", "Invalid response format"],
                "action_items": ["Check LLM response format", "Verify JSON structure"],
                "misconceptions": ["Response was valid JSON"],
                "confidence": 0.0,
                "source_refs": []
            }]
        }
