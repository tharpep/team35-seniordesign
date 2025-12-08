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

    if re.search(r'https?://|www\.|\.com|\.org|\.edu|\.net', text, re.IGNORECASE):
        return False

    if re.match(r'^\(\d+\.\d+\)$', text):
        return True

    math_patterns = [
        r'[=<>≤≥≠±∓]',
        r'[×·÷]',
        r'\^',
        r'[∫∑∏√∂∇]',
        r'\\[a-zA-Z]+',
        r'[a-zA-Z]\d',
        r'\([^)]*[=+\-*×÷]\)',
        r'\b\d+\s*/\s*\d+\b',
        r'\b[a-zA-Z]\s*/\s*[a-zA-Z]\b',
    ]

    for pattern in math_patterns:
        if re.search(pattern, text):
            return True

    if re.match(r'^[a-zA-Z]\s*=\s*.+', text):
        return True

    return False


def is_standalone_equation(text: str) -> bool:
    """Determine if equation should be displayed standalone vs inline."""
    text = text.strip()

    if re.match(r'^\(\d+\.\d+\)$', text):
        return True

    if len(text) < 20 and re.search(r'[=]', text):
        return True

    if re.match(r'^[A-Z][a-z]+\s+', text) or re.match(r'^[a-z]+\s+', text):
        return False

    if re.search(r'[a-zA-Z\.,]\s*$', text):
        return False

    return True


def extract_equation_number(text: str) -> Optional[str]:
    """Extract equation number from text like (2.16) or Eq. 2.16."""
    match = re.search(r'\((\d+\.\d+)\)', text)
    if match:
        return match.group(1)

    match = re.search(r'(?:Eq\.?|Equation)\s*(\d+\.\d+)', text, re.IGNORECASE)
    if match:
        return match.group(1)

    return None


def normalize_math_to_latex(text: str) -> str:
    """Convert OCR'd math text to LaTeX format."""
    if not text:
        return ""

    latex = text.strip()

    if re.search(r'https?://|www\.|\.com|\.org|\.edu|\.net', latex, re.IGNORECASE):
        return latex

    latex = re.sub(r'\s*\(\d+\.\d+\)\s*$', '', latex)

    latex = re.sub(r'\b([a-zA-Z])(\d+)\b', r'\1^{\2}', latex)

    latex = re.sub(r'\(([^)]+)\)\s*/\s*([a-zA-Z]+)\b', r'\\dfrac{\1}{\2}', latex)
    latex = re.sub(r'\b([a-zA-Z](?:\^\{\d+\})?)\s*/\s*([a-zA-Z](?:\^\{\d+\})?)\b', r'\\dfrac{\1}{\2}', latex)
    latex = re.sub(r'\b(\d+)\s*/\s*(\d+)\b', r'\\dfrac{\1}{\2}', latex)

    latex = latex.replace('×', r'\times')
    latex = latex.replace('·', r'\cdot')
    latex = latex.replace('*', r'\times')

    latex = latex.replace('÷', r'\div')

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

    latex = latex.replace('<=', r'\leq')
    latex = latex.replace('>=', r'\geq')
    latex = latex.replace('!=', r'\neq')
    latex = latex.replace('≤', r'\leq')
    latex = latex.replace('≥', r'\geq')
    latex = latex.replace('≠', r'\neq')

    latex = latex.replace('±', r'\pm')
    latex = latex.replace('∓', r'\mp')

    latex = latex.replace('∫', r'\int')
    latex = latex.replace('∑', r'\sum')
    latex = latex.replace('∏', r'\prod')
    latex = latex.replace('√', r'\sqrt')

    latex = latex.replace('∂', r'\partial')
    latex = latex.replace('∇', r'\nabla')

    latex = re.sub(r'\s*=\s*', ' = ', latex)

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

    raw_text = re.sub(r'\s*\(\d+\.\d+\)\s*', '', text).strip()

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
    """Format an equation object as Markdown with LaTeX."""
    latex = equation["normalized"]["latex"]
    eq_number = equation.get("eq_number")
    crop_path = equation.get("crop_path")
    confidence = equation["confidence"]
    raw_text = equation["raw_text"]

    markdown = ""

    if inline:
        if eq_number:
            markdown += f"${latex}$ ({eq_number})"
        else:
            markdown += f"${latex}$"
    else:
        if eq_number:
            markdown += f"$$\n{latex} \\tag{{{eq_number}}}\n$$\n"
        else:
            markdown += f"$$\n{latex}\n$$\n"

        if include_crop and crop_path:
            markdown += f"\n![Equation crop]({crop_path})\n"

    if equation.get("low_confidence") or confidence < 0.8:
        markdown += f"\n\n*Raw OCR (conf: {confidence:.1%}): {raw_text}*\n"

    return markdown


# Tag-Anchored Re-OCR for Fraction Detection

def detect_suspect_equation_tags(
    detected_lines: List[Dict[str, Any]],
    image_height: int
) -> List[Dict[str, Any]]:
    """Detect equation tags (e.g., (2.14)) that are suspect - tags with missing math content."""
    suspect_tags = []

    for idx, line in enumerate(detected_lines):
        text = line.get('text', '').strip()

        all_tags = list(re.finditer(r'\((\d+\.\d+)\)', text))
        if not all_tags:
            continue

        if len(all_tags) > 1:
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
            continue

        tag_match = all_tags[0]
        tag_text = tag_match.group(0)

        text_without_tag = re.sub(r'\(\d+\.\d+\)', '', text).strip()

        if text_without_tag and is_math_expression(text_without_tag):
            continue

        has_adjacent_math = False

        if idx > 0:
            prev_text = detected_lines[idx - 1].get('text', '').strip()
            if prev_text and is_math_expression(prev_text):
                has_adjacent_math = True

        if idx < len(detected_lines) - 1:
            next_text = detected_lines[idx + 1].get('text', '').strip()
            if next_text and is_math_expression(next_text):
                has_adjacent_math = True

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
    """Build ROI region above an equation tag for re-OCR."""
    if not tag_bbox or len(tag_bbox) < 4:
        return (0, 0, 0, 0)

    img_height, img_width = image_shape[:2]

    x_min, y_min, x_max, y_max = tag_bbox
    tag_width = x_max - x_min
    tag_height = y_max - y_min

    roi_x_min = max(0, x_min - width_padding)
    roi_x_max = min(img_width, x_max + width_padding)

    extend_height = int(tag_height * height_multiplier)
    roi_y_min = max(0, y_min - extend_height)
    roi_y_max = y_max

    return (roi_x_min, roi_y_min, roi_x_max, roi_y_max)


def enhance_roi_for_math(
    roi_image: np.ndarray,
    upscale_factor: float = 2.5,
    sharpen_strength: float = 0.3
) -> np.ndarray:
    """Enhance ROI for better math OCR: upscale, sharpen, CLAHE."""
    if roi_image is None or roi_image.size == 0:
        return roi_image

    new_width = int(roi_image.shape[1] * upscale_factor)
    new_height = int(roi_image.shape[0] * upscale_factor)
    upscaled = cv2.resize(roi_image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

    kernel = np.array([
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ], dtype=np.float32)

    sharpened = cv2.filter2D(upscaled, -1, kernel)
    enhanced = cv2.addWeighted(upscaled, 1 - sharpen_strength, sharpened, sharpen_strength, 0)

    if len(enhanced.shape) == 3:
        lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)

        enhanced = cv2.merge([l_channel, a_channel, b_channel])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    else:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(enhanced)

    return enhanced


def detect_fraction_bar(
    roi_image: np.ndarray,
    min_line_length: int = 20,
    line_thickness_ratio: float = 0.15
) -> Optional[Tuple[int, int, int, int]]:
    """Detect horizontal fraction bar in ROI using Canny + HoughLinesP."""
    if roi_image is None or roi_image.size == 0:
        return None

    if len(roi_image.shape) == 3:
        gray = cv2.cvtColor(roi_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = roi_image

    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

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

    roi_height = roi_image.shape[0]
    max_thickness = int(roi_height * line_thickness_ratio)

    horizontal_lines = []
    for line in lines:
        x1, y1, x2, y2 = line[0]

        thickness = abs(y2 - y1)
        length = abs(x2 - x1)

        if thickness <= max_thickness and length >= min_line_length:
            y_avg = (y1 + y2) / 2
            horizontal_lines.append((x1, y_avg, x2, y_avg, length))

    if not horizontal_lines:
        return None

    longest_line = max(horizontal_lines, key=lambda line: line[4])
    x1, y_avg, x2, _, _ = longest_line

    return (int(x1), int(y_avg), int(x2), int(y_avg))


def split_roi_by_fraction_bar(
    roi_image: np.ndarray,
    fraction_bar: Tuple[int, int, int, int],
    vertical_margin: int = 5
) -> Tuple[np.ndarray, np.ndarray]:
    """Split ROI into numerator (above bar) and denominator (below bar) regions."""
    if roi_image is None or fraction_bar is None:
        return (None, None)

    _, y_bar, _, _ = fraction_bar
    roi_height = roi_image.shape[0]

    numerator_y_max = max(0, int(y_bar) - vertical_margin)
    numerator = roi_image[0:numerator_y_max, :]

    denominator_y_min = min(roi_height, int(y_bar) + vertical_margin)
    denominator = roi_image[denominator_y_min:, :]

    return (numerator, denominator)


def merge_orphan_tokens(
    detected_lines: List[Dict[str, Any]],
    suspect_tag_index: int
) -> Optional[str]:
    """Merge orphaned single-letter tokens above a suspect equation tag."""
    if suspect_tag_index <= 0:
        return None

    prev_line = detected_lines[suspect_tag_index - 1]
    prev_text = prev_line.get('text', '').strip()

    tokens = prev_text.split()
    if len(tokens) > 2:
        return None

    orphan_pattern = r'^[a-zA-Z]\d*[a-zA-Z]?$'
    is_orphan = all(re.match(orphan_pattern, token) for token in tokens)

    if not is_orphan:
        return None

    if suspect_tag_index >= 2:
        stub_line = detected_lines[suspect_tag_index - 2]
        stub_text = stub_line.get('text', '').strip()

        if re.search(r'[=+\-*/]\s*$', stub_text):
            return prev_text

    return None


def reocr_equation_region(
    image: np.ndarray,
    tag_bbox: List[int],
    ocr_engine,
    height_multiplier: float = 1.5,
    upscale_factor: float = 2.5
) -> Dict[str, Any]:
    """Re-OCR equation region above a suspect tag with enhanced processing."""
    result = {
        'roi_text': '',
        'numerator': '',
        'denominator': '',
        'fraction_bar_detected': False,
        'latex': ''
    }

    roi_coords = extract_equation_roi(tag_bbox, image.shape, height_multiplier, width_padding=20)
    x_min, y_min, x_max, y_max = roi_coords

    if x_min >= x_max or y_min >= y_max:
        return result

    roi_image = image[y_min:y_max, x_min:x_max]

    if roi_image.size == 0:
        return result

    enhanced_roi = enhance_roi_for_math(roi_image, upscale_factor=upscale_factor)

    fraction_bar = detect_fraction_bar(enhanced_roi)

    if fraction_bar is not None:
        result['fraction_bar_detected'] = True

        numerator_img, denominator_img = split_roi_by_fraction_bar(enhanced_roi, fraction_bar)

        if numerator_img is not None and numerator_img.size > 0:
            num_ocr = ocr_engine.ocr(numerator_img)
            if num_ocr and num_ocr[0]:
                num_text_parts = [line[1][0] for line in num_ocr[0] if line[1][0].strip()]
                result['numerator'] = ' '.join(num_text_parts).strip()

        if denominator_img is not None and denominator_img.size > 0:
            den_ocr = ocr_engine.ocr(denominator_img)
            if den_ocr and den_ocr[0]:
                den_text_parts = [line[1][0] for line in den_ocr[0] if line[1][0].strip()]
                result['denominator'] = ' '.join(den_text_parts).strip()

        if result['numerator'] and result['denominator']:
            num_latex = normalize_math_to_latex(result['numerator'])
            den_latex = normalize_math_to_latex(result['denominator'])
            result['latex'] = f"\\dfrac{{{num_latex}}}{{{den_latex}}}"
    else:
        roi_ocr = ocr_engine.ocr(enhanced_roi)
        if roi_ocr and roi_ocr[0]:
            text_parts = [line[1][0] for line in roi_ocr[0] if line[1][0].strip()]
            result['roi_text'] = ' '.join(text_parts).strip()
            result['latex'] = normalize_math_to_latex(result['roi_text'])

    return result
