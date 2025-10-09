-- Study Coach Database Schema (Updated)

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
    frame_type TEXT CHECK(frame_type IN ('webcam', 'screen')),
    file_path TEXT NOT NULL,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Study artifacts table (renamed from study_materials)
CREATE TABLE IF NOT EXISTS study_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('flashcard', 'equation', 'multiple_choice', 'insights')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session fatigue flags (placeholder for future implementation)
CREATE TABLE IF NOT EXISTS session_fatigue_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session distraction events (placeholder for future implementation)
CREATE TABLE IF NOT EXISTS session_distraction_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Insert test user (password: 'password')
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name) 
VALUES (1, 'test@example.com', 'placeholder_hash', 'Test', 'User');

-- Insert test sessions
INSERT OR IGNORE INTO sessions (id, user_id, title, duration, focus_score, status) 
VALUES 
    (1, 1, 'Organic Chemistry Review', 8100, 88, 'completed'),
    (2, 1, 'Calculus Problem Solving', 6300, 92, 'completed'),
    (3, 1, 'World History Reading', 12000, 76, 'completed'),
    (4, 1, 'Physics Lab Analysis', 10200, 94, 'completed');