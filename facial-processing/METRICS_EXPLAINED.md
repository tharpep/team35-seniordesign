# Facial Processing Metrics Explained

This document explains all the metrics computed by the facial processing subsystem and what they mean for attention/focus analysis.

## Core Metrics

### Focus Score
- **Range**: 0.0 to 1.0
- **Description**: Overall attention/focus level combining multiple indicators
- **Interpretation**:
  - `0.8 - 1.0`: Highly focused and attentive
  - `0.6 - 0.8`: Moderately focused
  - `0.4 - 0.6`: Somewhat distracted
  - `0.0 - 0.4`: Highly distracted or not paying attention

**Components** (weighted average):
- Gaze direction (80% weight) - most important
- Eye openness (5% weight)
- Blink rate normality (5% weight)
- Head pose (10% weight)

### Emotion Classification
- **Values**: `neutral`, `happy`, `stressed`, `fatigued`
- **Description**: Detected emotional state from facial expressions
- **Confidence**: 0.0 to 1.0 (higher = more certain)
- **Notes**:
  - System defaults to `neutral` unless emotion is very obvious
  - Requires confidence > 0.5 for non-neutral emotions
  - `stressed` may indicate cognitive load or anxiety
  - `fatigued` suggests tiredness or drowsiness

## Gaze Metrics

### Horizontal Gaze (H)
- **Range**: Typically -30° to +30°
- **Description**: Eye gaze direction left/right
- **Interpretation**:
  - `Negative values`: Looking left
  - `Positive values`: Looking right
  - `0°`: Looking straight ahead horizontally
  - `|H| > 15°`: Likely not focused on screen/camera

### Vertical Gaze (V)
- **Range**: Typically -30° to +30°
- **Description**: Eye gaze direction up/down
- **Interpretation**:
  - `Negative values`: Looking up
  - `Positive values`: Looking down
  - `0°`: Looking straight ahead vertically
  - `|V| > 15°`: Likely not focused on screen/camera

### Gaze Focus Determination
The system considers someone "focused" when:
- `|H| ≤ 15°` AND `|V| ≤ 15°`
- Both horizontal and vertical gaze are within acceptable deviation

## Head Pose Metrics

### Yaw
- **Range**: Typically -50° to +50°
- **Description**: Head rotation left/right (turning head side to side)
- **Interpretation**:
  - `Negative values`: Head turned left
  - `Positive values`: Head turned right
  - `0°`: Head facing straight forward
  - `|Yaw| > 30°`: Significant head turn, may affect focus

### Pitch
- **Range**: Typically -50° to +50°
- **Description**: Head rotation up/down (nodding motion)
- **Interpretation**:
  - `Negative values`: Head tilted down
  - `Positive values`: Head tilted up
  - `0°`: Head level/straight
  - `|Pitch| > 30°`: Significant head tilt, may affect focus

### Roll
- **Range**: Typically -30° to +30°
- **Description**: Head tilt left/right (ear toward shoulder)
- **Interpretation**:
  - `Negative values`: Head tilted left
  - `Positive values`: Head tilted right
  - `0°`: Head upright
  - Usually less impactful on focus than yaw/pitch

## Blink Metrics

### Blink Rate
- **Units**: Blinks per minute
- **Normal Range**: 15-20 blinks/min
- **Description**: Frequency of complete blink cycles
- **Interpretation**:
  - `< 10 blinks/min`: Possible intense focus or screen staring
  - `10-15 blinks/min`: Below normal, may indicate concentration
  - `15-20 blinks/min`: Normal, healthy blink rate
  - `20-25 blinks/min`: Slightly elevated, possible mild stress
  - `> 25 blinks/min`: High rate, may indicate stress or fatigue

### Eye Openness
- **Range**: 0.0 to 1.0
- **Description**: How open the eyes are
- **Interpretation**:
  - `0.8 - 1.0`: Eyes wide open, alert
  - `0.6 - 0.8`: Normal eye openness
  - `0.4 - 0.6`: Somewhat droopy, mild fatigue
  - `0.0 - 0.4`: Very droopy or closed, significant fatigue

### Blink Detection
- **Binary**: `true` if blink detected in current frame
- **Method**: Based on Eye Aspect Ratio (EAR) threshold
- **Note**: Only meaningful in video/webcam mode, not single images

## Quality Metrics

### Frame Quality
- **Range**: 0.0 to 1.0
- **Description**: Overall quality of facial detection and landmark accuracy
- **Factors**:
  - Lighting conditions
  - Face size and position
  - Image blur/clarity
  - Landmark detection confidence

### Processing Latency
- **Units**: Milliseconds (ms)
- **Target**: < 100ms for real-time applications
- **Description**: Time taken to process one frame
- **Includes**:
  - Face detection
  - Landmark extraction
  - Focus calculation
  - Emotion classification

## Special Considerations

### Single Image vs Video
- **Blink Rate**: Only meaningful in video/webcam mode with temporal data
- **Focus History**: Video mode provides smoothed focus scores over time
- **Confidence**: Generally higher in video due to temporal consistency

### Absolute vs Relative Gaze
The system attempts to calculate **absolute gaze direction** by combining:
- Eye gaze direction (relative to face)
- Head pose orientation
- Result: Where the person is actually looking in world coordinates

### Thresholds and Calibration
- Default thresholds work for most users
- May need adjustment for:
  - Different camera positions
  - Varied lighting conditions
  - Individual facial characteristics
  - Cultural differences in eye contact norms

## Example Interpretation

```
Focus Score: 0.85
Emotion: neutral (confidence: 0.72)
Gaze: H=2.1° V=-1.3°
Head Pose: Yaw=5.2° Pitch=8.1°
Blink Rate: 17.2/min
Eye Openness: 0.89
```

**Interpretation**: Highly focused individual with:
- Excellent focus score (0.85)
- Looking nearly straight ahead (small gaze angles)
- Minimal head movement
- Normal blink rate and eye openness
- Neutral emotional state
- Overall: Strong attention and engagement