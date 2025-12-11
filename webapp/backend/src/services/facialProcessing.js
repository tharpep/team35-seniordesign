/**
 * Facial Processing Service
 * Handles communication with the facial-processing API and stores metrics
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { runQuery, getOne, getAll } = require('../config/database');

// Facial processing API configuration
const FACIAL_API_URL = process.env.FACIAL_API_URL || 'http://localhost:8001';

/**
 * Process a frame through the facial processing API
 * @param {string} framePath - Path to the frame image file
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Processing result
 */
async function processFrame(framePath, sessionId) {
  try {
    // Dynamic import for node-fetch (ESM module)
    const fetch = (await import('node-fetch')).default;

    // Read the frame file
    const frameBuffer = fs.readFileSync(framePath);
    const fileName = path.basename(framePath);

    // Create form data
    const formData = new FormData();
    formData.append('file', frameBuffer, {
      filename: fileName,
      contentType: 'image/jpeg'
    });

    // Send to facial processing API
    const response = await fetch(
      `${FACIAL_API_URL}/api/process?session_id=${sessionId}`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facial API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error(`[FacialProcessing] Error processing frame: ${error.message}`);
    throw error;
  }
}

/**
 * Store facial metrics in the database
 * @param {number} sessionId - Session ID
 * @param {Object} metrics - Processing result from facial API
 * @returns {Promise<Object>} Stored metrics record
 */
async function storeMetrics(sessionId, metrics) {
  try {
    const result = metrics.result || metrics;

    await runQuery(
      `INSERT INTO facial_metrics (
        session_id, frame_id, face_detected, detection_confidence,
        focus_score, focus_confidence, gaze_horizontal, gaze_vertical,
        blink_rate, head_yaw, head_pitch, emotion, emotion_confidence,
        emotion_probabilities, frame_quality, lighting_estimate, sharpness,
        total_latency_ms, quality_warning, low_confidence_warning
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        result.frame_id,
        result.face_detected ? 1 : 0,
        result.detection_confidence,
        result.focus_score,
        result.focus_confidence,
        result.gaze_horizontal,
        result.gaze_vertical,
        result.blink_rate,
        result.head_yaw,
        result.head_pitch,
        result.emotion,
        result.emotion_confidence,
        result.emotion_probabilities ? JSON.stringify(result.emotion_probabilities) : null,
        result.frame_quality,
        result.lighting_estimate,
        result.sharpness,
        result.total_latency_ms,
        result.quality_warning,
        result.low_confidence_warning ? 1 : 0
      ]
    );

    // Update session's running average focus score
    await updateSessionFocusScore(sessionId);

    return result;

  } catch (error) {
    console.error(`[FacialProcessing] Error storing metrics: ${error.message}`);
    throw error;
  }
}

/**
 * Update session's average focus score based on all metrics
 * @param {number} sessionId - Session ID
 */
async function updateSessionFocusScore(sessionId) {
  try {
    const avgResult = await getOne(
      `SELECT AVG(focus_score) as avg_focus
       FROM facial_metrics
       WHERE session_id = ? AND face_detected = 1`,
      [sessionId]
    );

    if (avgResult && avgResult.avg_focus !== null) {
      await runQuery(
        'UPDATE sessions SET focus_score = ? WHERE id = ?',
        [Math.round(avgResult.avg_focus * 100), sessionId]
      );
    }
  } catch (error) {
    console.error(`[FacialProcessing] Error updating session focus score: ${error.message}`);
  }
}

/**
 * Get recent metrics for a session
 * @param {number} sessionId - Session ID
 * @param {number} limit - Number of recent metrics to retrieve
 * @returns {Promise<Array>} Recent metrics
 */
async function getRecentMetrics(sessionId, limit = 10) {
  return await getAll(
    `SELECT * FROM facial_metrics
     WHERE session_id = ?
     ORDER BY timestamp DESC
     LIMIT ?`,
    [sessionId, limit]
  );
}

/**
 * Get aggregated metrics for a session
 * @param {number} sessionId - Session ID
 * @returns {Promise<Object>} Aggregated metrics
 */
async function getSessionMetrics(sessionId) {
  const metrics = await getOne(
    `SELECT
       COUNT(*) as total_frames,
       SUM(face_detected) as frames_with_face,
       AVG(CASE WHEN face_detected = 1 THEN focus_score END) as avg_focus_score,
       MAX(CASE WHEN face_detected = 1 THEN focus_score END) as max_focus_score,
       MIN(CASE WHEN face_detected = 1 THEN focus_score END) as min_focus_score,
       AVG(CASE WHEN face_detected = 1 THEN blink_rate END) as avg_blink_rate,
       AVG(CASE WHEN face_detected = 1 THEN detection_confidence END) as avg_detection_confidence
     FROM facial_metrics
     WHERE session_id = ?`,
    [sessionId]
  );

  // Get emotion distribution
  const emotions = await getAll(
    `SELECT emotion, COUNT(*) as count
     FROM facial_metrics
     WHERE session_id = ? AND emotion IS NOT NULL
     GROUP BY emotion`,
    [sessionId]
  );

  return {
    ...metrics,
    emotion_distribution: emotions.reduce((acc, row) => {
      acc[row.emotion] = row.count;
      return acc;
    }, {})
  };
}

/**
 * Get time-series focus data for chart display
 * @param {number} sessionId - Session ID
 * @returns {Promise<Array>} Time-series data points
 */
async function getFocusTimeSeries(sessionId) {
  // Get all metrics ordered by timestamp
  const allMetrics = await getAll(
    `SELECT
       timestamp,
       focus_score,
       face_detected,
       emotion
     FROM facial_metrics
     WHERE session_id = ?
     ORDER BY timestamp ASC`,
    [sessionId]
  );

  // Return formatted time-series data
  // When face is not detected, show 0% focus (user is not looking/present)
  // When face is detected, show the actual focus score (0-100%)
  return allMetrics.map(row => ({
    timestamp: row.timestamp,
    focusScore: row.face_detected
      ? Math.round((row.focus_score ?? 0) * 100)
      : 0, // No face = 0% focus
    faceDetected: row.face_detected === 1,
    emotion: row.emotion
  }));
}

/**
 * Check for fatigue based on recent metrics
 * @param {number} sessionId - Session ID
 * @param {Object} latestMetrics - Latest processing result
 * @returns {Promise<Object|null>} Fatigue event if detected
 */
async function checkFatigue(sessionId, latestMetrics) {
  const result = latestMetrics.result || latestMetrics;

  // Check for fatigue indicators
  if (result.emotion === 'fatigued' && result.emotion_confidence > 0.6) {
    const fatigueEvent = {
      session_id: sessionId,
      fatigue_level: result.emotion_confidence,
      blink_rate: result.blink_rate,
      data: JSON.stringify(result)
    };

    await runQuery(
      `INSERT INTO session_fatigue_flags (session_id, fatigue_level, blink_rate, data)
       VALUES (?, ?, ?, ?)`,
      [sessionId, fatigueEvent.fatigue_level, fatigueEvent.blink_rate, fatigueEvent.data]
    );

    return fatigueEvent;
  }

  return null;
}

/**
 * Check for distraction based on recent metrics
 * @param {number} sessionId - Session ID
 * @param {Object} latestMetrics - Latest processing result
 * @returns {Promise<Object|null>} Distraction event if detected
 */
async function checkDistraction(sessionId, latestMetrics) {
  const result = latestMetrics.result || latestMetrics;

  // Check for distraction indicators (low focus score)
  if (result.focus_score !== null && result.focus_score < 0.4) {
    const gazeDeviation = Math.sqrt(
      Math.pow(result.gaze_horizontal || 0, 2) +
      Math.pow(result.gaze_vertical || 0, 2)
    );

    let distractionType = 'low_focus';
    if (gazeDeviation > 20) {
      distractionType = 'gaze_away';
    } else if (!result.face_detected) {
      distractionType = 'face_not_visible';
    }

    const distractionEvent = {
      session_id: sessionId,
      distraction_type: distractionType,
      focus_score: result.focus_score,
      gaze_deviation: gazeDeviation,
      data: JSON.stringify(result)
    };

    await runQuery(
      `INSERT INTO session_distraction_events
       (session_id, distraction_type, focus_score, gaze_deviation, data)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, distractionType, result.focus_score, gazeDeviation, distractionEvent.data]
    );

    return distractionEvent;
  }

  return null;
}

/**
 * Get distraction events for a session
 * @param {number} sessionId - Session ID
 * @returns {Promise<Array>} Distraction events
 */
async function getDistractionEvents(sessionId) {
  return await getAll(
    `SELECT
       id,
       session_id,
       timestamp,
       distraction_type,
       focus_score,
       gaze_deviation,
       duration_seconds,
       data
     FROM session_distraction_events
     WHERE session_id = ?
     ORDER BY timestamp ASC`,
    [sessionId]
  );
}

/**
 * Check if the facial processing API is available
 * @returns {Promise<boolean>} True if API is available
 */
async function checkApiHealth() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${FACIAL_API_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn(`[FacialProcessing] API health check failed: ${error.message}`);
    return false;
  }
}

module.exports = {
  processFrame,
  storeMetrics,
  getRecentMetrics,
  getSessionMetrics,
  getFocusTimeSeries,
  getDistractionEvents,
  checkFatigue,
  checkDistraction,
  checkApiHealth,
  updateSessionFocusScore
};
