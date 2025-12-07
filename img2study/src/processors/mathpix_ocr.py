#!/usr/bin/env python3
"""MathPix OCR API Integration for mathematical equations."""

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
    """Get MathPix API credentials from environment or .env file."""
    load_env_file()

    app_id = os.getenv('MATHPIX_APP_ID')
    app_key = os.getenv('MATHPIX_APP_KEY')

    if not app_id or not app_key:
        raise ValueError(
            "MathPix credentials not found. Set MATHPIX_APP_ID and MATHPIX_APP_KEY.\n"
            "Get credentials at: https://mathpix.com/ocr"
        )

    return app_id, app_key


def image_to_base64(image: np.ndarray, format: str = 'png') -> str:
    """Convert numpy image array to base64 string for API transmission."""
    success, buffer = cv2.imencode(f'.{format}', image)
    if not success:
        raise ValueError("Failed to encode image")

    img_bytes = buffer.tobytes()
    return base64.b64encode(img_bytes).decode('utf-8')


def call_mathpix_api(
    image: np.ndarray,
    app_id: Optional[str] = None,
    app_key: Optional[str] = None,
    formats: list[str] = None
) -> Dict[str, Any]:
    """Call MathPix OCR API to extract LaTeX from equation image."""
    if not app_id or not app_key:
        app_id, app_key = get_mathpix_credentials()

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
    """Extract LaTeX from a cropped region using MathPix API."""
    result = {'latex': '', 'confidence': 0.0, 'text': '', 'error': None}

    try:
        x_min, y_min, x_max, y_max = bbox
        height = y_max - y_min
        width = x_max - x_min

        # Expand bbox to capture full equation context (especially fraction bars)
        vertical_expansion = int(height * 0.25)
        horizontal_expansion = int(width * 0.1)

        y_min_expanded = max(0, y_min - vertical_expansion)
        y_max_expanded = min(image.shape[0], y_max + vertical_expansion)
        x_min_expanded = max(0, x_min - horizontal_expansion)
        x_max_expanded = min(image.shape[1], x_max + horizontal_expansion)

        cropped = image[y_min_expanded:y_max_expanded, x_min_expanded:x_max_expanded]

        if cropped.size == 0:
            result['error'] = "Empty crop region"
            return result

        response = call_mathpix_api(cropped, app_id, app_key)

        # MathPix may return LaTeX in different response fields
        latex = response.get('latex_simplified') or response.get('latex_styled') or response.get('text', '')

        # Strip LaTeX delimiters: \( ... \) or $ ... $
        latex = latex.strip()
        if latex.startswith('\\(') and latex.endswith('\\)'):
            latex = latex[2:-2].strip()
        elif latex.startswith('$') and latex.endswith('$'):
            latex = latex[1:-1].strip()

        result['latex'] = latex
        result['confidence'] = response.get('confidence', 0.0)
        result['text'] = response.get('text', '')

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
    """Process equation region with MathPix and return formatted Markdown ($$...$$ or $...$)."""
    result = extract_latex_from_region(image, bbox)

    if result['error']:
        return f"*[MathPix Error: {result['error']}]*"

    latex = result['latex']
    confidence = result['confidence']

    if not latex:
        latex = result.get('text', '[No equation detected]')

    if is_display:
        markdown = f"$$\n{latex}\n$$"
    else:
        markdown = f"${latex}$"

    # Warn user if MathPix confidence is low
    if confidence < 0.8:
        markdown += f"\n\n*MathPix confidence: {confidence:.1%}*"

    return markdown
