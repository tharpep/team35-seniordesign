"""
Main facial processing pipeline - orchestrates all components
"""

import numpy as np
import cv2
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
import time

from .config import FacialProcessingConfig, get_config
from .preprocessor import ImagePreprocessor, FaceDetector, PreprocessedFrame, FaceDetection
from .focus_estimator import FocusEstimator, FocusScore
from .emotion_classifier import EmotionClassifier, EmotionResult


@dataclass
class ProcessingResult:
    """Complete facial processing result"""
    session_id: str
    frame_id: str
    timestamp: float

    # Detection results
    face_detected: bool
    detection_confidence: float

    # Focus metrics
    focus_score: float
    focus_confidence: float
    gaze_horizontal: Optional[float]
    gaze_vertical: Optional[float]
    blink_rate: Optional[float]
    head_yaw: Optional[float]
    head_pitch: Optional[float]

    # Emotion metrics
    emotion: Optional[str]
    emotion_confidence: Optional[float]
    emotion_probabilities: Optional[Dict[str, float]]

    # Quality metrics
    frame_quality: float
    lighting_estimate: Optional[float]
    sharpness: Optional[float]

    # Performance metrics
    total_latency_ms: float
    preprocessing_ms: float
    detection_ms: float
    focus_estimation_ms: float
    emotion_classification_ms: float

    # Warnings/flags
    quality_warning: Optional[str]
    low_confidence_warning: bool


class FacialProcessor:
    """Main facial processing pipeline"""

    def __init__(self, config: Optional[FacialProcessingConfig] = None):
        self.config = config or get_config()

        # Initialize components
        self.preprocessor = ImagePreprocessor(self.config)
        self.face_detector = FaceDetector(self.config)
        self.focus_estimator = FocusEstimator(self.config)
        self.emotion_classifier = EmotionClassifier(self.config)

        # State
        self.current_session_id = None
        self.frame_count = 0

    def process_frame(self, image: np.ndarray,
                     session_id: str,
                     frame_id: Optional[str] = None) -> ProcessingResult:
        """
        Process a single frame through the complete pipeline

        Args:
            image: Input image (BGR format from OpenCV)
            session_id: Session identifier
            frame_id: Optional frame identifier

        Returns:
            ProcessingResult with all metrics
        """
        start_time = time.perf_counter()

        # Update session
        if session_id != self.current_session_id:
            self.start_session(session_id)

        self.frame_count += 1
        if frame_id is None:
            frame_id = f"{session_id}_{self.frame_count}"

        # Step 1: Preprocessing
        preprocess_start = time.perf_counter()
        preprocessed = self.preprocessor.preprocess(image)
        preprocessing_ms = (time.perf_counter() - preprocess_start) * 1000

        # Check quality gate
        quality_warning = None
        if preprocessed.quality_score < self.config.min_frame_quality:
            quality_warning = f"Low quality: {preprocessed.quality_score:.2f}"

        # Step 2: Face detection
        detection_start = time.perf_counter()
        face_detection = self.face_detector.detect(preprocessed.image)
        detection_ms = (time.perf_counter() - detection_start) * 1000

        # Initialize result with base metrics
        result = ProcessingResult(
            session_id=session_id,
            frame_id=frame_id,
            timestamp=time.time(),
            face_detected=face_detection.detected,
            detection_confidence=face_detection.confidence,
            focus_score=0.0,
            focus_confidence=0.0,
            gaze_horizontal=None,
            gaze_vertical=None,
            blink_rate=None,
            head_yaw=None,
            head_pitch=None,
            emotion=None,
            emotion_confidence=None,
            emotion_probabilities=None,
            frame_quality=preprocessed.quality_score,
            lighting_estimate=preprocessed.lighting_estimate,
            sharpness=preprocessed.sharpness_score,
            total_latency_ms=0.0,
            preprocessing_ms=preprocessing_ms,
            detection_ms=detection_ms,
            focus_estimation_ms=0.0,
            emotion_classification_ms=0.0,
            quality_warning=quality_warning,
            low_confidence_warning=False
        )

        # If no face detected, return early
        if not face_detection.detected:
            result.total_latency_ms = (time.perf_counter() - start_time) * 1000
            return result

        # Step 3: Focus estimation
        focus_start = time.perf_counter()
        focus_result = self.focus_estimator.estimate_focus(face_detection.landmarks)
        focus_estimation_ms = (time.perf_counter() - focus_start) * 1000

        result.focus_score = focus_result.score
        result.focus_confidence = focus_result.confidence
        result.gaze_horizontal = focus_result.gaze_metrics.horizontal_angle
        result.gaze_vertical = focus_result.gaze_metrics.vertical_angle
        result.blink_rate = focus_result.blink_metrics.blink_rate
        result.head_yaw = focus_result.head_pose_metrics.yaw
        result.head_pitch = focus_result.head_pose_metrics.pitch
        result.focus_estimation_ms = focus_estimation_ms

        # Step 4: Emotion classification
        emotion_start = time.perf_counter()
        # Pass the ORIGINAL frame to the emotion classifier for FER-based detection
        # FER's MTCNN face detection works better with original images (not CLAHE-normalized)
        self.emotion_classifier.set_current_frame(image)
        emotion_result = self.emotion_classifier.classify(face_detection.landmarks)
        emotion_classification_ms = (time.perf_counter() - emotion_start) * 1000

        result.emotion = emotion_result.emotion.value
        result.emotion_confidence = emotion_result.confidence
        result.emotion_probabilities = emotion_result.probabilities
        result.emotion_classification_ms = emotion_classification_ms

        # Calculate total latency
        total_latency = (time.perf_counter() - start_time) * 1000
        result.total_latency_ms = total_latency

        # Check latency requirement (1.0s = 1000ms at 95th percentile)
        if total_latency > self.config.max_latency_ms:
            if quality_warning:
                quality_warning += f"; High latency: {total_latency:.1f}ms"
            else:
                quality_warning = f"High latency: {total_latency:.1f}ms"
            result.quality_warning = quality_warning

        # Check confidence warnings
        if (face_detection.confidence < self.config.min_landmark_confidence or
            focus_result.confidence < 0.5 or
            emotion_result.confidence < self.config.emotion_confidence_threshold):
            result.low_confidence_warning = True

        return result

    def process_frame_from_file(self, image_path: str,
                               session_id: str) -> ProcessingResult:
        """Process frame from image file"""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to load image: {image_path}")
        return self.process_frame(image, session_id)

    def start_session(self, session_id: str):
        """Start a new processing session"""
        self.current_session_id = session_id
        self.frame_count = 0
        self.focus_estimator.reset()

    def to_json(self, result: ProcessingResult) -> Dict[str, Any]:
        """Convert ProcessingResult to JSON-serializable dict"""
        return asdict(result)
