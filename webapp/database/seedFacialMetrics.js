const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'studycoach.db');

// Sample facial metrics data for testing
const generateFacialMetrics = (sessionId, numFrames = 50) => {
  const metrics = [];
  const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const emotions = ['neutral', 'focused', 'happy', 'confused', 'fatigued', 'stressed'];
  
  for (let i = 0; i < numFrames; i++) {
    const timestamp = new Date(startTime.getTime() + (i * 36000)); // Every 36 seconds
    
    // Simulate realistic focus pattern (starts high, dips in middle, recovers)
    const progress = i / numFrames;
    const focusBase = 0.7 + Math.sin(progress * Math.PI) * 0.2;
    const focusNoise = (Math.random() - 0.5) * 0.15;
    const focusScore = Math.max(0.3, Math.min(0.95, focusBase + focusNoise));
    
    // Emotion changes based on focus and time
    let emotion;
    let emotionProbs;
    if (focusScore > 0.8) {
      emotion = Math.random() > 0.7 ? 'focused' : 'neutral';
      emotionProbs = JSON.stringify({
        neutral: 0.3,
        focused: 0.6,
        happy: 0.1
      });
    } else if (focusScore > 0.6) {
      emotion = Math.random() > 0.5 ? 'neutral' : 'focused';
      emotionProbs = JSON.stringify({
        neutral: 0.5,
        focused: 0.4,
        confused: 0.1
      });
    } else if (focusScore > 0.4) {
      emotion = ['confused', 'neutral', 'stressed'][Math.floor(Math.random() * 3)];
      emotionProbs = JSON.stringify({
        neutral: 0.3,
        confused: 0.4,
        stressed: 0.3
      });
    } else {
      emotion = ['fatigued', 'stressed'][Math.floor(Math.random() * 2)];
      emotionProbs = JSON.stringify({
        fatigued: 0.5,
        stressed: 0.3,
        neutral: 0.2
      });
    }
    
    // Blink rate correlates with fatigue
    const blinkRate = emotion === 'fatigued' 
      ? 20 + Math.random() * 10 
      : 12 + Math.random() * 6;
    
    // Gaze deviation correlates with distraction
    const gazeDeviation = (1 - focusScore) * 30 + (Math.random() - 0.5) * 10;
    
    metrics.push({
      session_id: sessionId,
      frame_id: `frame_${String(i).padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      face_detected: 1,
      detection_confidence: 0.92 + Math.random() * 0.07,
      focus_score: focusScore,
      focus_confidence: 0.85 + Math.random() * 0.1,
      gaze_horizontal: (Math.random() - 0.5) * gazeDeviation,
      gaze_vertical: (Math.random() - 0.5) * gazeDeviation,
      blink_rate: blinkRate,
      head_yaw: (Math.random() - 0.5) * 20,
      head_pitch: (Math.random() - 0.5) * 15,
      emotion: emotion,
      emotion_confidence: 0.75 + Math.random() * 0.2,
      emotion_probabilities: emotionProbs,
      frame_quality: 0.8 + Math.random() * 0.15,
      lighting_estimate: 0.6 + Math.random() * 0.3,
      sharpness: 0.7 + Math.random() * 0.2,
      total_latency_ms: 200 + Math.random() * 300,
      quality_warning: focusScore < 0.4 ? 'Low lighting detected' : null,
      low_confidence_warning: focusScore < 0.5 ? 1 : 0
    });
  }
  
  return metrics;
};

// Generate some fatigue events
const generateFatigueFlags = (sessionId) => {
  const flags = [];
  const startTime = new Date(Date.now() - 30 * 60 * 1000);
  
  // Add 3-4 fatigue events
  for (let i = 0; i < 3; i++) {
    const timestamp = new Date(startTime.getTime() + ((10 + i * 8) * 60 * 1000)); // At 10, 18, 26 minutes
    const fatigueLevel = 0.6 + Math.random() * 0.3;
    const blinkRate = 22 + Math.random() * 8;
    const eyeOpenness = 0.3 + Math.random() * 0.2;
    
    flags.push({
      session_id: sessionId,
      timestamp: timestamp.toISOString(),
      fatigue_level: fatigueLevel,
      blink_rate: blinkRate,
      eye_openness: eyeOpenness,
      data: JSON.stringify({ 
        trigger: 'high_blink_rate',
        fatigue_level: fatigueLevel,
        blink_rate: blinkRate,
        eye_openness: eyeOpenness,
        duration_seconds: 45 + Math.random() * 30 
      })
    });
  }
  
  return flags;
};

// Generate distraction events
const generateDistractionEvents = (sessionId) => {
  const events = [];
  const startTime = new Date(Date.now() - 30 * 60 * 1000);
  
  // Add 4-5 distraction events
  for (let i = 0; i < 4; i++) {
    const timestamp = new Date(startTime.getTime() + ((5 + i * 7) * 60 * 1000)); // At 5, 12, 19, 26 minutes
    const types = ['gaze_away', 'head_turn', 'phone_detected', 'prolonged_low_focus'];
    const distractionType = types[Math.floor(Math.random() * types.length)];
    const focusScore = 0.2 + Math.random() * 0.3;
    const gazeDeviation = 20 + Math.random() * 40;
    const durationSeconds = 15 + Math.random() * 45;
    
    events.push({
      session_id: sessionId,
      timestamp: timestamp.toISOString(),
      distraction_type: distractionType,
      focus_score: focusScore,
      gaze_deviation: gazeDeviation,
      duration_seconds: durationSeconds,
      data: JSON.stringify({ 
        distraction_type: distractionType,
        focus_score: focusScore,
        gaze_deviation: gazeDeviation,
        duration_seconds: durationSeconds,
        trigger: 'focus_threshold',
        recovered: Math.random() > 0.3 
      })
    });
  }
  
  return events;
};

async function seedData() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Failed to connect to database:', err);
      process.exit(1);
    }
  });

  console.log('🌱 Seeding facial metrics data...\n');

  // Get all sessions
  db.all('SELECT id, title FROM sessions ORDER BY id', async (err, sessions) => {
    if (err) {
      console.error('Failed to get sessions:', err);
      db.close();
      process.exit(1);
    }

    if (sessions.length === 0) {
      console.log('❌ No sessions found. Please create sessions first.');
      db.close();
      process.exit(1);
    }

    console.log(`Found ${sessions.length} session(s):\n`);
    sessions.forEach(s => console.log(`  - Session ${s.id}: ${s.title}`));
    console.log('');

    // Seed data for each session
    for (const session of sessions) {
      console.log(`📊 Generating metrics for Session ${session.id} (${session.title})...`);
      
      const facialMetrics = generateFacialMetrics(session.id, 50);
      const fatigueFlags = generateFatigueFlags(session.id);
      const distractionEvents = generateDistractionEvents(session.id);

      // Insert facial metrics
      const insertMetric = db.prepare(`
        INSERT INTO facial_metrics (
          session_id, frame_id, timestamp, face_detected, detection_confidence,
          focus_score, focus_confidence, gaze_horizontal, gaze_vertical,
          blink_rate, head_yaw, head_pitch, emotion, emotion_confidence,
          emotion_probabilities, frame_quality, lighting_estimate, sharpness,
          total_latency_ms, quality_warning, low_confidence_warning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const metric of facialMetrics) {
        insertMetric.run(
          metric.session_id, metric.frame_id, metric.timestamp, metric.face_detected,
          metric.detection_confidence, metric.focus_score, metric.focus_confidence,
          metric.gaze_horizontal, metric.gaze_vertical, metric.blink_rate,
          metric.head_yaw, metric.head_pitch, metric.emotion, metric.emotion_confidence,
          metric.emotion_probabilities, metric.frame_quality, metric.lighting_estimate,
          metric.sharpness, metric.total_latency_ms, metric.quality_warning,
          metric.low_confidence_warning
        );
      }
      insertMetric.finalize();

      // Insert fatigue flags
      const insertFatigue = db.prepare(`
        INSERT INTO session_fatigue_flags (session_id, timestamp, fatigue_level, blink_rate, eye_openness, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const flag of fatigueFlags) {
        insertFatigue.run(flag.session_id, flag.timestamp, flag.fatigue_level, flag.blink_rate, flag.eye_openness, flag.data);
      }
      insertFatigue.finalize();

      // Insert distraction events
      const insertDistraction = db.prepare(`
        INSERT INTO session_distraction_events (session_id, timestamp, distraction_type, focus_score, gaze_deviation, duration_seconds, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const event of distractionEvents) {
        insertDistraction.run(event.session_id, event.timestamp, event.distraction_type, event.focus_score, event.gaze_deviation, event.duration_seconds, event.data);
      }
      insertDistraction.finalize();

      console.log(`  ✓ Added ${facialMetrics.length} facial metrics`);
      console.log(`  ✓ Added ${fatigueFlags.length} fatigue flags`);
      console.log(`  ✓ Added ${distractionEvents.length} distraction events\n`);
    }

    // Wait for all operations to complete
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        process.exit(1);
      }
      console.log('✅ Seeding completed successfully!');
      console.log('\nYou can now view the facial metrics in the frontend.');
    });
  });
}

seedData();
