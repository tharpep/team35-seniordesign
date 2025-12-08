#!/usr/bin/env python3
"""
Working Preprocess Demo - Based on Oct 16 working version
Simple PaddleOCR + DLA approach that completed in ~11 seconds
"""

import sys
import time
import json
import secrets
import os
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

from src.processors.dla_processor import run_dla_pipeline


def load_image(image_path: str, max_width: int = 1600) -> np.ndarray:
    """Load and preprocess image for better OCR.

    Args:
        image_path: Path to image file
        max_width: Maximum width in pixels (default 1600, images larger will be resized)
    """
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize if image is too large (for faster OCR)
    width, height = img.size
    if width > max_width:
        scale = max_width / width
        new_width = max_width
        new_height = int(height * scale)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        print(f"  Resized from {width}x{height} to {new_width}x{new_height} ({scale*100:.0f}% scale)")

    # Convert to OpenCV format
    image = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # Preprocessing for better OCR
    # 1. Denoise
    image = cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)

    # 2. Increase contrast 
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    image = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

    return image


def main():
    if len(sys.argv) < 3:
        print("Usage: python preprocess_working.py <image_path> <session_id> [source]")
        print("\nExamples:")
        print("  python preprocess_working.py image.png 123")
        print("  python preprocess_working.py image.png 123 glasses")
        print("\nNote: session_id is REQUIRED - results are sent to middleware for GenAI context")
        sys.exit(1)

    image_path = sys.argv[1]
    session_id = sys.argv[2]
    source = sys.argv[3] if len(sys.argv) > 3 else "glasses"

    if not Path(image_path).exists():
        print(f"ERROR: Image not found: {image_path}")
        sys.exit(1)

    if not session_id or not session_id.isdigit():
        print(f"ERROR: Valid session_id is required (must be a number)")
        print("Usage: python preprocess_working.py <image_path> <session_id> [source]")
        sys.exit(1)

    # Generate unique run ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_hash = secrets.token_hex(4)
    run_id = f"run_{timestamp}_{run_hash}"

    output_dir = Path("dataset/output")
    run_output = output_dir / run_id

    json_dir = run_output / "json"
    markdown_dir = run_output / "markdown"
    tables_dir = run_output / "tables"
    artifacts_dir = run_output / "artifacts"
    crops_dir = run_output / "crops"

    for directory in [json_dir, markdown_dir, tables_dir, artifacts_dir, crops_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("WORKING PREPROCESS - Oct 16 Version")
    print("=" * 60)
    print(f"Image: {image_path}")
    print(f"Run ID: {run_id}")
    print(f"Output: {run_output}")
    print()

    overall_start = time.time()

    # Load image
    print("Loading image...")
    start = time.time()
    image = load_image(image_path)
    print(f"  ✓ Loaded in {time.time() - start:.2f}s")
    print(f"  Size: {image.shape[1]}x{image.shape[0]} pixels")
    print()

    # Initialize PaddleOCR
    print("Initializing PaddleOCR...")
    start = time.time()
    ocr = PaddleOCR(
        use_textline_orientation=False,
        lang='en'
    )
    init_time = time.time() - start
    print(f"  ✓ Initialized in {init_time:.2f}s")
    print()

    # Run OCR
    print("Running OCR (detection + recognition)...")
    start = time.time()
    results = ocr.ocr(image, cls=False)
    ocr_time = time.time() - start
    print(f"  ✓ Completed in {ocr_time:.2f}s")
    print()

    # Parse results
    if not results or not results[0]:
        print("ERROR: No text detected!")
        return

    detected_lines = []
    for line in results[0]:
        bbox = line[0]
        text, confidence = line[1]

        # Skip very low confidence
        if confidence < 0.5:
            continue

        bbox_coords = [[int(point[0]), int(point[1])] for point in bbox]

        # Split into words
        words = text.split()
        bbox_flat = [int(coord) for point in bbox for coord in point]
        x_min, y_min = min(bbox_flat[::2]), min(bbox_flat[1::2])
        x_max, y_max = max(bbox_flat[::2]), max(bbox_flat[1::2])
        line_width = x_max - x_min

        total_chars = sum(len(w) for w in words)
        char_width = line_width / total_chars if total_chars > 0 else 0

        current_x = x_min
        word_list = []
        for word_text in words:
            word_width = len(word_text) * char_width
            word_list.append({
                'text': word_text,
                'confidence': float(confidence),
                'bbox': [int(current_x), int(y_min), int(current_x + word_width), int(y_max)]
            })
            current_x += word_width + (line_width * 0.02)

        detected_lines.append({
            'text': text,
            'confidence': float(confidence),
            'bbox': bbox_coords,
            'words': word_list
        })

    avg_confidence = sum(line['confidence'] for line in detected_lines) / len(detected_lines)
    total_word_count = sum(len(line['words']) for line in detected_lines)

    print("RESULTS")
    print("=" * 60)
    print(f"Lines detected: {len(detected_lines)}")
    print(f"Words extracted: {total_word_count}")
    print(f"Average confidence: {avg_confidence:.3f}")
    print()

    # Run DLA pipeline for equation detection and formatting
    print("Running DLA pipeline (with MathPix for equations)...")
    start = time.time()

    height, width = image.shape[:2]

    # Run DLA with MathPix for equations
    regions, dla_markdown = run_dla_pipeline(
        detected_lines=detected_lines,
        image_width=width,
        image_height=height,
        image=image,
        use_mathpix=True
    )

    import re
    markdown = dla_markdown

    text_blocks = sum(1 for r in regions if r.region_type == "text_block")
    equations = sum(1 for r in regions if r.region_type in ["equation_display", "equation_inline"])
    tables = sum(1 for r in regions if r.region_type == "table")

    dla_time = time.time() - start
    print(f"  ✓ DLA complete in {dla_time:.2f}s")
    print()

    # Results
    total_time = time.time() - overall_start

    print("=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Total time: {total_time:.2f}s")
    print(f"  Initialization: {init_time:.2f}s")
    print(f"  OCR: {ocr_time:.2f}s")
    print(f"  DLA: {dla_time:.2f}s")
    print()
    print(f"Regions: {len(regions)}")

    # Count by type
    text_blocks = sum(1 for r in regions if r.region_type == "text_block")
    equations = sum(1 for r in regions if r.region_type in ["equation_display", "equation_inline"])
    tables = sum(1 for r in regions if r.region_type == "table")

    print(f"  Text blocks: {text_blocks}")
    print(f"  Equations: {equations}")
    print(f"  Tables: {tables}")
    print("=" * 60)
    print()

    # Print markdown
    print("MARKDOWN OUTPUT:")
    print("-" * 60)
    print(markdown[:1000] + "..." if len(markdown) > 1000 else markdown)
    print("-" * 60)
    print()

    image_name = Path(image_path).stem

    json_file = json_dir / f"{image_name}.json"
    page_data = {
        'filename': image_name,
        'page_index': 0,
        'width': width,
        'height': height,
        'blocks': [{
            'id': f'text_{image_name}_block_0',
            'type': 'text',
            'bbox': [0, 0, width, height],
            'confidence': float(avg_confidence),
            'lines': detected_lines,
            'table': None
        }],
        'aggregates': {
            'page_confidence_mean': float(avg_confidence),
            'page_confidence_min': float(min((line['confidence'] for line in detected_lines), default=0)),
            'word_count': total_word_count,
            'table_count': tables
        },
        'flagged': avg_confidence < 0.8,
        'reason_codes': [],
        'pii_masked': False
    }

    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(page_data, f, indent=2)

    markdown_file = markdown_dir / f"{image_name}.md"
    with open(markdown_file, 'w', encoding='utf-8') as f:
        f.write(markdown)

    run_report = {
        'run_id': run_id,
        'total_pages': 1,
        'total_words': total_word_count,
        'total_tables': tables,
        'total_equations': equations,
        'flagged_pages': 1 if avg_confidence < 0.8 else 0,
        'average_page_confidence_mean': float(avg_confidence),
        'average_page_confidence_min': float(min((line['confidence'] for line in detected_lines), default=0)),
        'processing_time_seconds': total_time,
        'confidence_histogram': {
            '0.9-1.0': sum(1 for line in detected_lines if line['confidence'] >= 0.9),
            '0.8-0.9': sum(1 for line in detected_lines if 0.8 <= line['confidence'] < 0.9),
            '0.0-0.8': sum(1 for line in detected_lines if line['confidence'] < 0.8)
        },
        'timing_breakdown': {
            'initialization': init_time,
            'ocr_processing': ocr_time
        },
        'input_path': image_path,
        'output_path': str(run_output),
        'language': 'en'
    }

    report_file = run_output / "run_report.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(run_report, f, indent=2)

    image_artifact = artifacts_dir / f"{image_name}_original.png"
    cv2.imwrite(str(image_artifact), image)

    cache_file = run_output / "ocr_cache.json"
    cache_data = {
        'run_id': run_id,
        'image_path': str(image_path),
        'image_shape': [height, width, 3],
        'lines': detected_lines,
        'words': sum((line['words'] for line in detected_lines), []),
        'stats': {
            'total_lines': len(detected_lines),
            'total_words': total_word_count,
            'avg_confidence': avg_confidence,
            'high_confidence_lines': sum(1 for line in detected_lines if line['confidence'] >= 0.95),
            'medium_confidence_lines': sum(1 for line in detected_lines if 0.85 <= line['confidence'] < 0.95),
            'low_confidence_lines': sum(1 for line in detected_lines if line['confidence'] < 0.85),
            'preprocessing_time': init_time + ocr_time
        }
    }

    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, indent=2)

    print("=" * 60)
    print("OUTPUT FILES CREATED")
    print("=" * 60)
    print(f"JSON: {json_file}")
    print(f"Markdown: {markdown_file}")
    print(f"Report: {report_file}")
    print(f"Cache: {cache_file}")
    print(f"Artifact: {image_artifact}")
    print()
    print(f"✓ Ready for live demo! Run: python ocr_live_demo.py {run_output}")
    print("=" * 60)

    # Send results to middleware for GenAI context
    try:
        from src.middleware_integration import send_markdown_to_middleware
        send_markdown_to_middleware(
            session_id=int(session_id),
            markdown=markdown,
            source=source
        )
    except Exception as e:
        print(f"\n⚠️  Warning: Failed to send to middleware: {e}")
        print("OCR processing completed successfully, but middleware integration failed.")


if __name__ == '__main__':
    main()
