# Quick Start Guide - Facial Processing Subsystem

## 5-Minute Setup

```bash
# 1. Navigate to directory
cd facial-processing

# 2. Ensure uv is installed (one-time)
pip install uv  # or: brew install uv

# 3. Create a local environment managed by uv
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 4. Install dependencies from pyproject.toml
uv pip install -e .

# (You can also run `uv sync --python=3.10` to create & populate `.venv/` in
# one step. If you previously had a `venv/`, remove it or unset `VIRTUAL_ENV`
# before syncing.)

# 5. Test with demo
python demo.py --mode webcam
```

## Common Commands

```bash
# Start API server
python -m src.api.server

# Run demo with webcam
python demo.py --mode webcam

# Process single image
python demo.py --mode image --image test.jpg

# Health check
curl http://localhost:8001/health

# Get metrics
curl http://localhost:8001/api/metrics
```

## Python Usage

```python
from src.core import FacialProcessor
import cv2

# Initialize
processor = FacialProcessor()
processor.start_session("my_session")

# Process frame
image = cv2.imread("frame.jpg")
result = processor.process_frame(image, "my_session")

# Access results
print(f"Focus: {result.focus_score}")
print(f"Emotion: {result.emotion}")
print(f"Latency: {result.total_latency_ms}ms")
```

## Configuration

Edit `.env` file:
```
FACIAL_API_PORT=8001
MIDDLEWARE_URL=http://localhost:8000
MIN_LANDMARK_CONFIDENCE=0.85
```

## Troubleshooting

**"No module named 'cv2'"**
→ Run `uv pip install -e .` again

**"Failed to open webcam"**
→ Check camera permissions

**High latency (>1000ms)**
→ Reduce image resolution in config.py

**Low detection confidence**
→ Improve lighting (200-1000 lux range)
