"""
Region data structure for Document Layout Analysis.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Region:
    """Represents a segmented region on the page."""
    region_type: str  # "text_block", "table", "equation_display", "equation_inline"
    bbox: List[int]   # [x_min, y_min, x_max, y_max]
    confidence: float
    lines: List[Dict[str, Any]]  # OCR lines within this region
    reading_order: int = 0
    mathpix_latex: Optional[str] = None  # MathPix-processed LaTeX 
    mathpix_confidence: Optional[float] = None  # MathPix confidence

    @property
    def center_y(self) -> float:
        """Vertical center of region."""
        return (self.bbox[1] + self.bbox[3]) / 2

    @property
    def center_x(self) -> float:
        """Horizontal center of region."""
        return (self.bbox[0] + self.bbox[2]) / 2

    @property
    def width(self) -> int:
        """Width of region."""
        return self.bbox[2] - self.bbox[0]

    @property
    def height(self) -> int:
        """Height of region."""
        return self.bbox[3] - self.bbox[1]
