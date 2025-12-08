"""Math detection and LaTeX normalization for equations."""

import re
import cv2
import numpy as np
from typing import Optional, Dict, Any, List, Tuple


def is_math_expression(text: str) -> bool:
    """Detect if a line contains mathematical content."""
    if not text or len(text.strip()) == 0:
        return False

    text = text.strip()

    # EXCLUDE URLs from math detection (they contain slashes)
    if re.search(r'https?://|www\.|\.com|\.org|\.edu|\.net', text, re.IGNORECASE):
        return False

    # Check for equation numbers like (2.16)
    if re.match(r'^\(\d+\.\d+\)$', text):
        return True

    # Math operator patterns (removed plain slash to avoid URL conflicts)
    math_patterns = [
        r'[=<>≤≥≠±∓]',  # Equals, comparison, plus-minus
        r'[×·÷]',  # Multiplication, division (removed plain /)
        r'\^',  # Exponent
        r'[∫∑∏√∂∇]',  # Calculus symbols
        r'\\[a-zA-Z]+',  # LaTeX commands
        r'[a-zA-Z]\d',  # Variables with subscripts (i2, v2)
        r'\([^)]*[=+\-*×÷]\)',  # Math operations in parentheses (removed / inside)
        r'\b\d+\s*/\s*\d+\b',  # Fractions like 1/2, 3/4 (but not URLs)
        r'\b[a-zA-Z]\s*/\s*[a-zA-Z]\b',  # Variable division like v/R (but not paths)
    ]

    for pattern in math_patterns:
        if re.search(pattern, text):
            return True

    # Check for simple variable assignments
    if re.match(r'^[a-zA-Z]\s*=\s*.+', text):
        return True

    return False


def is_standalone_equation(text: str) -> bool:
    """Determine if equation should be displayed standalone vs inline.

    Returns True for:
    - Equation numbers only like (2.16)
    - Short equations without surrounding text
    - Equations with lots of symbols
    """
    text = text.strip()

    # Equation numbers are always standalone
    if re.match(r'^\(\d+\.\d+\)$', text):
        return True

    # Very short text with just math (likely a standalone equation)
    if len(text) < 20 and re.search(r'[=]', text):
        return True

    # If text starts/ends with normal words, it's inline
    # Check if starts with capital letter or lowercase word
    if re.match(r'^[A-Z][a-z]+\s+', text) or re.match(r'^[a-z]+\s+', text):
        return False

    # If text ends with period/comma/word, it's inline
    if re.search(r'[a-zA-Z\.,]\s*$', text):
        return False

    # Default to standalone for pure math expressions
    return True


def extract_equation_number(text: str) -> Optional[str]:
    """Extract equation number from text like (2.16) or Eq. 2.16."""
    # Match (2.16) format
    match = re.search(r'\((\d+\.\d+)\)', text)
    if match:
        return match.group(1)

    # Match "Eq. 2.16" or "Equation 2.16"
    match = re.search(r'(?:Eq\.?|Equation)\s*(\d+\.\d+)', text, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def normalize_math_to_latex(text: str) -> str:
    """Convert OCR'd math text to LaTeX format."""
    if not text:
        return ""

    latex = text.strip()

    # SKIP normalization for URLs (they shouldn't be treated as math)
    if re.search(r'https?://|www\.|\.com|\.org|\.edu|\.net', latex, re.IGNORECASE):
        return latex

    # Remove equation number in parentheses at the end (we'll add it as \tag)
    latex = re.sub(r'\s*\(\d+\.\d+\)\s*$', '', latex)

    # 1. Convert superscripts: i2 → i^{2}, v2 → v^{2}
    # Match single letter followed by digit(s), but not in URLs
    latex = re.sub(r'\b([a-zA-Z])(\d+)\b', r'\1^{\2}', latex)

    # 2. Convert fractions: a/b → \dfrac{a}{b} (display style for better readability)
    # IMPORTANT: Only for math expressions, not file paths or URLs
    # Handle expressions in parentheses first: (v^2)/R
    latex = re.sub(r'\(([^)]+)\)\s*/\s*([a-zA-Z]+)\b', r'\\dfrac{\1}{\2}', latex)
    # Simple case: variable/variable (single letter or with superscript)
    latex = re.sub(r'\b([a-zA-Z](?:\^\{\d+\})?)\s*/\s*([a-zA-Z](?:\^\{\d+\})?)\b', r'\\dfrac{\1}{\2}', latex)
    # Number fractions: 1/2, 3/4
    latex = re.sub(r'\b(\d+)\s*/\s*(\d+)\b', r'\\dfrac{\1}{\2}', latex)

    # 3. Replace multiplication symbols
    latex = latex.replace('×', r'\times')
    latex = latex.replace('·', r'\cdot')
    latex = latex.replace('*', r'\times')

    # 4. Replace division symbol
    latex = latex.replace('÷', r'\div')

    # 5. Replace Greek letters (common ones)
    greek_map = {
        'alpha': r'\\alpha',
        'beta': r'\\beta',
        'gamma': r'\\gamma',
        'delta': r'\\delta',
        'epsilon': r'\\epsilon',
        'theta': r'\\theta',
        'lambda': r'\\lambda',
        'mu': r'\\mu',
        'pi': r'\\pi',
        'sigma': r'\\sigma',
        'omega': r'\\omega',
    }
    for greek, latex_cmd in greek_map.items():
        pattern = r'\b' + greek + r'\b'
        latex = re.sub(pattern, latex_cmd, latex, flags=re.IGNORECASE)

    # 6. Replace comparison operators
    latex = latex.replace('<=', r'\leq')
    latex = latex.replace('>=', r'\geq')
    latex = latex.replace('!=', r'\neq')
    latex = latex.replace('≤', r'\leq')
    latex = latex.replace('≥', r'\geq')
    latex = latex.replace('≠', r'\neq')

    # 7. Replace plus-minus
    latex = latex.replace('±', r'\pm')
    latex = latex.replace('∓', r'\mp')

    # 8. Replace integral, sum, product symbols
    latex = latex.replace('∫', r'\int')
    latex = latex.replace('∑', r'\sum')
    latex = latex.replace('∏', r'\prod')
    latex = latex.replace('√', r'\sqrt')

    # 9. Replace partial derivative and nabla
    latex = latex.replace('∂', r'\partial')
    latex = latex.replace('∇', r'\nabla')

    # 10. Add spacing around equals sign
    latex = re.sub(r'\s*=\s*', ' = ', latex)

    # 11. Clean up extra spaces
    latex = re.sub(r'\s+', ' ', latex).strip()

    return latex


def create_equation_object(
    text: str,
    confidence: float,
    bbox: list,
    crop_path: Optional[str] = None
) -> Dict[str, Any]:
    """Create a structured equation object."""
    eq_number = extract_equation_number(text)
    normalized_latex = normalize_math_to_latex(text)

    # Clean raw text (remove equation number)
    raw_text = re.sub(r'\s*\(\d+\.\d+\)\s*', '', text).strip()

    # Calculate quality metrics
    length_diff = abs(len(normalized_latex) - len(raw_text))
    length_ratio = length_diff / max(len(raw_text), 1)
    low_confidence = confidence < 0.6 or length_ratio > 0.3

    equation = {
        "type": "equation",
        "raw_text": raw_text,
        "normalized": {
            "latex": normalized_latex,
            "format": "latex"
        },
        "confidence": float(confidence),
        "bbox": bbox,
        "low_confidence": low_confidence
    }

    if eq_number:
        equation["eq_number"] = eq_number

    if crop_path:
        equation["crop_path"] = crop_path

    return equation


def format_equation_for_markdown(
    equation: Dict[str, Any],
    include_crop: bool = True,
    inline: bool = False
) -> str:
    """Format an equation object as Markdown with LaTeX.

    Args:
        equation: Equation object dict
        include_crop: Whether to include crop image
        inline: If True, use inline math $...$, else display math $$...$$
    """
    latex = equation["normalized"]["latex"]
    eq_number = equation.get("eq_number")
    crop_path = equation.get("crop_path")
    confidence = equation["confidence"]
    raw_text = equation["raw_text"]

    markdown = ""

    # Add LaTeX math
    if inline:
        # Inline math for mid-sentence equations
        if eq_number:
            markdown += f"${latex}$ ({eq_number})"
        else:
            markdown += f"${latex}$"
    else:
        # Display math for standalone equations
        if eq_number:
            markdown += f"$$\n{latex} \\tag{{{eq_number}}}\n$$\n"
        else:
            markdown += f"$$\n{latex}\n$$\n"

        # Add crop image if available (only for display mode)
        if include_crop and crop_path:
            markdown += f"\n![Equation crop]({crop_path})\n"

    # Add raw OCR text if low confidence
    if equation.get("low_confidence") or confidence < 0.8:
        markdown += f"\n\n*Raw OCR (conf: {confidence:.1%}): {raw_text}*\n"

    return markdown


# ============================================================================
# Tag-Anchored Re-OCR for Fraction Detection
# ============================================================================

def detect_suspect_equation_tags(
    detected_lines: List[Dict[str, Any]],
    image_height: int
) -> List[Dict[str, Any]]:
    """Detect equation tags (e.g., (2.14)) that are 'suspect' - tags with missing math.

    A tag is suspect if:
    1. It matches pattern (X.Y) where X and Y are digits
    2. CASE A: Line has no other meaningful math content AND no adjacent math
    3. CASE B: Line contains MULTIPLE consecutive tags (indicates missing fraction between them)

    Args:
        detected_lines: List of line dictionaries with text, bbox, confidence
        image_height: Height of original image for ROI calculations

    Returns:
        List of suspect tag dictionaries with: text, bbox, line_index
    """
    suspect_tags = []

    for idx, line in enumerate(detected_lines):
        text = line.get('text', '').strip()

        # Find ALL equation tags in the line
        all_tags = list(re.finditer(r'\((\d+\.\d+)\)', text))
        if not all_tags:
            continue

        # CASE B: Multiple tags on same line = missing equation between them
        # Example: "p =vi = (2.13) (2.14)" means fraction is missing between tags
        if len(all_tags) > 1:
            # Add the SECOND tag as suspect (the fraction is likely above it)
            for tag_idx in range(1, len(all_tags)):
                tag_match = all_tags[tag_idx]
                suspect_tags.append({
                    'tag_text': tag_match.group(0),
                    'tag_number': tag_match.group(1),
                    'bbox': line.get('bbox', []),
                    'line_index': idx,
                    'full_line_text': text,
                    'reason': 'multiple_tags'
                })
            continue  # Skip CASE A check for this line

        # CASE A: Single tag with no math nearby
        tag_match = all_tags[0]
        tag_text = tag_match.group(0)

        # Remove the tag and check if remaining text has math
        text_without_tag = re.sub(r'\(\d+\.\d+\)', '', text).strip()

        # If the line has substantial math content besides the tag, it's not suspect
        if text_without_tag and is_math_expression(text_without_tag):
            continue

        # Check adjacent lines for math content
        has_adjacent_math = False

        # Check line above (if exists)
        if idx > 0:
            prev_text = detected_lines[idx - 1].get('text', '').strip()
            if prev_text and is_math_expression(prev_text):
                has_adjacent_math = True

        # Check line below (if exists)
        if idx < len(detected_lines) - 1:
            next_text = detected_lines[idx + 1].get('text', '').strip()
            if next_text and is_math_expression(next_text):
                has_adjacent_math = True

        # If no adjacent math, this is a suspect tag
        if not has_adjacent_math:
            suspect_tags.append({
                'tag_text': tag_text,
                'tag_number': tag_match.group(1),
                'bbox': line.get('bbox', []),
                'line_index': idx,
                'full_line_text': text,
                'reason': 'orphan_tag'
            })

    return suspect_tags


def extract_equation_roi(
    tag_bbox: List[int],
    image_shape: Tuple[int, int, int],
    height_multiplier: float = 1.5,
    width_padding: int = 20
) -> Tuple[int, int, int, int]:
    """Build ROI region above an equation tag for re-OCR.

    Args:
        tag_bbox: [x_min, y_min, x_max, y_max] of the tag
        image_shape: (height, width, channels) of original image
        height_multiplier: How much to extend upward (e.g., 1.5× tag height)
        width_padding: Pixels to widen on left/right

    Returns:
        (roi_x_min, roi_y_min, roi_x_max, roi_y_max) clipped to image bounds
    """
    if not tag_bbox or len(tag_bbox) < 4:
        return (0, 0, 0, 0)

    img_height, img_width = image_shape[:2]

    x_min, y_min, x_max, y_max = tag_bbox
    tag_width = x_max - x_min
    tag_height = y_max - y_min

    # Build ROI: same x-range as tag, extend upward, widen horizontally
    roi_x_min = max(0, x_min - width_padding)
    roi_x_max = min(img_width, x_max + width_padding)

    # Extend upward by height_multiplier * tag_height
    extend_height = int(tag_height * height_multiplier)
    roi_y_min = max(0, y_min - extend_height)
    roi_y_max = y_max  # Include the tag itself

    return (roi_x_min, roi_y_min, roi_x_max, roi_y_max)


def enhance_roi_for_math(
    roi_image: np.ndarray,
    upscale_factor: float = 2.5,
    sharpen_strength: float = 0.3
) -> np.ndarray:
    """Enhance ROI for better math OCR: upscale, sharpen, CLAHE.

    Args:
        roi_image: Cropped ROI from original image
        upscale_factor: How much to upscale (2.0-3.0 recommended)
        sharpen_strength: Sharpening intensity (0.2-0.5)

    Returns:
        Enhanced ROI image ready for OCR
    """
    if roi_image is None or roi_image.size == 0:
        return roi_image

    # 1. Upscale using cubic interpolation
    new_width = int(roi_image.shape[1] * upscale_factor)
    new_height = int(roi_image.shape[0] * upscale_factor)
    upscaled = cv2.resize(roi_image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

    # 2. Apply light sharpening
    # Create sharpening kernel
    kernel = np.array([
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ], dtype=np.float32)

    # Blend sharpened with original
    sharpened = cv2.filter2D(upscaled, -1, kernel)
    enhanced = cv2.addWeighted(upscaled, 1 - sharpen_strength, sharpened, sharpen_strength, 0)

    # 3. Apply CLAHE for contrast enhancement
    # Convert to LAB color space for better contrast handling
    if len(enhanced.shape) == 3:
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)

        # Merge back
        enhanced = cv2.merge([l_channel, a_channel, b_channel])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    else:
        # Grayscale image
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(enhanced)

    return enhanced


def detect_fraction_bar(
    roi_image: np.ndarray,
    min_line_length: int = 20,
    line_thickness_ratio: float = 0.15
) -> Optional[Tuple[int, int, int, int]]:
    """Detect horizontal fraction bar in ROI using Canny + HoughLinesP.

    Args:
        roi_image: Enhanced ROI image
        min_line_length: Minimum line length in pixels
        line_thickness_ratio: Max thickness as ratio of ROI height

    Returns:
        (x1, y1, x2, y2) of detected fraction bar, or None if not found
    """
    if roi_image is None or roi_image.size == 0:
        return None

    # Convert to grayscale if needed
    if len(roi_image.shape) == 3:
        gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = roi_image

    # Apply Canny edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Detect lines using HoughLinesP
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi/180,
        threshold=50,
        minLineLength=min_line_length,
        maxLineGap=10
    )

    if lines is None or len(lines) == 0:
        return None

    # Filter for horizontal lines (small angle variation)
    # and reasonable thickness
    roi_height = roi_image.shape[0]
    max_thickness = int(roi_height * line_thickness_ratio)

    horizontal_lines = []
    for line in lines:
        x1, y1, x2, y2 = line[0]

        # Check if line is mostly horizontal (y1 ≈ y2)
        thickness = abs(y2 - y1)
        length = abs(x2 - x1)

        if thickness <= max_thickness and length >= min_line_length:
            # Calculate average y position
            y_avg = (y1 + y2) / 2
            horizontal_lines.append((x1, y_avg, x2, y_avg, length))

    if not horizontal_lines:
        return None

    # Return the longest horizontal line (most likely fraction bar)
    longest_line = max(horizontal_lines, key=lambda line: line[4])
    x1, y_avg, x2, _, _ = longest_line

    return (int(x1), int(y_avg), int(x2), int(y_avg))


def split_roi_by_fraction_bar(
    roi_image: np.ndarray,
    fraction_bar: Tuple[int, int, int, int],
    vertical_margin: int = 5
) -> Tuple[np.ndarray, np.ndarray]:
    """Split ROI into numerator (above bar) and denominator (below bar) regions.

    Args:
        roi_image: Enhanced ROI image
        fraction_bar: (x1, y1, x2, y2) of the detected bar
        vertical_margin: Pixels to exclude around bar

    Returns:
        (numerator_region, denominator_region) as separate images
    """
    if roi_image is None or fraction_bar is None:
        return (None, None)

    _, y_bar, _, _ = fraction_bar
    roi_height = roi_image.shape[0]

    # Numerator: everything above bar (minus margin)
    numerator_y_max = max(0, int(y_bar) - vertical_margin)
    numerator = roi_image[0:numerator_y_max, :]

    # Denominator: everything below bar (plus margin)
    denominator_y_min = min(roi_height, int(y_bar) + vertical_margin)
    denominator = roi_image[denominator_y_min:, :]

    return (numerator, denominator)


def merge_orphan_tokens(
    detected_lines: List[Dict[str, Any]],
    suspect_tag_index: int
) -> Optional[str]:
    """Merge orphaned single-letter tokens above a suspect equation tag.

    An orphan is a line with:
    1. Only 1-2 tokens (very short)
    2. Positioned directly above the tag
    3. Below an equation stub (e.g., "p = vi =")

    Args:
        detected_lines: All detected lines
        suspect_tag_index: Index of the suspect tag line

    Returns:
        Merged text if orphan found, None otherwise
    """
    if suspect_tag_index <= 0:
        return None

    # Check line immediately above tag
    prev_line = detected_lines[suspect_tag_index - 1]
    prev_text = prev_line.get('text', '').strip()

    # Is it an orphan? (1-2 tokens, mostly single letters or simple variables)
    tokens = prev_text.split()
    if len(tokens) > 2:
        return None

    # Check if it looks like a variable or simple expression (R, v2, iR, etc.)
    orphan_pattern = r'^[a-zA-Z]\d*[a-zA-Z]?$'
    is_orphan = all(re.match(orphan_pattern, token) for token in tokens)

    if not is_orphan:
        return None

    # Check if there's an equation stub above the orphan
    if suspect_tag_index >= 2:
        stub_line = detected_lines[suspect_tag_index - 2]
        stub_text = stub_line.get('text', '').strip()

        # Look for equation stubs ending with operator (=, +, -, *, /)
        if re.search(r'[=+\-*/]\s*$', stub_text):
            # This is likely: "p = vi =" above "R" above "(2.14)"
            # Return the orphan text
            return prev_text

    return None


def reocr_equation_region(
    image: np.ndarray,
    tag_bbox: List[int],
    ocr_engine,
    height_multiplier: float = 1.5,
    upscale_factor: float = 2.5
) -> Dict[str, Any]:
    """Re-OCR equation region above a suspect tag with enhanced processing.

    Args:
        image: Original full image
        tag_bbox: Bounding box of the suspect equation tag
        ocr_engine: PaddleOCR instance
        height_multiplier: ROI height extension factor
        upscale_factor: Image upscaling factor

    Returns:
        Dictionary with:
        - roi_text: Raw OCR text from ROI
        - numerator: Text above fraction bar (if detected)
        - denominator: Text below fraction bar (if detected)
        - fraction_bar_detected: Boolean
        - latex: Assembled LaTeX expression
    """
    result = {
        'roi_text': '',
        'numerator': '',
        'denominator': '',
        'fraction_bar_detected': False,
        'latex': ''
    }

    # 1. Extract ROI
    roi_coords = extract_equation_roi(tag_bbox, image.shape, height_multiplier, width_padding=20)
    x_min, y_min, x_max, y_max = roi_coords

    if x_min >= x_max or y_min >= y_max:
        return result

    roi_image = image[y_min:y_max, x_min:x_max]

    if roi_image.size == 0:
        return result

    # 2. Enhance ROI
    enhanced_roi = enhance_roi_for_math(roi_image, upscale_factor=upscale_factor)

    # 3. Detect fraction bar
    fraction_bar = detect_fraction_bar(enhanced_roi)

    if fraction_bar is not None:
        result['fraction_bar_detected'] = True

        # 4. Split into numerator and denominator
        numerator_img, denominator_img = split_roi_by_fraction_bar(enhanced_roi, fraction_bar)

        # 5. OCR each region separately
        if numerator_img is not None and numerator_img.size > 0:
            num_ocr = ocr_engine.ocr(numerator_img)
            if num_ocr and num_ocr[0]:
                # Extract text from all detected lines
                num_text_parts = [line[1][0] for line in num_ocr[0] if line[1][0].strip()]
                result['numerator'] = ' '.join(num_text_parts).strip()

        if denominator_img is not None and denominator_img.size > 0:
            den_ocr = ocr_engine.ocr(denominator_img)
            if den_ocr and den_ocr[0]:
                # Extract text from all detected lines
                den_text_parts = [line[1][0] for line in den_ocr[0] if line[1][0].strip()]
                result['denominator'] = ' '.join(den_text_parts).strip()

        # 6. Assemble LaTeX
        if result['numerator'] and result['denominator']:
            # Normalize numerator and denominator
            num_latex = normalize_math_to_latex(result['numerator'])
            den_latex = normalize_math_to_latex(result['denominator'])
            result['latex'] = f"\\dfrac{{{num_latex}}}{{{den_latex}}}"
    else:
        # No fraction bar detected, just OCR the entire ROI
        roi_ocr = ocr_engine.ocr(enhanced_roi)
        if roi_ocr and roi_ocr[0]:
            text_parts = [line[1][0] for line in roi_ocr[0] if line[1][0].strip()]
            result['roi_text'] = ' '.join(text_parts).strip()
            result['latex'] = normalize_math_to_latex(result['roi_text'])

    return result
