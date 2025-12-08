"""
OCR Processors package.

Contains modules for document layout analysis, math detection, and OCR processing.
"""

from .region import Region
from .geometry_utils import get_line_bbox, bboxes_overlap_vertically, is_centered
from .dla_processor import run_dla_pipeline

__all__ = [
    'Region',
    'get_line_bbox',
    'bboxes_overlap_vertically',
    'is_centered',
    'run_dla_pipeline',
]
