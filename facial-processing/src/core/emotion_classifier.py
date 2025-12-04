"""
Emotion classification from facial landmarks and expressions
"""

import numpy as np
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import time

from .config import FacialProcessingConfig


class EmotionClass(Enum):
    """Emotion categories per design spec"""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    STRESSED = "stressed"
    FATIGUED = "fatigued"


@dataclass
class EmotionResult:
    """Emotion classification result"""
    emotion: EmotionClass
    confidence: float
    probabilities: Dict[str, float]  # All class probabilities
    timestamp: float
    features: Optional[Dict[str, float]] = None  # Facial features used


class EmotionClassifier:
    """Classifies emotions from facial landmarks"""

    # Landmark indices for facial features
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308]
    LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107]
    RIGHT_EYEBROW_INDICES = [336, 296, 334, 293, 300]
    FOREHEAD_INDICES = [10, 338, 297, 332, 284, 251, 389, 356]
    CHEEK_INDICES = [205, 425]

    def __init__(self, config: FacialProcessingConfig):
        self.config = config

        # Simple rule-based classifier (can be replaced with CNN/Transformer)
        self.use_deep_model = False  # Set to True when deep model is available

    def classify(self, landmarks: np.ndarray) -> EmotionResult:
        """
        Classify emotion from facial landmarks

        Args:
            landmarks: 468x3 array of facial landmarks

        Returns:
            EmotionResult with emotion class and confidence
        """
        timestamp = time.time()

        # Extract facial features
        features = self._extract_features(landmarks)

        # Classify using rule-based or deep learning
        if self.use_deep_model:
            emotion, confidence, probabilities = self._classify_deep(features)
        else:
            emotion, confidence, probabilities = self._classify_rule_based(features)

        return EmotionResult(
            emotion=emotion,
            confidence=confidence,
            probabilities=probabilities,
            timestamp=timestamp,
            features=features if self.config.include_debug_info else None
        )

    def _extract_features(self, landmarks: np.ndarray) -> Dict[str, float]:
        """Extract emotion-relevant features from landmarks"""

        features = {}

        # 1. Mouth features (smile, frown)
        features['mouth_aspect_ratio'] = self._calculate_mouth_aspect_ratio(landmarks)
        features['mouth_openness'] = self._calculate_mouth_openness(landmarks)
        features['mouth_corners_angle'] = self._calculate_mouth_corners_angle(landmarks)

        # 2. Eyebrow features (surprise, stress, anger)
        features['eyebrow_height'] = self._calculate_eyebrow_height(landmarks)
        features['eyebrow_angle'] = self._calculate_eyebrow_angle(landmarks)

        # 3. Eye features (fatigue, stress)
        features['eye_openness'] = self._calculate_eye_openness(landmarks)

        # 4. Tension indicators (forehead, cheeks)
        features['forehead_tension'] = self._calculate_forehead_tension(landmarks)

        return features

    def _calculate_mouth_aspect_ratio(self, landmarks: np.ndarray) -> float:
        """Calculate mouth aspect ratio (width/height)"""
        mouth = landmarks[self.MOUTH_INDICES]

        # Width (horizontal span)
        width = np.linalg.norm(mouth[0] - mouth[6])

        # Height (vertical span)
        height = np.linalg.norm(mouth[3] - mouth[9])

        mar = width / (height + 1e-6)
        return float(mar)

    def _calculate_mouth_openness(self, landmarks: np.ndarray) -> float:
        """Calculate how open the mouth is (0 = closed, 1 = open)"""
        mouth = landmarks[self.MOUTH_INDICES]

        # Vertical distance between upper and lower lip
        upper_lip = mouth[2:5].mean(axis=0)
        lower_lip = mouth[8:11].mean(axis=0)

        openness = np.linalg.norm(upper_lip - lower_lip)

        # Normalize (empirically determined)
        normalized = np.clip(openness / 20.0, 0.0, 1.0)
        return float(normalized)

    def _calculate_mouth_corners_angle(self, landmarks: np.ndarray) -> float:
        """Calculate angle of mouth corners (smile/frown indicator)"""
        mouth = landmarks[self.MOUTH_INDICES]

        left_corner = mouth[0]
        right_corner = mouth[6]
        center = mouth[3]  # Upper lip center

        # Calculate angle relative to horizontal
        mouth_line = right_corner - left_corner
        mouth_center = (left_corner + right_corner) / 2

        # Vertical offset of center from corners (positive = smile, negative = frown)
        vertical_offset = center[1] - mouth_center[1]

        # Normalize to angle in degrees
        angle = np.arctan2(vertical_offset, mouth_line[0]) * 180 / np.pi
        return float(angle)

    def _calculate_eyebrow_height(self, landmarks: np.ndarray) -> float:
        """Calculate eyebrow height (surprise indicator)"""
        left_brow = landmarks[self.LEFT_EYEBROW_INDICES].mean(axis=0)
        right_brow = landmarks[self.RIGHT_EYEBROW_INDICES].mean(axis=0)
        brow_center = (left_brow + right_brow) / 2

        # Reference: nose bridge
        nose_bridge = landmarks[168]

        height = nose_bridge[1] - brow_center[1]

        # Normalize (higher = more surprised/stressed)
        normalized = np.clip(height / 50.0, 0.0, 1.0)
        return float(normalized)

    def _calculate_eyebrow_angle(self, landmarks: np.ndarray) -> float:
        """Calculate eyebrow angle (stress/anger indicator)"""
        left_brow = landmarks[self.LEFT_EYEBROW_INDICES]
        right_brow = landmarks[self.RIGHT_EYEBROW_INDICES]

        # Inner vs outer eyebrow positions
        left_inner = left_brow[0]
        left_outer = left_brow[-1]
        right_inner = right_brow[0]
        right_outer = right_brow[-1]

        # Calculate angles
        left_angle = np.arctan2(left_outer[1] - left_inner[1],
                               left_outer[0] - left_inner[0]) * 180 / np.pi
        right_angle = np.arctan2(right_inner[1] - right_outer[1],
                                right_inner[0] - right_outer[0]) * 180 / np.pi

        # Average (negative = furrowed/stressed, positive = raised)
        angle = (left_angle + right_angle) / 2
        return float(angle)

    def _calculate_eye_openness(self, landmarks: np.ndarray) -> float:
        """Calculate eye openness (fatigue indicator)"""
        from .focus_estimator import FocusEstimator

        # Use eye aspect ratio from focus estimator
        left_ear = self._calculate_ear(landmarks, FocusEstimator.LEFT_EYE_INDICES)
        right_ear = self._calculate_ear(landmarks, FocusEstimator.RIGHT_EYE_INDICES)

        ear = (left_ear + right_ear) / 2.0
        openness = np.clip((ear - 0.1) / 0.2, 0.0, 1.0)

        return float(openness)

    def _calculate_ear(self, landmarks: np.ndarray, eye_indices: list) -> float:
        """Calculate Eye Aspect Ratio"""
        eye = landmarks[eye_indices]
        v1 = np.linalg.norm(eye[1] - eye[5])
        v2 = np.linalg.norm(eye[2] - eye[4])
        h = np.linalg.norm(eye[0] - eye[3])
        return (v1 + v2) / (2.0 * h + 1e-6)

    def _calculate_forehead_tension(self, landmarks: np.ndarray) -> float:
        """Calculate forehead tension (stress indicator)"""
        # Simplified: measure variance in forehead landmarks
        forehead = landmarks[self.FOREHEAD_INDICES]

        # Calculate spread/variance
        center = forehead.mean(axis=0)
        distances = np.linalg.norm(forehead - center, axis=1)
        tension = np.std(distances)

        # Normalize
        normalized = np.clip(tension / 10.0, 0.0, 1.0)
        return float(normalized)

    def _classify_rule_based(self, features: Dict[str, float]) -> Tuple[
        EmotionClass, float, Dict[str, float]
    ]:
        """Rule-based emotion classification"""

        scores = {
            EmotionClass.NEUTRAL: 1.0,  # Very high baseline - neutral is the default
            EmotionClass.HAPPY: 0.0,
            EmotionClass.STRESSED: 0.0,
            EmotionClass.FATIGUED: 0.0
        }

        # Happy: Only very clear, obvious smiles
        if features['mouth_corners_angle'] > 7.0:  # Very clear smile only
            scores[EmotionClass.HAPPY] += 1.4  # Strong enough to beat neutral
        if features['mouth_corners_angle'] > 5.0 and features['mouth_aspect_ratio'] > 1.2:
            scores[EmotionClass.HAPPY] += 1.0  # Moderate smile + wide mouth

        # Stressed: Only very obvious stress indicators
        if features['eyebrow_angle'] < -30.0:  # Extremely furrowed brows only
            scores[EmotionClass.STRESSED] += 1.2  # Strong enough to beat neutral
        if features['forehead_tension'] > 0.8 and features['mouth_corners_angle'] < -8.0:
            scores[EmotionClass.STRESSED] += 1.0  # High tension + clear frown

        # Fatigued: Only very obvious fatigue (like yawning or very droopy eyes)
        if features['eye_openness'] < 0.2:  # Eyes almost closed
            scores[EmotionClass.FATIGUED] += 1.2  # Strong enough to beat neutral



        # Normalize scores to probabilities
        total = sum(scores.values())
        probabilities = {
            emotion.value: score / total
            for emotion, score in scores.items()
        }

        # Select emotion with highest probability
        emotion = max(scores.keys(), key=lambda e: scores[e])
        confidence = probabilities[emotion.value]

        # Apply confidence threshold
        if confidence < self.config.emotion_confidence_threshold:
            emotion = EmotionClass.NEUTRAL
            confidence = probabilities[EmotionClass.NEUTRAL.value]

        return emotion, confidence, probabilities

    def _classify_deep(self, features: Dict[str, float]) -> Tuple[
        EmotionClass, float, Dict[str, float]
    ]:
        """
        Deep learning-based classification (placeholder)

        To implement:
        1. Load pretrained model (CNN/Transformer)
        2. Convert features to model input
        3. Run inference
        4. Return predictions
        """
        # TODO: Implement when deep model is ready
        # For now, fall back to rule-based
        return self._classify_rule_based(features)
