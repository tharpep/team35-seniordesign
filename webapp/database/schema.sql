-- Study Coach Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    initials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT,
    duration TEXT,
    focus_score INTEGER,
    attention INTEGER,
    materials_count INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('active', 'paused', 'completed')) DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Captured frames table
CREATE TABLE IF NOT EXISTS captured_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    frame_type TEXT CHECK(frame_type IN ('webcam', 'screen')),
    file_path TEXT NOT NULL,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Study materials table
CREATE TABLE IF NOT EXISTS study_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('flashcard', 'summary', 'quiz', 'equation', 'question')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Insert test user
INSERT OR IGNORE INTO users (id, email, password_hash, initials) 
VALUES (1, 'test@example.com', 'hashed_password', 'JD');

-- Insert test sessions
INSERT OR IGNORE INTO sessions (id, user_id, title, date, duration, focus_score, attention, materials_count, status) 
VALUES 
    (1, 1, 'Organic Chemistry Review', 'Today, 2:30 PM', '2h 15m', 88, 78, 34, 'completed'),
    (2, 1, 'Calculus Problem Solving', 'Yesterday, 7:45 PM', '1h 45m', 92, 89, 28, 'completed'),
    (3, 1, 'World History Reading', '2 days ago, 3:15 PM', '3h 20m', 76, 72, 45, 'completed'),
    (4, 1, 'Physics Lab Analysis', '3 days ago, 1:00 PM', '2h 50m', 94, 91, 31, 'completed');