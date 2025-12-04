"""
Insights Generator
Generates key insights and takeaways from retrieved context using RAG
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
    
    def generate(self, topic: str, num_items: int = 1) -> Dict[str, Any]:
        """
        Generate insights for the given topic
        
        Args:
            topic: Topic to generate insights about
            num_items: Number of insights to generate (default 1)
            
        Returns:
            Dictionary containing the generated insights
        """
        start_time = time.time()
        
        # Load insights generation prompt template
        from src.utils.prompt_loader import load_prompt_template
        prompt = load_prompt_template(
            "artifact_insights_template.txt",
            num_items=num_items,
            topic=topic
        )
        if not prompt:
            # Fallback if template file missing
            prompt = f'Create {num_items} key insight about "{topic}". Respond with ONLY valid JSON matching the insights schema.'
        
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
