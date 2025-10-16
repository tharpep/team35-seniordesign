"""
Image preprocessing and face detection using OpenCV and MediaPipe
"""

import cv2
import numpy as np
import mediapipe as mp
from typing import Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from .config import FacialProcessingConfig


class ProcessingQuality(Enum):
    """Quality levels for processed frames"""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"


@dataclass
class PreprocessedFrame:
    """Container for preprocessed frame data"""
    image: np.ndarray
    original_size: Tuple[int, int]
    quality_score: float
    quality_level: ProcessingQuality
    lighting_estimate: Optional[float]
    sharpness_score: Optional[float]
    rotation_applied: float
    preprocessing_time_ms: float


@dataclass
class FaceDetection:
    """Container for face detection results"""
    detected: bool
    landmarks: Optional[np.ndarray]
    confidence: float
    bbox: Optional[Tuple[int, int, int, int]]
    face_size: Optional[int]
    detection_time_ms: float


class ImagePreprocessor:
    """Handles image preprocessing and normalization"""

    def __init__(self, config: FacialProcessingConfig):
        self.config = config

    def preprocess(self, image: np.ndarray) -> PreprocessedFrame:
        """Preprocess image: normalize lighting, contrast, orientation"""
        import time
        start_time = time.perf_counter()

        original_size = image.shape[:2]
        rotation_angle = 0.0

        # Resize to target size
        if image.shape[:2] != self.config.target_image_size:
            image = cv2.resize(image, (self.config.target_image_size[1],
                                      self.config.target_image_size[0]))

        # Estimate lighting
        lighting_estimate = self._estimate_lighting(image)

        # Normalize lighting and contrast
        image = self._normalize_lighting(image)

        # Calculate quality metrics
        sharpness = self._calculate_sharpness(image)
        quality_score = self._calculate_quality_score(lighting_estimate, sharpness)
        quality_level = self._determine_quality_level(quality_score)

        processing_time = (time.perf_counter() - start_time) * 1000

        return PreprocessedFrame(
            image=image,
            original_size=original_size,
            quality_score=quality_score,
            quality_level=quality_level,
            lighting_estimate=lighting_estimate,
            sharpness_score=sharpness,
            rotation_applied=rotation_angle,
            preprocessing_time_ms=processing_time
        )

    def _estimate_lighting(self, image: np.ndarray) -> float:
        """Estimate lighting level (correlates with lux)"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_intensity = np.mean(gray)
        estimated_lux = (mean_intensity / 255.0) * 800 + 200
        return estimated_lux

    def _normalize_lighting(self, image: np.ndarray) -> np.ndarray:
        """Normalize lighting using CLAHE"""
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        lab = cv2.merge([l, a, b])
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    def _calculate_sharpness(self, image: np.ndarray) -> float:
        """Calculate sharpness using Laplacian variance"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return min(laplacian_var / 1000.0, 1.0)

    def _calculate_quality_score(self, lighting: float, sharpness: float) -> float:
        """Calculate overall quality score"""
        lighting_score = 1.0
        if lighting < self.config.min_lighting:
            lighting_score = lighting / self.config.min_lighting
        elif lighting > self.config.max_lighting:
            lighting_score = self.config.max_lighting / lighting
        return 0.6 * lighting_score + 0.4 * sharpness

    def _determine_quality_level(self, score: float) -> ProcessingQuality:
        """Determine quality level from score"""
        if score >= 0.9:
            return ProcessingQuality.EXCELLENT
        elif score >= 0.8:
            return ProcessingQuality.GOOD
        elif score >= 0.6:
            return ProcessingQuality.ACCEPTABLE
        return ProcessingQuality.POOR


class FaceDetector:
    """Handles face detection and landmark extraction using MediaPipe"""

    def __init__(self, config: FacialProcessingConfig):
        self.config = config
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=config.min_landmark_confidence,
            min_tracking_confidence=config.min_landmark_confidence
        )

    def detect(self, image: np.ndarray) -> FaceDetection:
        """Detect face and extract landmarks"""
        import time
        start_time = time.perf_counter()

        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_image)
        detection_time = (time.perf_counter() - start_time) * 1000

        if not results.multi_face_landmarks:
            return FaceDetection(
                detected=False, landmarks=None, confidence=0.0,
                bbox=None, face_size=None, detection_time_ms=detection_time
            )

        face_landmarks = results.multi_face_landmarks[0]
        height, width = image.shape[:2]
        landmarks = np.array([
            [lm.x * width, lm.y * height, lm.z * width]
            for lm in face_landmarks.landmark
        ])

        bbox = self._calculate_bbox(landmarks, width, height)
        face_size = max(bbox[2], bbox[3]) if bbox else None

        confidence = np.mean([lm.visibility for lm in face_landmarks.landmark
                            if hasattr(lm, 'visibility')])
        if confidence == 0:
            confidence = self.config.min_landmark_confidence

        detected = (face_size is not None and
                   face_size >= self.config.min_face_size and
                   confidence >= self.config.min_landmark_confidence)

        return FaceDetection(
            detected=detected, landmarks=landmarks, confidence=confidence,
            bbox=bbox, face_size=face_size, detection_time_ms=detection_time
        )

    def _calculate_bbox(self, landmarks: np.ndarray, width: int, height: int):
        """Calculate bounding box from landmarks"""
        x_coords, y_coords = landmarks[:, 0], landmarks[:, 1]
        x_min, y_min = int(np.min(x_coords)), int(np.min(y_coords))
        x_max, y_max = int(np.max(x_coords)), int(np.max(y_coords))
        padding = 10
        x_min, y_min = max(0, x_min - padding), max(0, y_min - padding)
        x_max, y_max = min(width, x_max + padding), min(height, y_max + padding)
        return (x_min, y_min, x_max - x_min, y_max - y_min)

    def __del__(self):
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()
