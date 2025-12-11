"""
Emotion classification from facial landmarks and expressions
Uses FER (Facial Expression Recognition) pre-trained model for accurate detection
"""

import numpy as np
from typing import Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import time
import logging

from .config import FacialProcessingConfig

logger = logging.getLogger(__name__)


class EmotionClass(Enum):
    """Emotion categories - expanded to match FER model output"""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISE = "surprise"
    FEAR = "fear"
    DISGUST = "disgust"
    # Mapped emotions (from rule-based features)
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
    """Classifies emotions from facial landmarks and images using FER model"""

    # Landmark indices for facial features (used for fatigue detection)
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308]
    LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107]
    RIGHT_EYEBROW_INDICES = [336, 296, 334, 293, 300]
    FOREHEAD_INDICES = [10, 338, 297, 332, 284, 251, 389, 356]
    CHEEK_INDICES = [205, 425]

    # Mapping from FER emotions to our EmotionClass
    FER_EMOTION_MAP = {
        'angry': EmotionClass.ANGRY,
        'disgust': EmotionClass.DISGUST,
        'fear': EmotionClass.FEAR,
        'happy': EmotionClass.HAPPY,
        'sad': EmotionClass.SAD,
        'surprise': EmotionClass.SURPRISE,
        'neutral': EmotionClass.NEUTRAL,
    }

    def __init__(self, config: FacialProcessingConfig):
        self.config = config

        # Use deep model by default (FER)
        self.use_deep_model = True
        self.fer_detector = None
        self._fer_available = False

        # Try to initialize FER detector
        self._init_fer_detector()

        # Store the current frame for FER processing
        self._current_frame = None

    def _init_fer_detector(self):
        """Initialize the FER (Facial Expression Recognition) detector"""
        try:
            # Try new import path first (fer >= 25.x)
            try:
                from fer.fer import FER
            except ImportError:
                from fer import FER
            # Use MTCNN for face detection within FER (more accurate)
            self.fer_detector = FER(mtcnn=True)
            self._fer_available = True
            logger.info("FER emotion detector initialized successfully")
        except ImportError as e:
            logger.warning(f"FER library not available: {e}, falling back to rule-based classification")
            self._fer_available = False
            self.use_deep_model = False
        except Exception as e:
            logger.warning(f"Failed to initialize FER detector: {e}, falling back to rule-based")
            self._fer_available = False
            self.use_deep_model = False

    def set_current_frame(self, frame: np.ndarray):
        """Set the current frame for emotion detection (called by facial_processor)"""
        self._current_frame = frame

    def classify(self, landmarks: np.ndarray) -> EmotionResult:
        """
        Classify emotion from facial landmarks and/or image

        Args:
            landmarks: 468x3 array of facial landmarks

        Returns:
            EmotionResult with emotion class and confidence
        """
        timestamp = time.time()

        # Extract facial features for fatigue detection
        features = self._extract_features(landmarks)

        # Try deep learning (FER) first if available and we have a frame
        if self.use_deep_model and self._fer_available and self._current_frame is not None:
            emotion, confidence, probabilities = self._classify_with_fer(features)
        else:
            # Fall back to rule-based classification
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

    def _classify_with_fer(self, features: Dict[str, float]) -> Tuple[
        EmotionClass, float, Dict[str, float]
    ]:
        """
        Classify emotions using the FER (Facial Expression Recognition) pre-trained model.
        Also incorporates fatigue detection from landmark features.

        The FER model is trained on the FER2013 dataset and can detect:
        - angry, disgust, fear, happy, sad, surprise, neutral

        We also add fatigue detection using eye openness from landmarks.
        """
        try:
            # Run FER detection on the current frame
            emotions = self.fer_detector.detect_emotions(self._current_frame)

            if emotions and len(emotions) > 0:
                # Get the first face's emotions (assuming single face)
                emotion_scores = emotions[0]['emotions']

                # Convert FER scores to our probability dict
                probabilities = {}
                for fer_emotion, score in emotion_scores.items():
                    if fer_emotion in self.FER_EMOTION_MAP:
                        emotion_class = self.FER_EMOTION_MAP[fer_emotion]
                        probabilities[emotion_class.value] = float(score)

                # Add fatigue detection based on eye openness (from landmarks)
                fatigue_score = 0.0
                if features['eye_openness'] < 0.25:
                    # Eyes nearly closed - likely fatigued
                    fatigue_score = 0.7 + (0.25 - features['eye_openness']) * 1.2
                elif features['eye_openness'] < 0.35:
                    # Eyes partially closed
                    fatigue_score = 0.3 + (0.35 - features['eye_openness']) * 2.0

                # Add stressed mapping (angry + fear combined indicate stress)
                stress_score = (probabilities.get('angry', 0.0) * 0.6 +
                               probabilities.get('fear', 0.0) * 0.4)

                # Add fatigue and stressed to probabilities
                probabilities[EmotionClass.FATIGUED.value] = min(fatigue_score, 1.0)
                probabilities[EmotionClass.STRESSED.value] = min(stress_score, 1.0)

                # Normalize probabilities
                total = sum(probabilities.values())
                if total > 0:
                    probabilities = {k: v / total for k, v in probabilities.items()}

                # Find the dominant emotion
                dominant_emotion_str = max(probabilities.keys(), key=lambda k: probabilities[k])
                confidence = probabilities[dominant_emotion_str]

                # Map to EmotionClass
                try:
                    dominant_emotion = EmotionClass(dominant_emotion_str)
                except ValueError:
                    dominant_emotion = EmotionClass.NEUTRAL

                # Apply confidence threshold
                if confidence < self.config.emotion_confidence_threshold:
                    dominant_emotion = EmotionClass.NEUTRAL
                    confidence = probabilities.get(EmotionClass.NEUTRAL.value, 0.5)

                return dominant_emotion, confidence, probabilities

        except Exception as e:
            logger.warning(f"FER classification failed: {e}, falling back to rule-based")

        # Fall back to rule-based if FER fails
        return self._classify_rule_based(features)

    def _classify_deep(self, features: Dict[str, float]) -> Tuple[
        EmotionClass, float, Dict[str, float]
    ]:
        """
        Legacy method - redirects to FER classification
        """
        if self._fer_available and self._current_frame is not None:
            return self._classify_with_fer(features)
        return self._classify_rule_based(features)
