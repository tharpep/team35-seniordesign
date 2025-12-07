"""Geometry and bounding box utilities for layout analysis."""

from typing import List, Dict, Any


def get_line_bbox(line: Dict[str, Any]) -> List[int]:
    """Extract normalized [x_min, y_min, x_max, y_max] from line bbox."""
    bbox = line['bbox']

    # Handle both polygon format [[x,y], [x,y], ...] and flat format [x1,y1,x2,y2]
    if isinstance(bbox[0], list):
        x_coords = [p[0] for p in bbox]
        y_coords = [p[1] for p in bbox]
        return [min(x_coords), min(y_coords), max(x_coords), max(y_coords)]
    return bbox


def bboxes_overlap_vertically(bbox1: List[int], bbox2: List[int], threshold: float = 0.5) -> bool:
    """Check if two bboxes overlap vertically by at least threshold ratio."""
    y1_min, y1_max = bbox1[1], bbox1[3]
    y2_min, y2_max = bbox2[1], bbox2[3]

    overlap_start = max(y1_min, y2_min)
    overlap_end = min(y1_max, y2_max)
    overlap = max(0, overlap_end - overlap_start)

    height1 = y1_max - y1_min
    height2 = y2_max - y2_min
    min_height = min(height1, height2)

    # Compare overlap to smaller bbox height to detect partial overlaps
    return overlap / min_height >= threshold if min_height > 0 else False


def is_centered(bbox: List[int], page_width: int, threshold: float = 0.3) -> bool:
    """Check if bbox is horizontally centered on the page (used for display equations)."""
    x_min, x_max = bbox[0], bbox[2]
    center_x = (x_min + x_max) / 2
    page_center = page_width / 2
    distance_from_center = abs(center_x - page_center)
    return distance_from_center < (page_width * threshold)
