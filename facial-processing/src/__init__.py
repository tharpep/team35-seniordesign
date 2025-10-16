"""
Facial Processing Subsystem for AI Study Glasses

Main package for real-time facial analysis including:
- Face detection and landmark extraction
- Focus/attention estimation
- Emotion classification
"""

__version__ = "1.0.0"
__author__ = "Team 35 - AI Study Glasses"

from .core import (
    FacialProcessor,
    ProcessingResult,
    get_config,
    FacialProcessingConfig
)

__all__ = [
    'FacialProcessor',
    'ProcessingResult',
    'get_config',
    'FacialProcessingConfig',
]
