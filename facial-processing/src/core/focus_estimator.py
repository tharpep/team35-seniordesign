"""
Focus and attention estimation based on facial landmarks, gaze, and blink rate
"""

import numpy as np
from typing import Optional, List, Tuple
from dataclasses import dataclass
from collections import deque
import time

from .config import FacialProcessingConfig


@dataclass
class GazeMetrics:
    """Gaze direction and metrics"""
    horizontal_angle: float  # Degrees left(-)/right(+)
    vertical_angle: float    # Degrees up(-)/down(+)
    is_focused: bool         # Within acceptable deviation
    confidence: float


@dataclass
class BlinkMetrics:
    """Blink rate and eye openness metrics"""
    blink_detected: bool
    blink_rate: float         # Blinks per minute
    eye_openness: float       # 0 (closed) to 1 (open)
    is_normal_rate: bool      # Within tolerance


@dataclass
class HeadPoseMetrics:
    """Head pose estimation"""
    pitch: float              # Degrees (nodding up/down)
    yaw: float                # Degrees (turning left/right)
    roll: float               # Degrees (tilting)
    is_centered: bool         # Within acceptable deviation


@dataclass
class FocusScore:
    """Overall focus/attention score"""
    score: float              # 0 (distracted) to 1 (focused)
    gaze_metrics: GazeMetrics
    blink_metrics: BlinkMetrics
    head_pose_metrics: HeadPoseMetrics
    timestamp: float
    confidence: float


class FocusEstimator:
    """Estimates focus and attention from facial landmarks"""

    # MediaPipe landmark indices
    LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
    RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]
    NOSE_TIP_INDEX = 1
    CHIN_INDEX = 152
    LEFT_EYE_CORNER = 33
    RIGHT_EYE_CORNER = 263

    def __init__(self, config: FacialProcessingConfig):
        self.config = config

        # Sliding windows for temporal smoothing
        self.focus_history = deque(maxlen=config.focus_smoothing_window)
        self.blink_history = deque(maxlen=config.blink_rate_window)
        self.eye_openness_history = deque(maxlen=10)

        # Blink detection state
        self.last_blink_time = None
        self.eye_was_closed = False

    def estimate_focus(self, landmarks: np.ndarray) -> FocusScore:
        """
        Estimate focus score from facial landmarks

        Args:
            landmarks: 468x3 array of facial landmarks (x, y, z)

        Returns:
            FocusScore with all metrics
        """
        timestamp = time.time()

        # Calculate individual metrics
        gaze_metrics = self._estimate_gaze(landmarks)
        blink_metrics = self._estimate_blink_rate(landmarks, timestamp)
        head_pose_metrics = self._estimate_head_pose(landmarks)

        # Calculate overall focus score
        focus_score = self._calculate_focus_score(
            gaze_metrics, blink_metrics, head_pose_metrics
        )

        # Apply temporal smoothing
        self.focus_history.append(focus_score)
        smoothed_score = np.mean(list(self.focus_history))

        # Calculate confidence
        confidence = self._calculate_confidence(
            gaze_metrics, blink_metrics, head_pose_metrics
        )

        return FocusScore(
            score=smoothed_score,
            gaze_metrics=gaze_metrics,
            blink_metrics=blink_metrics,
            head_pose_metrics=head_pose_metrics,
            timestamp=timestamp,
            confidence=confidence
        )

    def _estimate_gaze(self, landmarks: np.ndarray) -> GazeMetrics:
        """Estimate gaze direction from eye and iris landmarks"""

        # Get iris centers
        left_iris = landmarks[self.LEFT_IRIS_INDICES].mean(axis=0)
        right_iris = landmarks[self.RIGHT_IRIS_INDICES].mean(axis=0)

        # Get eye corners
        left_eye_corner = landmarks[self.LEFT_EYE_CORNER]
        right_eye_corner = landmarks[self.RIGHT_EYE_CORNER]

        # Get eye centers (midpoint of eye landmarks)
        left_eye_center = landmarks[self.LEFT_EYE_INDICES].mean(axis=0)
        right_eye_center = landmarks[self.RIGHT_EYE_INDICES].mean(axis=0)

        # Calculate gaze offset (iris position relative to eye center)
        left_gaze_offset = left_iris - left_eye_center
        right_gaze_offset = right_iris - right_eye_center
        gaze_offset = (left_gaze_offset + right_gaze_offset) / 2

        # Convert to angles (simplified - more accurate would use camera calibration)
        # Assuming face is roughly frontal
        horizontal_angle = np.arctan2(gaze_offset[0], 100) * 180 / np.pi
        vertical_angle = np.arctan2(gaze_offset[1], 100) * 180 / np.pi

        # Check if within focus threshold
        is_focused = (
            abs(horizontal_angle) <= self.config.max_gaze_deviation_deg and
            abs(vertical_angle) <= self.config.max_gaze_deviation_deg
        )

        # Confidence based on iris visibility
        confidence = 1.0 - (abs(horizontal_angle) / 45.0)  # Decreases with angle
        confidence = max(0.0, min(1.0, confidence))

        return GazeMetrics(
            horizontal_angle=float(horizontal_angle),
            vertical_angle=float(vertical_angle),
            is_focused=is_focused,
            confidence=confidence
        )

    def _estimate_blink_rate(self, landmarks: np.ndarray,
                            timestamp: float) -> BlinkMetrics:
        """Estimate blink rate and detect blinks"""

        # Calculate Eye Aspect Ratio (EAR) for blink detection
        left_ear = self._calculate_eye_aspect_ratio(landmarks, self.LEFT_EYE_INDICES)
        right_ear = self._calculate_eye_aspect_ratio(landmarks, self.RIGHT_EYE_INDICES)
        ear = (left_ear + right_ear) / 2.0

        # Eye openness (0 = closed, 1 = open)
        # EAR typically ranges from 0.1 (closed) to 0.3 (open)
        eye_openness = np.clip((ear - 0.1) / 0.2, 0.0, 1.0)
        self.eye_openness_history.append(eye_openness)

        # Detect blink (EAR drops below threshold)
        blink_threshold = 0.15
        blink_detected = False

        if ear < blink_threshold and not self.eye_was_closed:
            # Eye just closed (blink started)
            self.eye_was_closed = True
        elif ear >= blink_threshold and self.eye_was_closed:
            # Eye just opened (blink completed)
            blink_detected = True
            self.blink_history.append(timestamp)
            self.last_blink_time = timestamp
            self.eye_was_closed = False

        # Calculate blink rate (blinks per minute)
        if len(self.blink_history) >= 2:
            time_window = timestamp - self.blink_history[0]
            if time_window > 0:
                blink_rate = (len(self.blink_history) / time_window) * 60
            else:
                blink_rate = self.config.normal_blink_rate
        else:
            blink_rate = self.config.normal_blink_rate

        # Check if blink rate is normal (within tolerance)
        is_normal_rate = abs(blink_rate - self.config.normal_blink_rate) <= \
                        self.config.blink_rate_tolerance

        return BlinkMetrics(
            blink_detected=blink_detected,
            blink_rate=float(blink_rate),
            eye_openness=float(eye_openness),
            is_normal_rate=is_normal_rate
        )

    def _calculate_eye_aspect_ratio(self, landmarks: np.ndarray,
                                   eye_indices: List[int]) -> float:
        """Calculate Eye Aspect Ratio (EAR) for blink detection"""
        eye_landmarks = landmarks[eye_indices]

        # Vertical distances
        v1 = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        v2 = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])

        # Horizontal distance
        h = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])

        # EAR formula
        ear = (v1 + v2) / (2.0 * h + 1e-6)
        return ear

    def _estimate_head_pose(self, landmarks: np.ndarray) -> HeadPoseMetrics:
        """Estimate head pose (pitch, yaw, roll) from landmarks"""

        # Get key landmarks for pose estimation
        nose_tip = landmarks[self.NOSE_TIP_INDEX]
        chin = landmarks[self.CHIN_INDEX]
        left_eye = landmarks[self.LEFT_EYE_CORNER]
        right_eye = landmarks[self.RIGHT_EYE_CORNER]

        # Calculate vectors
        eye_center = (left_eye + right_eye) / 2
        vertical_vec = chin - nose_tip
        horizontal_vec = right_eye - left_eye

        # Simplified pose estimation (degrees)
        # More accurate would use solvePnP with camera calibration

        # Yaw (left/right turn) - based on eye distance asymmetry
        face_width = np.linalg.norm(horizontal_vec)
        yaw = np.arctan2(nose_tip[0] - eye_center[0], face_width) * 180 / np.pi

        # Pitch (up/down nod) - based on nose-chin vertical alignment
        pitch = np.arctan2(vertical_vec[1], vertical_vec[2] + 1e-6) * 180 / np.pi

        # Roll (tilt) - based on eye line angle
        roll = np.arctan2(horizontal_vec[1], horizontal_vec[0]) * 180 / np.pi

        # Check if head is centered
        is_centered = (
            abs(yaw) <= self.config.max_head_pose_deviation_deg and
            abs(pitch) <= self.config.max_head_pose_deviation_deg
        )

        return HeadPoseMetrics(
            pitch=float(pitch),
            yaw=float(yaw),
            roll=float(roll),
            is_centered=is_centered
        )

    def _calculate_focus_score(self, gaze: GazeMetrics,
                               blink: BlinkMetrics,
                               head_pose: HeadPoseMetrics) -> float:
        """Calculate overall focus score from individual metrics"""

        # Gaze component (40% weight)
        gaze_score = 1.0 if gaze.is_focused else 0.5
        gaze_score *= gaze.confidence

        # Blink rate component (20% weight)
        # Abnormal blink rate suggests fatigue or stress
        blink_score = 1.0 if blink.is_normal_rate else 0.6

        # Eye openness component (20% weight)
        # Lower openness suggests fatigue
        openness_score = blink.eye_openness

        # Head pose component (20% weight)
        head_score = 1.0 if head_pose.is_centered else 0.5

        # Weighted average
        focus_score = (
            0.40 * gaze_score +
            0.20 * blink_score +
            0.20 * openness_score +
            0.20 * head_score
        )

        return max(0.0, min(1.0, focus_score))

    def _calculate_confidence(self, gaze: GazeMetrics,
                             blink: BlinkMetrics,
                             head_pose: HeadPoseMetrics) -> float:
        """Calculate overall confidence in focus estimation"""

        # Based on gaze confidence and data availability
        confidence = gaze.confidence

        # Reduce confidence if we have insufficient history
        if len(self.focus_history) < self.config.focus_smoothing_window // 2:
            confidence *= 0.8

        if len(self.blink_history) < 5:
            confidence *= 0.9

        return max(0.0, min(1.0, confidence))

    def reset(self):
        """Reset temporal state"""
        self.focus_history.clear()
        self.blink_history.clear()
        self.eye_openness_history.clear()
        self.last_blink_time = None
        self.eye_was_closed = False
