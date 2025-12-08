-- Study Coach Database Schema (Clean - No Test Data)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration INTEGER,
    status TEXT CHECK(status IN ('active', 'paused', 'completed')) DEFAULT 'completed',
    focus_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Captured frames table
CREATE TABLE IF NOT EXISTS captured_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    frame_type TEXT CHECK(frame_type IN ('webcam', 'screen', 'external')),
    file_path TEXT NOT NULL,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Study artifacts table
CREATE TABLE IF NOT EXISTS study_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('flashcard', 'equation', 'multiple_choice', 'insights')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Facial processing metrics (per-frame analysis results)
CREATE TABLE IF NOT EXISTS facial_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    frame_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Detection results
    face_detected INTEGER DEFAULT 0,
    detection_confidence REAL,

    -- Focus metrics
    focus_score REAL,
    focus_confidence REAL,
    gaze_horizontal REAL,
    gaze_vertical REAL,
    blink_rate REAL,
    head_yaw REAL,
    head_pitch REAL,

    -- Emotion metrics
    emotion TEXT,
    emotion_confidence REAL,
    emotion_probabilities TEXT, -- JSON string

    -- Quality metrics
    frame_quality REAL,
    lighting_estimate REAL,
    sharpness REAL,

    -- Performance metrics
    total_latency_ms REAL,

    -- Warnings
    quality_warning TEXT,
    low_confidence_warning INTEGER DEFAULT 0,

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session fatigue flags (triggered when fatigue detected)
CREATE TABLE IF NOT EXISTS session_fatigue_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    fatigue_level REAL,
    blink_rate REAL,
    eye_openness REAL,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session distraction events (triggered when focus drops)
CREATE TABLE IF NOT EXISTS session_distraction_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    distraction_type TEXT,
    focus_score REAL,
    gaze_deviation REAL,
    duration_seconds REAL,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Index for faster queries on session metrics
CREATE INDEX IF NOT EXISTS idx_facial_metrics_session ON facial_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_facial_metrics_timestamp ON facial_metrics(session_id, timestamp);