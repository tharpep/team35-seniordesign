#!/usr/bin/env python3
"""
MathPix OCR API Integration
Specialized OCR for mathematical equations using MathPix API
"""

import os
import requests
import base64
import json
import numpy as np
import cv2
from typing import Optional, Dict, Any
from pathlib import Path


def load_env_file():
    """Load environment variables from .env file if it exists."""
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()


def get_mathpix_credentials() -> tuple[str, str]:
    """Get MathPix API credentials from environment variables.

    Returns:
        (app_id, app_key) tuple

    Raises:
        ValueError: If credentials are not set
    """
    # Try to load from .env file first
    load_env_file()

    app_id = os.getenv('MATHPIX_APP_ID')
    app_key = os.getenv('MATHPIX_APP_KEY')

    if not app_id or not app_key:
        raise ValueError(
            "MathPix credentials not found. Please set MATHPIX_APP_ID and MATHPIX_APP_KEY environment variables.\n"
            "Get your credentials at: https://mathpix.com/ocr"
        )

    return app_id, app_key


def image_to_base64(image: np.ndarray, format: str = 'png') -> str:
    """Convert numpy image array to base64 string.

    Args:
        image: numpy array image (BGR format from cv2)
        format: image format ('png' or 'jpg')

    Returns:
        Base64 encoded string
    """
    # Encode image to specified format
    success, buffer = cv2.imencode(f'.{format}', image)
    if not success:
        raise ValueError("Failed to encode image")

    # Convert to base64
    img_bytes = buffer.tobytes()
    b64_string = base64.b64encode(img_bytes).decode('utf-8')

    return b64_string


def call_mathpix_api(
    image: np.ndarray,
    app_id: Optional[str] = None,
    app_key: Optional[str] = None,
    formats: list[str] = None
) -> Dict[str, Any]:
    """Call MathPix OCR API to extract LaTeX from an equation image.

    Args:
        image: numpy array image containing equation
        app_id: MathPix APP ID (uses env var if None)
        app_key: MathPix APP KEY (uses env var if None)
        formats: List of output formats (default: ["latex_simplified"])

    Returns:
        Dictionary with MathPix response including 'latex_simplified'

    Raises:
        requests.RequestException: If API call fails
    """
    # Get credentials
    if not app_id or not app_key:
        app_id, app_key = get_mathpix_credentials()

    # Default formats
    if formats is None:
        formats = ["latex_simplified", "text"]

    # Convert image to base64
    b64_image = image_to_base64(image)

    # Prepare payload
    payload = {
        "src": f"data:image/png;base64,{b64_image}",
        "formats": formats,
        "ocr": ["math", "text"]  # Enable both math and text recognition
    }

    # Make API request
    headers = {
        "app_id": app_id,
        "app_key": app_key,
        "Content-type": "application/json"
    }

    try:
        response = requests.post(
            "https://api.mathpix.com/v3/text",
            headers=headers,
            data=json.dumps(payload),
            timeout=30
        )

        # Check for errors
        response.raise_for_status()

        return response.json()

    except requests.exceptions.HTTPError as e:
        # Add more detailed error info
        error_details = {
            "error": str(e),
            "status_code": response.status_code,
            "response_text": response.text[:500] if hasattr(response, 'text') else "No response text"
        }
        print(f"[DEBUG] MathPix API Error: {error_details}")
        raise


def extract_latex_from_region(
    image: np.ndarray,
    bbox: list[int],
    app_id: Optional[str] = None,
    app_key: Optional[str] = None
) -> Dict[str, Any]:
    """Extract LaTeX from a specific region of an image.

    Args:
        image: Full page image (numpy array)
        bbox: Bounding box [x_min, y_min, x_max, y_max]
        app_id: MathPix APP ID (uses env var if None)
        app_key: MathPix APP KEY (uses env var if None)

    Returns:
        Dictionary with:
        - latex: Extracted LaTeX string
        - confidence: Confidence score (0-1)
        - text: Plain text representation
        - error: Error message if any
    """
    result = {
        'latex': '',
        'confidence': 0.0,
        'text': '',
        'error': None
    }

    try:
        # Expand bbox vertically by 1.5x to capture fraction bars
        x_min, y_min, x_max, y_max = bbox
        height = y_max - y_min
        width = x_max - x_min

        # Expand vertically by 50% (total 1.5x)
        vertical_expansion = int(height * 0.25)  # 25% on each side = 50% total
        horizontal_expansion = int(width * 0.1)  # 10% on each side

        y_min_expanded = max(0, y_min - vertical_expansion)
        y_max_expanded = min(image.shape[0], y_max + vertical_expansion)
        x_min_expanded = max(0, x_min - horizontal_expansion)
        x_max_expanded = min(image.shape[1], x_max + horizontal_expansion)

        # Crop expanded region
        cropped = image[y_min_expanded:y_max_expanded, x_min_expanded:x_max_expanded]

        if cropped.size == 0:
            result['error'] = "Empty crop region"
            return result

        # Call MathPix API
        response = call_mathpix_api(cropped, app_id, app_key)

        # Extract results
        # MathPix may return LaTeX in different fields depending on the response
        latex = response.get('latex_simplified') or response.get('latex_styled') or response.get('text', '')

        # Clean LaTeX delimiters if present (\( ... \) or $ ... $)
        latex = latex.strip()
        if latex.startswith('\\(') and latex.endswith('\\)'):
            latex = latex[2:-2].strip()
        elif latex.startswith('$') and latex.endswith('$'):
            latex = latex[1:-1].strip()

        result['latex'] = latex
        result['confidence'] = response.get('confidence', 0.0)
        result['text'] = response.get('text', '')

        # Check for API errors
        if 'error' in response:
            result['error'] = response['error']

    except Exception as e:
        result['error'] = str(e)

    return result


def process_equation_with_mathpix(
    image: np.ndarray,
    bbox: list[int],
    is_display: bool = True
) -> str:
    """Process an equation region with MathPix and format as Markdown.

    Args:
        image: Full page image
        bbox: Equation bounding box
        is_display: If True, use display math $$...$$, else inline $...$

    Returns:
        Markdown-formatted equation string
    """
    result = extract_latex_from_region(image, bbox)

    if result['error']:
        # Fallback: return plain text or error
        return f"*[MathPix Error: {result['error']}]*"

    latex = result['latex']
    confidence = result['confidence']

    if not latex:
        # Fallback to text if LaTeX not available
        latex = result.get('text', '[No equation detected]')

    # Format as Markdown
    if is_display:
        markdown = f"$$\n{latex}\n$$"
    else:
        markdown = f"${latex}$"

    # Add confidence note if low
    if confidence < 0.8:
        markdown += f"\n\n*MathPix confidence: {confidence:.1%}*"

    return markdown
