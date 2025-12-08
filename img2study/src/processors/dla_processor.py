#!/usr/bin/env python3
"""Document Layout Analysis (DLA) Engine - Segments page into regions and applies specialized OCR."""

import re
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

from .region import Region
from .geometry_utils import get_line_bbox, bboxes_overlap_vertically, is_centered
from .math_processor import normalize_math_to_latex, extract_equation_number
from .mathpix_ocr import process_equation_with_mathpix
from .hybrid_math_detector import classify_lines_hybrid, validate_mathpix_output, get_performance_stats


# STAGE 1: Region Classification

def classify_region_type(lines: List[Dict[str, Any]], page_width: int) -> str:
    """Classify lines as text_block, equation_display, or equation_inline using hybrid detection metadata."""
    if not lines:
        return "text_block"

    math_simple = [line for line in lines if line.get('math_class') == 'simple']
    display_equations = [line for line in lines if line.get('visual_classification') == 'display_equation']

    if len(display_equations) == len(lines):
        return "equation_display"

    if len(math_simple) == len(lines):
        if any(line.get('visual_classification') == 'display_equation' for line in lines):
            return "equation_display"

        if len(lines) <= 2:
            has_equation_number = any(extract_equation_number(line['text']) for line in lines)
            if has_equation_number:
                return "equation_display"

        return "equation_inline"

    if len(math_simple) > 0:
        return "text_block"

    return "text_block"


def merge_adjacent_display_equations(regions: List[Region], page_width: int) -> List[Region]:
    """Merge adjacent centered display equation regions (fixes multi-line fractions)."""
    if len(regions) < 2:
        return regions

    merged = []
    skip_indices = set()

    for i, region in enumerate(regions):
        if i in skip_indices:
            continue

        is_centered = abs(((region.bbox[0] + region.bbox[2]) / 2) - (page_width / 2)) < (page_width * 0.2)
        region_width = region.bbox[2] - region.bbox[0]
        is_short = region_width < (page_width * 0.65)

        if not (is_centered and is_short):
            merged.append(region)
            continue

        merge_candidates = [region]

        for j in range(i + 1, len(regions)):
            if j in skip_indices:
                continue

            next_region = regions[j]

            next_is_centered = abs(((next_region.bbox[0] + next_region.bbox[2]) / 2) - (page_width / 2)) < (page_width * 0.2)
            next_region_width = next_region.bbox[2] - next_region.bbox[0]
            next_is_short = next_region_width < (page_width * 0.65)

            if not (next_is_centered and next_is_short):
                break

            vertical_gap = next_region.bbox[1] - merge_candidates[-1].bbox[3]
            if vertical_gap > 40:
                break

            merge_candidates.append(next_region)
            skip_indices.add(j)

        if len(merge_candidates) > 1:
            all_lines = []
            for candidate in merge_candidates:
                all_lines.extend(candidate.lines)

            merged_region = create_region_from_lines(all_lines, page_width)
            merged_region.region_type = "equation_display"
            merged.append(merged_region)
        else:
            merged.append(region)

    for idx, region in enumerate(merged):
        region.reading_order = idx

    return merged


def segment_into_regions(
    detected_lines: List[Dict[str, Any]],
    image_width: int,
    image_height: int,
    vertical_gap_threshold: int = 30
) -> List[Region]:
    """Segment detected lines into logical regions based on vertical gaps and content type."""
    if not detected_lines:
        return []

    sorted_lines = sorted(detected_lines, key=lambda x: get_line_bbox(x)[1])

    regions = []
    current_group = []

    for i, line in enumerate(sorted_lines):
        if not current_group:
            current_group = [line]
            continue

        prev_bbox = get_line_bbox(current_group[-1])
        curr_bbox = get_line_bbox(line)

        vertical_gap = curr_bbox[1] - prev_bbox[3]

        should_split_before = False

        current_is_display = line.get('visual_classification') == 'display_equation'
        current_has_eq_num = extract_equation_number(line['text']) if line.get('math_class') in ['simple', 'ambiguous'] else False

        prev_is_display = current_group[-1].get('visual_classification') == 'display_equation' if current_group else False

        if current_is_display or current_has_eq_num:
            should_split_before = True

        if prev_is_display:
            should_split_before = True

        if vertical_gap > vertical_gap_threshold or should_split_before:
            region = create_region_from_lines(current_group, image_width)
            regions.append(region)
            current_group = [line]
        else:
            current_group.append(line)

    if current_group:
        region = create_region_from_lines(current_group, image_width)
        regions.append(region)

    for idx, region in enumerate(regions):
        region.reading_order = idx

    regions = merge_adjacent_display_equations(regions, image_width)

    return regions


def create_region_from_lines(lines: List[Dict[str, Any]], page_width: int) -> Region:
    """Create a Region object from a group of lines."""
    if not lines:
        raise ValueError("Cannot create region from empty lines")

    all_bboxes = [get_line_bbox(line) for line in lines]
    x_min = min(bbox[0] for bbox in all_bboxes)
    y_min = min(bbox[1] for bbox in all_bboxes)
    x_max = max(bbox[2] for bbox in all_bboxes)
    y_max = max(bbox[3] for bbox in all_bboxes)

    region_bbox = [x_min, y_min, x_max, y_max]

    avg_confidence = sum(line['confidence'] for line in lines) / len(lines)

    region_type = classify_region_type(lines, page_width)

    return Region(
        region_type=region_type,
        bbox=region_bbox,
        confidence=avg_confidence,
        lines=lines
    )


# STAGE 2: Table Detection

def detect_table_region(lines: List[Dict[str, Any]]) -> bool:
    """Detect if lines form a table based on column alignment."""
    if len(lines) < 3:
        return False

    all_words = []
    for line in lines:
        words = line.get('words', [])
        all_words.extend(words)

    if len(all_words) < 6:
        return False

    word_x_positions = [word['bbox'][0] for word in all_words]

    x_positions_sorted = sorted(word_x_positions)
    clusters = []
    current_cluster = [x_positions_sorted[0]]

    for x in x_positions_sorted[1:]:
        if x - current_cluster[-1] < 20:
            current_cluster.append(x)
        else:
            clusters.append(current_cluster)
            current_cluster = [x]
    clusters.append(current_cluster)

    return len(clusters) >= 2


# STAGE 3: Text Processing

def merge_text_lines(lines: List[Dict[str, Any]]) -> str:
    """Merge wrapped text lines into continuous text, detect section headers."""
    if not lines:
        return ""

    merged_text = ""

    for i, line in enumerate(lines):
        text = line['text'].strip()

        if not text:
            continue

        ends_with_punct = re.search(r'[.!?,;:]$', text)

        if merged_text:
            if ends_with_punct or i == 0:
                merged_text += " " + text
            else:
                merged_text += " " + text
        else:
            merged_text = text

    if re.match(r'^\d+\.?\d*\s+[A-Z][a-zA-Z\s]+$', merged_text):
        merged_text = "## " + merged_text

    return merged_text.strip()


def extract_inline_equations(text: str) -> str:
    """Detect and wrap inline math expressions in $ ... $ delimiters."""
    math_patterns = [
        (r'\b([a-zA-Z])\s*=\s*([a-zA-Z0-9^/\+\-\*\(\)]+)\b', r'$\1 = \2$'),
        (r'\b([a-zA-Z]\^?\{?\d*\}?)\s*/\s*([a-zA-Z])\b', r'$\1/\2$'),
        (r'\b([a-zA-Z]+)(\d+)\b', r'$\1^{\2}$'),
    ]

    result = text
    for pattern, replacement in math_patterns:
        if '$' not in result:
            result = re.sub(pattern, replacement, result)

    return result


# STAGE 4: Markdown Formatting

def format_region_as_markdown(region: Region) -> str:
    """Format a region as Markdown based on its type."""
    if region.region_type == "text_block":
        merged_text = merge_text_lines(region.lines)
        return merged_text

    elif region.region_type == "equation_display":
        markdown = ""
        for line in region.lines:
            text = line['text'].strip()

            eq_number = extract_equation_number(text)

            latex = normalize_math_to_latex(text)

            if eq_number:
                markdown += f"$$\n{latex} \\tag{{{eq_number}}}\n$$\n\n"
            else:
                markdown += f"$$\n{latex}\n$$\n\n"

        return markdown.strip()

    elif region.region_type == "equation_inline":
        markdown = ""
        for line in region.lines:
            text = line['text'].strip()
            latex = normalize_math_to_latex(text)
            markdown += f"${latex}$ "

        return markdown.strip()

    elif region.region_type == "table":
        return format_table_as_markdown(region)

    return ""


def format_table_as_markdown(region: Region) -> str:
    """Format a table region as Markdown table."""
    if not region.lines:
        return ""

    rows = []
    max_cols = 0

    for line in region.lines:
        words = line.get('words', [])
        if not words:
            cols = line['text'].split()
        else:
            cols = [word['text'] for word in words]

        rows.append(cols)
        max_cols = max(max_cols, len(cols))

    if not rows:
        return ""

    markdown = ""

    header = rows[0]
    markdown += "| " + " | ".join(header) + " |\n"

    markdown += "|" + "|".join(["---" for _ in range(len(header))]) + "|\n"

    for row in rows[1:]:
        while len(row) < len(header):
            row.append("")
        markdown += "| " + " | ".join(row) + " |\n"

    return markdown.strip()


# STAGE 5: Fraction Merging

def merge_vertically_stacked_lines(
    detected_lines: List[Dict[str, Any]],
    max_horizontal_offset: int = 80,
    min_vertical_gap: int = 20,
    max_vertical_gap: int = 80
) -> List[Dict[str, Any]]:
    """Merge vertically stacked text lines that form fractions (e.g., v²/R)."""
    if not detected_lines:
        return []

    merged_regions = []
    used_indices = set()

    for i, line1 in enumerate(detected_lines):
        if i in used_indices:
            continue

        is_math1 = line1.get('math_class') in ['simple', 'ambiguous'] or line1.get('visual_classification') == 'display_equation'
        if not is_math1 and len(line1['text'].split()) > 5:
            continue

        bbox1 = get_line_bbox(line1)
        center_x1 = (bbox1[0] + bbox1[2]) / 2
        y_max1 = bbox1[3]

        candidates = []
        for j, line2 in enumerate(detected_lines):
            if j <= i or j in used_indices:
                continue

            is_math2 = line2.get('math_class') in ['simple', 'ambiguous'] or line2.get('visual_classification') == 'display_equation'
            if not is_math2 and len(line2['text'].split()) > 5:
                continue

            bbox2 = get_line_bbox(line2)
            center_x2 = (bbox2[0] + bbox2[2]) / 2
            y_min2 = bbox2[1]

            horizontal_distance = abs(center_x1 - center_x2)
            if horizontal_distance > max_horizontal_offset:
                continue

            vertical_gap = y_min2 - y_max1
            if min_vertical_gap <= vertical_gap <= max_vertical_gap:
                candidates.append((j, vertical_gap, bbox2))

        if candidates:
            candidates.sort(key=lambda x: x[2][1])

            merged_bbox = bbox1.copy()
            merged_lines = [line1]
            merged_indices = [i]

            for idx, gap, bbox in candidates:
                merged_bbox[0] = min(merged_bbox[0], bbox[0])
                merged_bbox[1] = min(merged_bbox[1], bbox[1])
                merged_bbox[2] = max(merged_bbox[2], bbox[2])
                merged_bbox[3] = max(merged_bbox[3], bbox[3])

                merged_lines.append(detected_lines[idx])
                merged_indices.append(idx)

            padding = 20
            merged_bbox[0] = max(0, merged_bbox[0] - padding)
            merged_bbox[1] = max(0, merged_bbox[1] - padding)
            merged_bbox[2] = merged_bbox[2] + padding
            merged_bbox[3] = merged_bbox[3] + padding

            merged_text = ' '.join([line['text'] for line in merged_lines])
            avg_conf = sum([line['confidence'] for line in merged_lines]) / len(merged_lines)

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

            for idx in merged_indices:
                used_indices.add(idx)
        else:
            if i not in used_indices:
                merged_regions.append(line1)
                used_indices.add(i)

    print(f"  [Merge] Original lines: {len(detected_lines)}, After merging: {len(merged_regions)}")
    print(f"  [Merge] Found {sum(1 for r in merged_regions if r.get('is_merged_formula'))} merged formula regions")

    return merged_regions


def merge_equation_with_number(regions: List[Region]) -> List[Region]:
    """Merge adjacent equation regions where one contains only an equation number."""
    if len(regions) < 2:
        return regions

    merged_regions = []
    i = 0

    while i < len(regions):
        current_region = regions[i]

        if current_region.region_type in ["equation_display", "equation_inline"]:
            if i + 1 < len(regions):
                next_region = regions[i + 1]

                if next_region.region_type in ["equation_display", "equation_inline"]:
                    next_text = ' '.join([line['text'] for line in next_region.lines]).strip()
                    eq_number = extract_equation_number(next_text)

                    if eq_number and len(next_text) < 15:
                        current_region.lines.extend(next_region.lines)

                        current_region.bbox = [
                            min(current_region.bbox[0], next_region.bbox[0]),
                            min(current_region.bbox[1], next_region.bbox[1]),
                            max(current_region.bbox[2], next_region.bbox[2]),
                            max(current_region.bbox[3], next_region.bbox[3])
                        ]

                        merged_regions.append(current_region)
                        i += 2
                        print(f"  [Merge] Merged equation with number: {eq_number}")
                        continue

        merged_regions.append(current_region)
        i += 1

    return merged_regions


# STAGE 6: Markdown Post-Processing

def join_markdown_blocks_smart(blocks: List[str]) -> str:
    """Join markdown blocks with context-aware spacing."""
    if not blocks:
        return ""

    result_lines = []

    for i, block in enumerate(blocks):
        current = block.strip()

        if not current:
            continue

        is_display_eq = current.startswith("$$")
        is_inline_eq = current.startswith("$") and not is_display_eq
        is_table = "|" in current and not is_inline_eq
        is_header = current.startswith("#")

        if is_display_eq:
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        elif is_header:
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        elif is_table:
            if result_lines and result_lines[-1] != "":
                result_lines.append("")
            result_lines.append(current)
            result_lines.append("")
        else:
            if result_lines and result_lines[-1] != "":
                result_lines[-1] = result_lines[-1] + " " + current
            else:
                result_lines.append(current)

    result = "\n".join(result_lines)

    result = re.sub(r'\n{3,}', '\n\n', result)

    return result.strip()


def post_process_standalone_equation_numbers(markdown: str) -> str:
    """Post-process markdown to handle standalone equation numbers."""
    pattern = r'([a-zA-Z]\s*=\s*[a-zA-Z0-9^/\+\-\*\(\)\s]+)\.\s*\((\d+\.\d+)\)'

    def replace_inline_equation(match):
        equation = match.group(1).strip()
        eq_number = match.group(2)

        equation = re.sub(r'([a-zA-Z])(\d+)', r'\1^{\2}', equation)

        return f"${equation}$ \\tag{{{eq_number}}}"

    markdown = re.sub(pattern, replace_inline_equation, markdown)

    markdown = re.sub(r'(\$\$?\s*\\tag\{[\d.]+\}\s*\$\$?)\s*\([\d.]+\)', r'\1', markdown)

    markdown = re.sub(r'\.\s+\$\$', '.\n\n$$', markdown)

    lines = markdown.split('\n')
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if '|' in line and not line.strip().startswith('$$'):
            if re.match(r'^\s*\|[\s\-|]+\|\s*$', line):
                i += 1
                continue
            else:
                words = [w.strip() for w in line.split('|') if w.strip() and w.strip() != '---']
                if words:
                    cleaned_lines.append(' '.join(words))
        else:
            cleaned_lines.append(line)
        i += 1

    markdown = '\n'.join(cleaned_lines)

    markdown = re.sub(r'\$\$\n\n+', '$$\n', markdown)
    markdown = re.sub(r'\n\n+\$\$', '\n$$', markdown)

    return markdown


# STAGE 7: Main Pipeline

def run_dla_pipeline(
    detected_lines: List[Dict[str, Any]],
    image_width: int,
    image_height: int,
    image: Optional[np.ndarray] = None,
    use_mathpix: bool = True
) -> Tuple[List[Region], str]:
    """Run complete DLA pipeline: hybrid detection → segment → classify → format."""
    print("  Running hybrid math detection (Fast Heuristics → Visual Geometry → MathPix Tagging)...")
    detected_lines = classify_lines_hybrid(detected_lines, image_width, image_height)

    stats = get_performance_stats(detected_lines)
    print(f"    Stage 1: {stats['math_simple']} simple math / {stats['total_lines']} lines")
    print(f"    Stage 2: {stats['ambiguous']} ambiguous lines analyzed")
    print(f"    Stage 3: {stats['needs_mathpix']} lines tagged for MathPix ({stats['mathpix_percentage']:.1f}%)")

    regions = segment_into_regions(detected_lines, image_width, image_height)

    regions = merge_equation_with_number(regions)

    for region in regions:
        if region.region_type == "text_block":
            has_math = any(
                line.get('math_class') in ['simple', 'ambiguous'] or
                line.get('visual_classification') == 'display_equation'
                for line in region.lines
            )
            if not has_math and detect_table_region(region.lines):
                region.region_type = "table"

    markdown_blocks = []
    for region in sorted(regions, key=lambda r: r.reading_order):
        has_fraction = any(line.get('is_fraction', False) for line in region.lines)

        if use_mathpix and image is not None and (region.region_type in ["equation_display", "equation_inline"] or has_fraction):
            is_display = (region.region_type == "equation_display") or has_fraction
            try:
                from mathpix_ocr import extract_latex_from_region

                result = extract_latex_from_region(image, region.bbox)

                region.mathpix_latex = result['latex']
                region.mathpix_confidence = result['confidence']

                latex = result['latex'].strip()
                confidence = result['confidence']

                if not latex or (latex.startswith('\\text') and '=' not in latex and 'frac' not in latex):
                    print(f"    [MathPix] Skipping empty/text-only result: {latex[:60]}")
                    continue

                eq_number = None
                for line in region.lines:
                    eq_num = extract_equation_number(line['text'])
                    if eq_num:
                        eq_number = eq_num
                        break

                if eq_number:
                    latex = re.sub(r'\s*\(\s*' + re.escape(eq_number) + r'\s*\)', '', latex).strip()

                if is_display:
                    if eq_number:
                        markdown = f"$$\n{latex} \\tag{{{eq_number}}}\n$$"
                    else:
                        markdown = f"$$\n{latex}\n$$"
                else:
                    markdown = f"${latex}$"

                if confidence < 0.8:
                    print(f"    [MathPix] Low confidence: {confidence:.1%}")

                print(f"    [MathPix] Processed {region.region_type} at {region.bbox}: {latex[:60]}...")
            except Exception as e:
                print(f"    [Warning] MathPix failed: {e}, using fallback")
                markdown = format_region_as_markdown(region)
        else:
            markdown = format_region_as_markdown(region)

        if markdown:
            markdown = markdown.strip()

            if re.match(r'^\$?\$?\s*\(\d+\.\d+\)\s*\$?\$?$', markdown):
                if len(markdown_blocks) > 0 and "$" in markdown_blocks[-1]:
                    eq_num_match = re.search(r'\((\d+\.\d+)\)', markdown)
                    if eq_num_match:
                        eq_number = eq_num_match.group(1)
                        prev_block = markdown_blocks[-1]
                        if '\\tag{' not in prev_block:
                            if prev_block.endswith('$$'):
                                markdown_blocks[-1] = prev_block[:-2].rstrip() + f" \\tag{{{eq_number}}}\n$$"
                            elif prev_block.endswith('$'):
                                markdown_blocks[-1] = prev_block[:-1].rstrip() + f" \\tag{{{eq_number}}}$"
                        print(f"  [Cleanup] Merged dangling equation number {eq_number} into previous equation")
                        continue

            markdown = re.sub(r'\s*\([\d.]+\)\s*(\$+\s*\\tag)', r' \1', markdown)

            markdown_blocks.append(markdown)

    full_markdown = join_markdown_blocks_smart(markdown_blocks)

    full_markdown = post_process_standalone_equation_numbers(full_markdown)

    return regions, full_markdown
