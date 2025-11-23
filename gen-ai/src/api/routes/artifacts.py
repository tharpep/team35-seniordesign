"""
Artifact generation endpoints
Handles flashcards, MCQ, and insights generation
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from src.api.models.artifacts import ArtifactRequest
from src.artifact_creation.generators.flashcard_generator import FlashcardGenerator
from src.artifact_creation.generators.mcq_generator import MCQGenerator
from src.artifact_creation.generators.insights_generator import InsightsGenerator
from src.api.dependencies import (
    get_flashcard_generator,
    get_mcq_generator,
    get_insights_generator
)
from logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["artifacts"])


@router.post("/flashcards")
async def generate_flashcards(
    request: ArtifactRequest,
    generator: FlashcardGenerator = Depends(get_flashcard_generator)
):
    """
    Generate flashcards for a given topic
    
    Returns full artifact JSON including provenance and metrics
    Error artifacts are passed through directly if generation fails
    """
    logger.info(f"Generating flashcards: topic='{request.topic}', num_items={request.num_items}")
    
    try:
        # Run sync generator in thread pool
        artifact = await asyncio.to_thread(
            generator.generate,
            request.topic,
            request.num_items
        )
        
        logger.info(f"Flashcards generated successfully (latency: {artifact.get('metrics', {}).get('latency_ms', 0)}ms)")
        return artifact
        
    except Exception as e:
        logger.error(f"Flashcard generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "code": "GENERATION_ERROR",
                "details": {"topic": request.topic, "num_items": request.num_items}
            }
        )


@router.post("/mcq")
async def generate_mcq(
    request: ArtifactRequest,
    generator: MCQGenerator = Depends(get_mcq_generator)
):
    """
    Generate multiple-choice questions for a given topic
    
    Returns full artifact JSON including provenance and metrics
    Error artifacts are passed through directly if generation fails
    """
    logger.info(f"Generating MCQ: topic='{request.topic}', num_items={request.num_items}")
    
    try:
        # Run sync generator in thread pool
        artifact = await asyncio.to_thread(
            generator.generate,
            request.topic,
            request.num_items
        )
        
        logger.info(f"MCQ generated successfully (latency: {artifact.get('metrics', {}).get('latency_ms', 0)}ms)")
        return artifact
        
    except Exception as e:
        logger.error(f"MCQ generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "code": "GENERATION_ERROR",
                "details": {"topic": request.topic, "num_items": request.num_items}
            }
        )


@router.post("/insights")
async def generate_insights(
    request: ArtifactRequest,
    generator: InsightsGenerator = Depends(get_insights_generator)
):
    """
    Generate insights for a given topic
    
    Returns full artifact JSON including provenance and metrics
    Error artifacts are passed through directly if generation fails
    """
    logger.info(f"Generating insights: topic='{request.topic}', num_items={request.num_items}")
    
    try:
        # Run sync generator in thread pool
        artifact = await asyncio.to_thread(
            generator.generate,
            request.topic,
            request.num_items
        )
        
        logger.info(f"Insights generated successfully (latency: {artifact.get('metrics', {}).get('latency_ms', 0)}ms)")
        return artifact
        
    except Exception as e:
        logger.error(f"Insights generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "code": "GENERATION_ERROR",
                "details": {"topic": request.topic, "num_items": request.num_items}
            }
        )

