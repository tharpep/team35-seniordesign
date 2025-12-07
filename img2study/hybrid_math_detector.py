#!/usr/bin/env python3
"""
Hybrid Mathematical Expression Detector
3-stage detection: Fast Heuristics → Visual Geometry → MathPix Validation
"""

import re
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional


# ============================================================================
# STAGE 1: Fast Heuristic Filter (Textual)
# ============================================================================

def detect_math_symbols(text: str) -> Dict[str, Any]:
    """
    Fast regex-based detection of mathematical content.

    Returns:
        {
            "math_class": "simple" | "ambiguous" | "none",
            "has_symbols": bool,
            "has_functions": bool,
            "word_count": int
        }
    """
    if not text or len(text.strip()) == 0:
        return {"math_class": "none", "has_symbols": False, "has_functions": False, "word_count": 0}

    text = text.strip()
    word_count = len(text.split())

    # Skip long paragraphs (likely text, not math)
    if word_count > 10:
        return {"math_class": "none", "has_symbols": False, "has_functions": False, "word_count": word_count}

    # Common math symbols (Unicode + ASCII)
    math_symbols = [
        r'[=<>≤≥≠±∓∞]',  # Comparison, equality, infinity
        r'[+\-×÷·^%]',    # Basic operators
        r'[√∑∫∏∂∇]',     # Advanced operators
        r'[ΔθλμΩπσρτφαβγδε]',  # Greek letters
        r'[→⇌↔]',         # Arrows
        r'[∈∉⊂⊃∪∩]',     # Set theory
    ]

    # Scientific function names
    math_functions = r'\b(sin|cos|tan|cot|sec|csc|log|ln|exp|lim|max|min|arcsin|arccos|arctan)\b'

    # Variable-number patterns (v2, i3, x1)
    variable_number = r'\b[a-zA-Z]\d+\b'

    # Equation numbering (2.12), (3.4)
    equation_number = r'\(\d+\.\d+\)'

    # Check for patterns
    has_symbols = any(re.search(pattern, text) for pattern in math_symbols)
    has_functions = re.search(math_functions, text, re.IGNORECASE) is not None
    has_var_number = re.search(variable_number, text) is not None
    has_eq_number = re.search(equation_number, text) is not None

    # Fractions (v/R, 1/2)
    has_fraction = re.search(r'\b[a-zA-Z0-9]+\s*/\s*[a-zA-Z0-9]+\b', text) is not None

    # Classify
    if has_symbols or has_functions or has_fraction or has_eq_number:
        return {
            "math_class": "simple",
            "has_symbols": True,
            "has_functions": has_functions,
            "word_count": word_count
        }
    elif has_var_number and word_count <= 3:
        # Short with variable numbers, ambiguous
        return {
            "math_class": "ambiguous",
            "has_symbols": False,
            "has_functions": False,
            "word_count": word_count
        }
    elif word_count <= 2 and len(text) < 20:
        # Very short, could be part of equation
        return {
            "math_class": "ambiguous",
            "has_symbols": False,
            "has_functions": False,
            "word_count": word_count
        }
    else:
        return {
            "math_class": "none",
            "has_symbols": False,
            "has_functions": False,
            "word_count": word_count
        }


# ============================================================================
# STAGE 2: Visual Geometry Analysis (OpenCV Heuristics)
# ============================================================================

def get_bbox_geometry(bbox: List[int]) -> Dict[str, float]:
    """Extract geometric features from bounding box."""
    x_min, y_min, x_max, y_max = bbox
    width = x_max - x_min
    height = y_max - y_min

    return {
        "width": width,
        "height": height,
        "aspect_ratio": width / height if height > 0 else 0,
        "center_x": (x_min + x_max) / 2,
        "center_y": (y_min + y_max) / 2,
        "area": width * height
    }


def is_centered(bbox: List[int], page_width: int, threshold: float = 0.3) -> bool:
    """Check if bbox is horizontally centered on page."""
    x_min, _, x_max, _ = bbox
    center_x = (x_min + x_max) / 2
    page_center = page_width / 2

    distance_from_center = abs(center_x - page_center)
    return distance_from_center < (page_width * threshold)


def is_isolated(bbox: List[int], all_bboxes: List[List[int]], min_gap: int = 50) -> bool:
    """Check if bbox is spatially isolated from others."""
    x_min, y_min, x_max, y_max = bbox

    for other in all_bboxes:
        if other == bbox:
            continue

        ox_min, oy_min, ox_max, oy_max = other

        # Check vertical gap
        vertical_gap = min(abs(y_min - oy_max), abs(oy_min - y_max))

        # Check horizontal overlap
        horizontal_overlap = not (x_max < ox_min or ox_max < x_min)

        if horizontal_overlap and vertical_gap < min_gap:
            return False

    return True


def detect_vertical_stack(bbox1: List[int], bbox2: List[int],
                          horizontal_tolerance: int = 80,
                          vertical_gap_range: Tuple[int, int] = (10, 100)) -> bool:
    """
    Detect if two bboxes are vertically stacked (like numerator/denominator).

    Args:
        bbox1: Upper bbox [x_min, y_min, x_max, y_max]
        bbox2: Lower bbox
        horizontal_tolerance: Max horizontal offset for alignment
        vertical_gap_range: (min_gap, max_gap) for vertical spacing
    """
    x1_min, y1_min, x1_max, y1_max = bbox1
    x2_min, y2_min, x2_max, y2_max = bbox2

    # Check horizontal alignment
    center_x1 = (x1_min + x1_max) / 2
    center_x2 = (x2_min + x2_max) / 2
    horizontal_distance = abs(center_x1 - center_x2)

    if horizontal_distance > horizontal_tolerance:
        return False

    # Check vertical gap
    vertical_gap = y2_min - y1_max
    min_gap, max_gap = vertical_gap_range

    if min_gap <= vertical_gap <= max_gap:
        return True

    return False


def analyze_visual_geometry(lines: List[Dict[str, Any]],
                            page_width: int,
                            page_height: int) -> List[Dict[str, Any]]:
    """
    Analyze spatial layout to detect display equations.

    Returns annotated lines with visual classification.
    """
    from dla_processor import get_line_bbox

    all_bboxes = [get_line_bbox(line) for line in lines]

    for i, line in enumerate(lines):
        bbox = all_bboxes[i]
        geom = get_bbox_geometry(bbox)

        # Skip if already classified as simple math
        if line.get("math_class") == "simple":
            continue

        # Only analyze ambiguous or short lines
        if line.get("math_class") != "ambiguous" and line.get("word_count", 0) > 3:
            continue

        # Visual heuristics
        is_centered_on_page = is_centered(bbox, page_width)
        is_isolated_region = is_isolated(bbox, all_bboxes)
        is_tall_and_narrow = geom["aspect_ratio"] < 3 and geom["height"] > 40

        # Check for vertical stacking (fractions)
        is_stacked = False
        if i + 1 < len(lines):
            next_bbox = all_bboxes[i + 1]
            is_stacked = detect_vertical_stack(bbox, next_bbox)

        # Classify as display equation if visual patterns match
        if is_centered_on_page or is_isolated_region or is_tall_and_narrow or is_stacked:
            line["visual_classification"] = "display_equation"
            line["visual_features"] = {
                "centered": is_centered_on_page,
                "isolated": is_isolated_region,
                "tall_narrow": is_tall_and_narrow,
                "stacked": is_stacked
            }
        else:
            line["visual_classification"] = "inline"

    return lines


# ============================================================================
# STAGE 3: MathPix Semantic Validation
# ============================================================================

def should_use_mathpix(line: Dict[str, Any]) -> bool:
    """
    Decide if this line should be sent to MathPix.

    Criteria:
    - Visual classification = display_equation
    - OR math_class = simple + contains complex symbols
    """
    visual_class = line.get("visual_classification", "")
    math_class = line.get("math_class", "none")

    # Always send display equations
    if visual_class == "display_equation":
        return True

    # Send simple math if it might be complex
    if math_class == "simple":
        text = line.get("text", "")
        # Check for complex symbols that need MathPix
        complex_symbols = r'[√∑∫∏∂∇]|\\frac|\\int|\\sum'
        if re.search(complex_symbols, text):
            return True

    return False


def validate_mathpix_output(latex: str, confidence: float) -> bool:
    """
    Check if MathPix output is trustworthy.

    Returns True if output should be used.
    """
    if confidence < 0.8:
        return False

    # Check for LaTeX math tokens
    math_tokens = [
        r'\\frac', r'\\int', r'\\sum', r'\\prod',
        r'\\sqrt', r'\\partial', r'\\nabla',
        r'\\left', r'\\right', r'\\tag'
    ]

    has_math = any(re.search(token, latex) for token in math_tokens)

    # Also accept if it has math operators
    has_operators = re.search(r'[=+\-×÷^]', latex) is not None

    return has_math or has_operators


# ============================================================================
# Combined Pipeline
# ============================================================================

def classify_lines_hybrid(lines: List[Dict[str, Any]],
                         page_width: int,
                         page_height: int) -> List[Dict[str, Any]]:
    """
    Run full 3-stage hybrid detection pipeline.

    Stage 1: Fast symbolic detection
    Stage 2: Visual geometry analysis
    Stage 3: Tag for MathPix validation

    Returns annotated lines with classification metadata.
    """
    # Stage 1: Fast heuristic filter
    for line in lines:
        text = line.get("text", "")
        detection = detect_math_symbols(text)
        line.update(detection)

    # Stage 2: Visual geometry analysis
    lines = analyze_visual_geometry(lines, page_width, page_height)

    # Stage 3: Tag for MathPix
    for line in lines:
        line["needs_mathpix"] = should_use_mathpix(line)
        line["mathpix_latex"] = None
        line["mathpix_confidence"] = None
        line["mathpix_used"] = False

    return lines


def get_performance_stats(lines: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate performance statistics."""
    total = len(lines)
    math_simple = sum(1 for line in lines if line.get("math_class") == "simple")
    ambiguous = sum(1 for line in lines if line.get("math_class") == "ambiguous")
    needs_mathpix = sum(1 for line in lines if line.get("needs_mathpix", False))

    return {
        "total_lines": total,
        "math_simple": math_simple,
        "ambiguous": ambiguous,
        "needs_mathpix": needs_mathpix,
        "mathpix_percentage": (needs_mathpix / total * 100) if total > 0 else 0
    }
