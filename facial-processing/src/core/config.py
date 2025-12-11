"""
Configuration management for facial processing subsystem
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple


@dataclass
class FacialProcessingConfig:
    """Configuration for facial processing subsystem"""

    # Processing settings
    target_fps: int = 30  # Target frame rate for processing
    max_latency_ms: float = 1000.0  # 1.0s latency requirement (95th percentile)

    # Image preprocessing
    target_image_size: Tuple[int, int] = (640, 480)
    min_face_size: int = 50  # Minimum face size in pixels

    # Lighting constraints (lux)
    min_lighting: int = 200
    max_lighting: int = 1000

    # Focus estimation
    focus_smoothing_window: int = 10  # Number of frames to smooth focus score
    blink_rate_window: int = 60  # Window for calculating blink rate (frames)
    normal_blink_rate: float = 17.0  # Blinks per minute (baseline)
    blink_rate_tolerance: float = 1.0  # ±1 blink/min tolerance

    # Gaze thresholds
    max_gaze_deviation_deg: float = 15.0  # Max gaze angle for "focused"
    max_head_pose_deviation_deg: float = 50.0  # Max head rotation for "focused" (adjusted for head pose calculation issues)

    # Emotion classification (using FER pre-trained model)
    emotion_confidence_threshold: float = 0.35  # Lower threshold for FER model (more sensitive)
    emotion_classes: Tuple[str, ...] = (
        "neutral", "happy", "sad", "angry", "surprise", "fear", "disgust", "stressed", "fatigued"
    )

    # Quality gates
    min_landmark_confidence: float = 0.1  # Required landmark detection accuracy
    min_detection_confidence: float = 0.1  # Required face detection confidence (85%)
    min_frame_quality: float = 0.80  # Minimum overall quality score
    max_false_positive_rate: float = 0.05  # <5% false distraction alerts

    # Privacy & security
    encryption_algorithm: str = "AES-256"
    delete_raw_images: bool = True  # Delete images after processing
    retention_hours: int = 0  # Raw image retention (0 = immediate deletion)

    # Reliability requirements
    min_uptime: float = 0.98  # >98% uptime
    max_drop_rate: float = 0.02  # <2% dropped frames

    # Model paths (relative to project root)
    mediapipe_model_path: str = "models/face_landmarker.task"
    emotion_model_path: str = "models/emotion_classifier.pth"

    # Output settings
    output_format: str = "json"
    include_embeddings: bool = True
    include_debug_info: bool = False

    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    middleware_url: str = "http://localhost:8000"
    websocket_endpoint: str = "/ws/facial"

    @property
    def model_dir(self) -> Path:
        """Get models directory path"""
        return Path(__file__).parent.parent.parent / "models"

    @property
    def logs_dir(self) -> Path:
        """Get logs directory path"""
        return Path(__file__).parent.parent.parent / "logs"


# Default configuration
DEFAULT_CONFIG = FacialProcessingConfig()


def get_config() -> FacialProcessingConfig:
    """Get configuration with environment variable overrides

    Environment variables:
        - FACIAL_API_PORT: API server port
        - MIDDLEWARE_URL: Middleware API URL
        - MIN_LANDMARK_CONFIDENCE: Minimum landmark detection confidence
        - EMOTION_CONFIDENCE_THRESHOLD: Minimum emotion classification confidence
        - DEBUG_MODE: Enable debug info in output
    """
    config = FacialProcessingConfig()

    # Override with environment variables
    if port := os.getenv("FACIAL_API_PORT"):
        config.api_port = int(port)

    if middleware_url := os.getenv("MIDDLEWARE_URL"):
        config.middleware_url = middleware_url

    if min_conf := os.getenv("MIN_LANDMARK_CONFIDENCE"):
        config.min_landmark_confidence = float(min_conf)

    if emotion_conf := os.getenv("EMOTION_CONFIDENCE_THRESHOLD"):
        config.emotion_confidence_threshold = float(emotion_conf)

    if debug := os.getenv("DEBUG_MODE"):
        config.include_debug_info = debug.lower() == "true"

    return config
