#!/usr/bin/env python3
"""Middleware Integration - Send OCR results to backend."""

import os
import requests
from pathlib import Path


def send_markdown_to_middleware(session_id: int, markdown: str, source: str = "glasses"):
    """Send OCR-extracted markdown to middleware for storage in session context."""
    # Get middleware URL from env or use localhost default
    middleware_url = os.getenv("MIDDLEWARE_URL", "http://localhost:3001")
    endpoint = f"{middleware_url}/api/sessions/{session_id}/context"

    print(f"\n📤 Sending markdown to middleware...")
    print(f"  Session ID: {session_id}")
    print(f"  Source: {source}")
    print(f"  Content length: {len(markdown)} chars")

    try:
        response = requests.post(
            endpoint,
            json={
                "markdown": markdown,
                "source": source
            },
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Successfully sent to middleware")
            print(f"  ✓ Total context length: {data.get('contextLength', 0)} chars")
            return True
        else:
            error_msg = response.json().get('message', 'Unknown error')
            print(f"  ✗ Middleware error {response.status_code}: {error_msg}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"  ✗ Cannot connect to middleware at {middleware_url}")
        print(f"  ℹ Make sure the backend server is running")
        return False
    except requests.exceptions.Timeout:
        print(f"  ✗ Request timed out after 5 seconds")
        return False
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Failed to send to middleware: {e}")
        return False


def send_all_markdown_files(session_id: int, markdown_dir: Path, source: str = "glasses"):
    """Send all .md files from directory to middleware, combined into single document."""
    markdown_files = list(markdown_dir.glob("*.md"))

    if not markdown_files:
        print(f"  ℹ No markdown files found in {markdown_dir}")
        return False

    combined_markdown = []
    for md_file in sorted(markdown_files):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Add source filename comment for traceability
            combined_markdown.append(f"<!-- Source file: {md_file.name} -->\n{content}")

    # Join all markdown with separator
    full_markdown = "\n\n---\n\n".join(combined_markdown)

    return send_markdown_to_middleware(session_id, full_markdown, source)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python middleware_integration.py <session_id> <markdown_file_or_dir> [source]")
        print("\nExamples:")
        print("  python middleware_integration.py 123 output.md")
        print("  python middleware_integration.py 123 dataset/output/run_xxx/markdown/ screen")
        sys.exit(1)

    session_id = int(sys.argv[1])
    path = Path(sys.argv[2])
    source = sys.argv[3] if len(sys.argv) > 3 else "glasses"

    if path.is_dir():
        send_all_markdown_files(session_id, path, source)
    elif path.is_file():
        with open(path, 'r', encoding='utf-8') as f:
            markdown = f.read()
        send_markdown_to_middleware(session_id, markdown, source)
    else:
        print(f"Error: {path} is not a valid file or directory")
        sys.exit(1)
