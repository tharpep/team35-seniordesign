#!/usr/bin/env python3
"""
Document Layout Analysis (DLA) Engine
Segments page into regions and applies specialized OCR per region type.
"""

import re
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from math_processor import (
    normalize_math_to_latex,
    extract_equation_number
)
from mathpix_ocr import process_equation_with_mathpix
from hybrid_math_detector import (
    classify_lines_hybrid,
    validate_mathpix_output,
    get_performance_stats
)


@dataclass
class Region:
    """Represents a segmented region on the page."""
    region_type: str  # "text_block", "table", "equation_display", "equation_inline"
    bbox: List[int]   # [x_min, y_min, x_max, y_max]
    confidence: float
    lines: List[Dict[str, Any]]  # OCR lines within this region
    reading_order: int = 0
    mathpix_latex: Optional[str] = None  # MathPix-processed LaTeX (if applicable)
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
        return self.bbox[2] - self.bbox[0]

    @property
    def height(self) -> int:
        return self.bbox[3] - self.bbox[1]


def get_line_bbox(line: Dict[str, Any]) -> List[int]:
    """Extract [x_min, y_min, x_max, y_max] from line bbox."""
    bbox = line['bbox']
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

    return overlap / min_height >= threshold if min_height > 0 else False


def is_centered(bbox: List[int], page_width: int, threshold: float = 0.3) -> bool:
    """Check if a bbox is horizontally centered on the page."""
    x_min, x_max = bbox[0], bbox[2]
    center_x = (x_min + x_max) / 2
    page_center = page_width / 2

    # Check if center is within threshold of page center
    distance_from_center = abs(center_x - page_center)
    return distance_from_center < (page_width * threshold)


def classify_region_type(lines: List[Dict[str, Any]], page_width: int) -> str:
    """Classify a group of lines as text_block, equation_display, or equation_inline.

    Uses hybrid detection metadata from lines.

    Args:
        lines: List of OCR lines in this region (with hybrid detection metadata)
        page_width: Width of the page for centering detection

    Returns:
        Region type: "text_block", "equation_display", or "equation_inline"
    """
    if not lines:
        return "text_block"

    # Check hybrid detection classifications
    math_simple = [line for line in lines if line.get('math_class') == 'simple']
    display_equations = [line for line in lines if line.get('visual_classification') == 'display_equation']

    # If all lines are display equations (visually detected)
    if len(display_equations) == len(lines):
        return "equation_display"

    # If all lines are simple math
    if len(math_simple) == len(lines):
        # Check if they should be display based on visual features
        if any(line.get('visual_classification') == 'display_equation' for line in lines):
            return "equation_display"

        # Check if short and has equation number
        if len(lines) <= 2:
            has_equation_number = any(extract_equation_number(line['text']) for line in lines)
            if has_equation_number:
                return "equation_display"

        # Otherwise inline
        return "equation_inline"

    # Mixed content or mostly text
    if len(math_simple) > 0:
        return "text_block"  # Text with inline math

    # Pure text
    return "text_block"


def merge_adjacent_display_equations(regions: List[Region], page_width: int) -> List[Region]:
    """
    Merge adjacent display equation regions that are vertically close.

    This fixes multi-line fractions like Δp/Δt that get split into separate regions.

    Rules:
    - Both regions must be display equations (centered, short width)
    - Vertical gap < 40px
    - Horizontal centers within 20% of page width
    """
    if len(regions) < 2:
        return regions

    merged = []
    skip_indices = set()

    for i, region in enumerate(regions):
        if i in skip_indices:
            continue

        # Check if this is a centered display equation
        is_centered = abs(((region.bbox[0] + region.bbox[2]) / 2) - (page_width / 2)) < (page_width * 0.2)
        region_width = region.bbox[2] - region.bbox[0]
        is_short = region_width < (page_width * 0.65)

        if not (is_centered and is_short):
            merged.append(region)
            continue

        # Look for adjacent display equations to merge
        merge_candidates = [region]

        for j in range(i + 1, len(regions)):
            if j in skip_indices:
                continue

            next_region = regions[j]

            # Check if next region is also centered and short
            next_is_centered = abs(((next_region.bbox[0] + next_region.bbox[2]) / 2) - (page_width / 2)) < (page_width * 0.2)
            next_region_width = next_region.bbox[2] - next_region.bbox[0]
            next_is_short = next_region_width < (page_width * 0.65)

            if not (next_is_centered and next_is_short):
                break

            # Check vertical gap
            vertical_gap = next_region.bbox[1] - merge_candidates[-1].bbox[3]
            if vertical_gap > 40:
                break

            # Merge this region
            merge_candidates.append(next_region)
            skip_indices.add(j)

        # Create merged region if we found multiple candidates
        if len(merge_candidates) > 1:
            all_lines = []
            for candidate in merge_candidates:
                all_lines.extend(candidate.lines)

            merged_region = create_region_from_lines(all_lines, page_width)
            merged_region.region_type = "equation_display"
            merged.append(merged_region)
        else:
            merged.append(region)

    # Reassign reading order
    for idx, region in enumerate(merged):
        region.reading_order = idx

    return merged


def segment_into_regions(
    detected_lines: List[Dict[str, Any]],
    image_width: int,
    image_height: int,
    vertical_gap_threshold: int = 30
) -> List[Region]:
    """Segment detected lines into logical regions.

    Args:
        detected_lines: All OCR lines from the page
        image_width: Page width for centering detection
        image_height: Page height
        vertical_gap_threshold: Vertical gap to split regions

    Returns:
        List of Region objects in reading order
    """
    if not detected_lines:
        return []

    # Sort lines by vertical position (top to bottom)
    sorted_lines = sorted(detected_lines, key=lambda x: get_line_bbox(x)[1])

    regions = []
    current_group = []

    for i, line in enumerate(sorted_lines):
        if not current_group:
            current_group = [line]
            continue

        # Check vertical gap from previous line
        prev_bbox = get_line_bbox(current_group[-1])
        curr_bbox = get_line_bbox(line)

        vertical_gap = curr_bbox[1] - prev_bbox[3]

        # Check if we should split based on content type change
        should_split_before = False
        should_split_after = False

        # Check if CURRENT line is a display equation
        current_is_display = line.get('visual_classification') == 'display_equation'
        current_has_eq_num = extract_equation_number(line['text']) if line.get('math_class') in ['simple', 'ambiguous'] else False

        # Check if PREVIOUS group ends with a display equation
        prev_is_display = current_group[-1].get('visual_classification') == 'display_equation' if current_group else False

        # Split BEFORE if current line is display equation
        if current_is_display or current_has_eq_num:
            should_split_before = True

        # Split AFTER if previous group ends with display equation
        if prev_is_display:
            should_split_before = True

        # Split if large vertical gap OR content type change
        if vertical_gap > vertical_gap_threshold or should_split_before:
            # Finalize current group as region
            region = create_region_from_lines(current_group, image_width)
            regions.append(region)
            current_group = [line]
        else:
            current_group.append(line)

    # Add final group
    if current_group:
        region = create_region_from_lines(current_group, image_width)
        regions.append(region)

    # Assign reading order
    for idx, region in enumerate(regions):
        region.reading_order = idx

    # Merge adjacent display equations that are vertically close (fractions)
    regions = merge_adjacent_display_equations(regions, image_width)

    return regions


def create_region_from_lines(lines: List[Dict[str, Any]], page_width: int) -> Region:
    """Create a Region object from a group of lines."""
    if not lines:
        raise ValueError("Cannot create region from empty lines")

    # Calculate bounding box for entire region
    all_bboxes = [get_line_bbox(line) for line in lines]
    x_min = min(bbox[0] for bbox in all_bboxes)
    y_min = min(bbox[1] for bbox in all_bboxes)
    x_max = max(bbox[2] for bbox in all_bboxes)
    y_max = max(bbox[3] for bbox in all_bboxes)

    region_bbox = [x_min, y_min, x_max, y_max]

    # Calculate average confidence
    avg_confidence = sum(line['confidence'] for line in lines) / len(lines)

    # Classify region type
    region_type = classify_region_type(lines, page_width)

    return Region(
        region_type=region_type,
        bbox=region_bbox,
        confidence=avg_confidence,
        lines=lines
    )


def detect_table_region(lines: List[Dict[str, Any]]) -> bool:
    """Detect if a group of lines forms a table.

    Heuristics:
    - Multiple lines with similar structure
    - Aligned columns (words at similar x positions)
    - Low variance in line heights
    """
    if len(lines) < 3:
        return False

    # Check for column alignment
    all_words = []
    for line in lines:
        words = line.get('words', [])
        all_words.extend(words)

    if len(all_words) < 6:
        return False

    # Group words by x position (columns)
    word_x_positions = [word['bbox'][0] for word in all_words]

    # Simple heuristic: check for repeated x positions (columns)
    # Count how many words start at similar x positions
    x_positions_sorted = sorted(word_x_positions)
    clusters = []
    current_cluster = [x_positions_sorted[0]]

    for x in x_positions_sorted[1:]:
        if x - current_cluster[-1] < 20:  # Same column
            current_cluster.append(x)
        else:
            clusters.append(current_cluster)
            current_cluster = [x]
    clusters.append(current_cluster)

    # If we have 2+ clear column clusters, likely a table
    return len(clusters) >= 2


def merge_text_lines(lines: List[Dict[str, Any]]) -> str:
    """Merge wrapped text lines into continuous text.

    Handles:
    - Wrapped lines (no punctuation at end)
    - Paragraph breaks (empty lines or large gaps)
    - Section headers (convert to markdown headers)
    """
    if not lines:
        return ""

    merged_text = ""

    for i, line in enumerate(lines):
        text = line['text'].strip()

        if not text:
            continue

        # Check if this line ends with punctuation
        ends_with_punct = re.search(r'[.!?,;:]$', text)

        # Add text
        if merged_text:
            # Check if we should start new paragraph or continue
            if ends_with_punct or i == 0:
                merged_text += " " + text
            else:
                # Wrapped line - just add space
                merged_text += " " + text
        else:
            merged_text = text

    # Check if this looks like a section header (e.g., "2.4 Resistive Power")
    # Pattern: starts with number followed by words (title case)
    if re.match(r'^\d+\.?\d*\s+[A-Z][a-zA-Z\s]+$', merged_text):
        # Convert to markdown header
        merged_text = "## " + merged_text

    return merged_text.strip()


def extract_inline_equations(text: str) -> str:
    """Detect and wrap inline math expressions in $ ... $ delimiters.

    Looks for math patterns and wraps them inline.
    """
    # Pattern for simple inline math: variable = expression
    # Example: "where p = mv" -> "where $p = mv$"

    # Find patterns like: "x = 123", "v^2/R", "a + b"
    math_patterns = [
        # Variable assignment: p = mv
        (r'\b([a-zA-Z])\s*=\s*([a-zA-Z0-9^/\+\-\*\(\)]+)\b', r'$\1 = \2$'),
        # Fractions: v^2/R
        (r'\b([a-zA-Z]\^?\{?\d*\}?)\s*/\s*([a-zA-Z])\b', r'$\1/\2$'),
        # Superscripts: cm3 -> cm^3
        (r'\b([a-zA-Z]+)(\d+)\b', r'$\1^{\2}$'),
    ]

    result = text
    for pattern, replacement in math_patterns:
        # Only replace if not already in $ ... $
        if '$' not in result:
            result = re.sub(pattern, replacement, result)

    return result


def format_region_as_markdown(region: Region) -> str:
    """Format a region as Markdown based on its type.

    Args:
        region: Region object with type and lines

    Returns:
        Markdown-formatted string
    """
    if region.region_type == "text_block":
        # Merge wrapped lines, detect inline equations
        merged_text = merge_text_lines(region.lines)
        # TODO: Detect and wrap inline math
        return merged_text

    elif region.region_type == "equation_display":
        # Display equation with $$ ... $$
        markdown = ""
        for line in region.lines:
            text = line['text'].strip()

            # Extract equation number if present
            eq_number = extract_equation_number(text)

            # Normalize to LaTeX
            latex = normalize_math_to_latex(text)

            # Format as display equation
            if eq_number:
                markdown += f"$$\n{latex} \\tag{{{eq_number}}}\n$$\n\n"
            else:
                markdown += f"$$\n{latex}\n$$\n\n"

        return markdown.strip()

    elif region.region_type == "equation_inline":
        # Inline equation with $ ... $
        markdown = ""
        for line in region.lines:
            text = line['text'].strip()
            latex = normalize_math_to_latex(text)
            markdown += f"${latex}$ "

        return markdown.strip()

    elif region.region_type == "table":
        # Format as Markdown table
        return format_table_as_markdown(region)

    return ""


def format_table_as_markdown(region: Region) -> str:
    """Format a table region as Markdown table.

    Uses simple heuristic to detect columns and format as:
    | Col1 | Col2 |
    |------|------|
    | Data | Data |
    """
    if not region.lines:
        return ""

    # Simple implementation: treat each line as a row
    # Split by whitespace to detect columns
    rows = []
    max_cols = 0

    for line in region.lines:
        words = line.get('words', [])
        if not words:
            # Fallback: split text by whitespace
            cols = line['text'].split()
        else:
            cols = [word['text'] for word in words]

        rows.append(cols)
        max_cols = max(max_cols, len(cols))

    if not rows:
        return ""

    # Build Markdown table
    markdown = ""

    # Header row (first row)
    header = rows[0]
    markdown += "| " + " | ".join(header) + " |\n"

    # Separator
    markdown += "|" + "|".join(["---" for _ in range(len(header))]) + "|\n"

    # Data rows
    for row in rows[1:]:
        # Pad row to match header length
        while len(row) < len(header):
            row.append("")
        markdown += "| " + " | ".join(row) + " |\n"

    return markdown.strip()


def merge_vertically_stacked_lines(
    detected_lines: List[Dict[str, Any]],
    max_horizontal_offset: int = 80,
    min_vertical_gap: int = 20,
    max_vertical_gap: int = 80
) -> List[Dict[str, Any]]:
    """Merge vertically stacked text lines that likely form fractions.

    This detects cases like:
        v²     (numerator)
        --     (fraction bar - may be missing from OCR)
        R      (denominator)

    Args:
        detected_lines: List of OCR detected lines
        max_horizontal_offset: Max horizontal distance between centers (px)
        min_vertical_gap: Min vertical gap to consider (px)
        max_vertical_gap: Max vertical gap to consider (px)

    Returns:
        List of merged regions with 'is_merged_formula' flag
    """
    if not detected_lines:
        return []

    merged_regions = []
    used_indices = set()

    for i, line1 in enumerate(detected_lines):
        if i in used_indices:
            continue

        # Only consider lines that are likely parts of equations
        # Skip if it's a long text line
        is_math1 = line1.get('math_class') in ['simple', 'ambiguous'] or line1.get('visual_classification') == 'display_equation'
        if not is_math1 and len(line1['text'].split()) > 5:
            continue

        bbox1 = get_line_bbox(line1)
        center_x1 = (bbox1[0] + bbox1[2]) / 2
        y_max1 = bbox1[3]

        # Look for lines below this one
        candidates = []
        for j, line2 in enumerate(detected_lines):
            if j <= i or j in used_indices:
                continue

            # Only merge if BOTH lines are short/math-like
            # Don't merge long text paragraphs
            is_math2 = line2.get('math_class') in ['simple', 'ambiguous'] or line2.get('visual_classification') == 'display_equation'
            if not is_math2 and len(line2['text'].split()) > 5:
                continue

            bbox2 = get_line_bbox(line2)
            center_x2 = (bbox2[0] + bbox2[2]) / 2
            y_min2 = bbox2[1]

            # Check if horizontally aligned
            horizontal_distance = abs(center_x1 - center_x2)
            if horizontal_distance > max_horizontal_offset:
                continue

            # Check if vertically close
            vertical_gap = y_min2 - y_max1
            if min_vertical_gap <= vertical_gap <= max_vertical_gap:
                candidates.append((j, vertical_gap, bbox2))

        # If we found stacked lines, merge them
        if candidates:
            # Sort by vertical position (top to bottom)
            candidates.sort(key=lambda x: x[2][1])

            # Merge all candidates with line1
            merged_bbox = bbox1.copy()
            merged_lines = [line1]
            merged_indices = [i]

            for idx, gap, bbox in candidates:
                # Expand merged bbox
                merged_bbox[0] = min(merged_bbox[0], bbox[0])
                merged_bbox[1] = min(merged_bbox[1], bbox[1])
                merged_bbox[2] = max(merged_bbox[2], bbox[2])
                merged_bbox[3] = max(merged_bbox[3], bbox[3])

                merged_lines.append(detected_lines[idx])
                merged_indices.append(idx)

            # Add padding (20px all around)
            padding = 20
            merged_bbox[0] = max(0, merged_bbox[0] - padding)
            merged_bbox[1] = max(0, merged_bbox[1] - padding)
            merged_bbox[2] = merged_bbox[2] + padding
            merged_bbox[3] = merged_bbox[3] + padding

            # Create merged region
            merged_text = ' '.join([line['text'] for line in merged_lines])
            avg_conf = sum([line['confidence'] for line in merged_lines]) / len(merged_lines)

            # Convert to bbox_coords format
            bbox_coords = [[merged_bbox[0], merged_bbox[1]], [merged_bbox[2], merged_bbox[1]],
                          [merged_bbox[2], merged_bbox[3]], [merged_bbox[0], merged_bbox[3]]]

            merged_regions.append({
                'text': merged_text,
                'confidence': avg_conf,
                'bbox': bbox_coords,
                'words': [],
                'is_merged_formula': True,
                'merged_from': merged_indices
            })

            # Mark all merged lines as used
            for idx in merged_indices:
                used_indices.add(idx)
        else:
            # No merge, keep original
            if i not in used_indices:
                merged_regions.append(line1)
                used_indices.add(i)

    print(f"  [Merge] Original lines: {len(detected_lines)}, After merging: {len(merged_regions)}")
    print(f"  [Merge] Found {sum(1 for r in merged_regions if r.get('is_merged_formula'))} merged formula regions")

    return merged_regions


def merge_equation_with_number(regions: List[Region]) -> List[Region]:
    """Merge adjacent equation regions where one contains only an equation number.

    Example:
      Region 1: equation_display "p=v i"
      Region 2: equation_display "(2.12)"
      -> Merge into single region with equation number

    Args:
        regions: List of regions from segmentation

    Returns:
        List of regions with equation numbers merged into equations
    """
    if len(regions) < 2:
        return regions

    merged_regions = []
    i = 0

    while i < len(regions):
        current_region = regions[i]

        # Check if this is an equation region
        if current_region.region_type in ["equation_display", "equation_inline"]:
            # Check if next region is also an equation with just a number
            if i + 1 < len(regions):
                next_region = regions[i + 1]

                # Check if next region is equation type
                if next_region.region_type in ["equation_display", "equation_inline"]:
                    # Check if next region contains only an equation number
                    next_text = ' '.join([line['text'] for line in next_region.lines]).strip()
                    eq_number = extract_equation_number(next_text)

                    # If next region is ONLY an equation number (nothing else)
                    if eq_number and len(next_text) < 15:  # "(2.12)" is ~6 chars
                        # Merge: add next region's lines to current region
                        current_region.lines.extend(next_region.lines)

                        # Expand bbox to include next region
                        current_region.bbox = [
                            min(current_region.bbox[0], next_region.bbox[0]),
                            min(current_region.bbox[1], next_region.bbox[1]),
                            max(current_region.bbox[2], next_region.bbox[2]),
                            max(current_region.bbox[3], next_region.bbox[3])
                        ]

                        merged_regions.append(current_region)
                        i += 2  # Skip next region since we merged it
                        print(f"  [Merge] Merged equation with number: {eq_number}")
                        continue

        # No merge - add current region as-is
        merged_regions.append(current_region)
        i += 1

    return merged_regions


def join_markdown_blocks_smart(blocks: List[str]) -> str:
    """Join markdown blocks with context-aware spacing.

    Rules:
    - Display equations ($$): Always on separate lines with blank lines before/after
    - Headers: Double newline after
    - Text blocks: Join with spaces unless natural paragraph break

    Args:
        blocks: List of markdown formatted blocks

    Returns:
        Joined markdown with proper spacing
    """
    if not blocks:
        return ""

    result_lines = []

    for i, block in enumerate(blocks):
        current = block.strip()

        if not current:
            continue

        # Check block types
        is_display_eq = current.startswith("$$")
        is_inline_eq = current.startswith("$") and not is_display_eq
        is_table = "|" in current and not is_inline_eq
        is_header = current.startswith("#")

        if is_display_eq:
            # Display equations: blank line before, content, blank line after
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        elif is_header:
            # Headers: blank line before (if not first), content, blank line after
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        elif is_table:
            # Tables: blank line before and after
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        else:
            # Regular text: join to previous line with space
            if result_lines and result_lines[-1] != "":
                # Append to last line with space
                result_lines[-1] = result_lines[-1] + " " + current
            else:
                # Start new line
                result_lines.append(current)

    # Join lines and clean up
    result = "\n".join(result_lines)

    # Clean up multiple blank lines
    result = re.sub(r'\n{3,}', '\n\n', result)

    return result.strip()


def post_process_standalone_equation_numbers(markdown: str) -> str:
    """Post-process markdown to handle standalone equation numbers.

    Detects patterns like:
      - "which leads to (2.14) R Or" -> possible missing equation
      - "which leads to p = i2R. (2.16)" -> format as inline equation with tag

    Args:
        markdown: Full markdown output

    Returns:
        Processed markdown with equation numbers properly formatted
    """
    # Pattern 1: Detect inline equations with equation numbers
    # Example: "which leads to p = i2R. (2.16)" -> "which leads to $p = i^2R$ \\tag{2.16}"
    # Look for: text pattern + equation number
    # Common patterns: "p = something (number)"

    # Pattern for simple equations followed by equation number
    # Matches: "p = v^2/R (2.14)" or "p = i2R. (2.16)"
    pattern = r'([a-zA-Z]\s*=\s*[a-zA-Z0-9^/\+\-\*\(\)\s]+)\.\s*\((\d+\.\d+)\)'

    def replace_inline_equation(match):
        equation = match.group(1).strip()
        eq_number = match.group(2)

        # Convert to LaTeX format
        # Replace i2R with i^2R, v2 with v^2, etc.
        equation = re.sub(r'([a-zA-Z])(\d+)', r'\1^{\2}', equation)

        return f"${equation}$ \\tag{{{eq_number}}}"

    markdown = re.sub(pattern, replace_inline_equation, markdown)

    # Pattern 2: Remove any lingering duplicate equation numbers after tags
    # Example: "$ ... \\tag{2.12} $ (2.12)" -> "$ ... \\tag{2.12} $"
    markdown = re.sub(r'(\$\$?\s*\\tag\{[\d.]+\}\s*\$\$?)\s*\([\d.]+\)', r'\1', markdown)

    # Pattern 3: Add consistent paragraph spacing before equations
    # Ensure punctuation before equations doesn't collapse onto math blocks
    markdown = re.sub(r'\.\s+\$\$', '.\n\n$$', markdown)

    # Pattern 4: Clean up table-formatted text that should be plain paragraphs
    # Remove table formatting (| separators and header rows)
    # This handles multi-line tables
    lines = markdown.split('\n')
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if this is a table line
        if '|' in line and not line.strip().startswith('$$'):
            # Check if it's a separator line (|---|---|)
            if re.match(r'^\s*\|[\s\-|]+\|\s*$', line):
                # Skip separator lines entirely
                i += 1
                continue
            else:
                # Extract words from table row and join
                words = [w.strip() for w in line.split('|') if w.strip() and w.strip() != '---']
                if words:
                    cleaned_lines.append(' '.join(words))
        else:
            cleaned_lines.append(line)
        i += 1

    markdown = '\n'.join(cleaned_lines)

    # Only minimal cleanup: remove extra blank lines inside display equations
    # "$$\n\nequation" -> "$$\nequation"
    markdown = re.sub(r'\$\$\n\n+', '$$\n', markdown)
    # "equation\n\n$$" -> "equation\n$$"
    markdown = re.sub(r'\n\n+\$\$', '\n$$', markdown)

    return markdown


def run_dla_pipeline(
    detected_lines: List[Dict[str, Any]],
    image_width: int,
    image_height: int,
    image: Optional[np.ndarray] = None,
    use_mathpix: bool = True
) -> Tuple[List[Region], str]:
    """Run complete DLA pipeline: segment -> classify -> format.

    Args:
        detected_lines: OCR lines from PaddleOCR
        image_width: Page width
        image_height: Page height
        image: Original page image (required for MathPix)
        use_mathpix: If True, use MathPix for equation regions

    Returns:
        (regions, markdown_output)
    """
    # 0. Run hybrid math detection (3-stage pipeline)
    print("  Running hybrid math detection (Fast Heuristics → Visual Geometry → MathPix Tagging)...")
    detected_lines = classify_lines_hybrid(detected_lines, image_width, image_height)

    # Show performance stats
    stats = get_performance_stats(detected_lines)
    print(f"    Stage 1: {stats['math_simple']} simple math / {stats['total_lines']} lines")
    print(f"    Stage 2: {stats['ambiguous']} ambiguous lines analyzed")
    print(f"    Stage 3: {stats['needs_mathpix']} lines tagged for MathPix ({stats['mathpix_percentage']:.1f}%)")

    # 1. Segment into regions
    regions = segment_into_regions(detected_lines, image_width, image_height)

    # 2. Merge adjacent equation regions where one is just an equation number
    regions = merge_equation_with_number(regions)

    # 3. Detect tables and reclassify
    # IMPORTANT: Don't classify math content as tables
    for region in regions:
        if region.region_type == "text_block":
            # Check if region has math content from hybrid detection
            has_math = any(
                line.get('math_class') in ['simple', 'ambiguous'] or
                line.get('visual_classification') == 'display_equation'
                for line in region.lines
            )
            # Only run table detection if there's NO math content
            if not has_math and detect_table_region(region.lines):
                region.region_type = "table"

    # 3. Format each region as Markdown
    markdown_blocks = []
    for region in sorted(regions, key=lambda r: r.reading_order):
        # Check if any line in this region is a detected fraction
        has_fraction = any(line.get('is_fraction', False) for line in region.lines)

        # Use MathPix for equation regions OR fraction regions if image is provided
        # KEY CHANGE: Send ENTIRE REGION to MathPix, not individual lines
        if use_mathpix and image is not None and (region.region_type in ["equation_display", "equation_inline"] or has_fraction):
            is_display = (region.region_type == "equation_display") or has_fraction
            try:
                # Import to get raw LaTeX result
                from mathpix_ocr import extract_latex_from_region

                # Send complete region bbox to MathPix (no line-by-line processing)
                result = extract_latex_from_region(image, region.bbox)

                # Store raw LaTeX in region for later use (avoid duplicate API calls)
                region.mathpix_latex = result['latex']
                region.mathpix_confidence = result['confidence']

                # Format as markdown
                latex = result['latex'].strip()  # Remove any leading/trailing whitespace
                confidence = result['confidence']

                # Skip if LaTeX is empty or only contains text (no math)
                if not latex or (latex.startswith('\\text') and '=' not in latex and 'frac' not in latex):
                    print(f"    [MathPix] Skipping empty/text-only result: {latex[:60]}")
                    continue

                # Extract equation number from region text if present
                eq_number = None
                for line in region.lines:
                    eq_num = extract_equation_number(line['text'])
                    if eq_num:
                        eq_number = eq_num
                        break

                # Strip any plain equation numbers from MathPix LaTeX to avoid duplicates
                # MathPix sometimes includes plain text like (2.12) in the LaTeX
                if eq_number:
                    # Remove patterns like "(2.12)" or "( 2.12 )" from the LaTeX
                    latex = re.sub(r'\s*\(\s*' + re.escape(eq_number) + r'\s*\)', '', latex).strip()

                if is_display:
                    # Format display equations with proper line breaks
                    # $$
                    # equation \tag{number}
                    # $$
                    if eq_number:
                        markdown = f"$$\n{latex} \\tag{{{eq_number}}}\n$$"
                    else:
                        markdown = f"$$\n{latex}\n$$"
                else:
                    markdown = f"${latex}$"

                # Add confidence note if low (only in logs, not in output)
                if confidence < 0.8:
                    print(f"    [MathPix] Low confidence: {confidence:.1%}")

                print(f"    [MathPix] Processed {region.region_type} at {region.bbox}: {latex[:60]}...")
            except Exception as e:
                # Fallback to standard formatting if MathPix fails
                print(f"    [Warning] MathPix failed: {e}, using fallback")
                markdown = format_region_as_markdown(region)
        else:
            markdown = format_region_as_markdown(region)

        # Clean up markdown before appending
        if markdown:
            markdown = markdown.strip()

            # Check if this is a dangling equation number (standalone region)
            if re.match(r'^\$?\$?\s*\(\d+\.\d+\)\s*\$?\$?$', markdown):
                # This is just an equation number by itself
                # Try to merge it into the previous equation block
                if len(markdown_blocks) > 0 and "$" in markdown_blocks[-1]:
                    # Extract the equation number
                    eq_num_match = re.search(r'\((\d+\.\d+)\)', markdown)
                    if eq_num_match:
                        eq_number = eq_num_match.group(1)
                        # Add tag to previous equation if it doesn't have one
                        prev_block = markdown_blocks[-1]
                        if '\\tag{' not in prev_block:
                            # Add tag before closing $$
                            if prev_block.endswith('$$'):
                                markdown_blocks[-1] = prev_block[:-2].rstrip() + f" \\tag{{{eq_number}}}\n$$"
                            elif prev_block.endswith('$'):
                                markdown_blocks[-1] = prev_block[:-1].rstrip() + f" \\tag{{{eq_number}}}$"
                        print(f"  [Cleanup] Merged dangling equation number {eq_number} into previous equation")
                        continue  # Skip adding this as a separate block

            # Remove any duplicate equation numbers within the markdown
            # Example: "$ ... (2.12) $ \tag{2.12}" -> "$ ... $ \tag{2.12}"
            markdown = re.sub(r'\s*\([\d.]+\)\s*(\$+\s*\\tag)', r' \1', markdown)

            markdown_blocks.append(markdown)

    # Join with context-aware spacing (smart newlines)
    full_markdown = join_markdown_blocks_smart(markdown_blocks)

    # Post-process to handle standalone equation numbers in text
    full_markdown = post_process_standalone_equation_numbers(full_markdown)

    return regions, full_markdown
