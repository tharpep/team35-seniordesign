# Cognitive Coach - Backend Middleware

This document provides comprehensive documentation for the Cognitive Coach backend middleware, including data structures, API endpoints, setup instructions, and implementation details.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Structures](#data-structures)
4. [API Endpoints](#api-endpoints)
5. [Authentication Flow](#authentication-flow)
6. [WebSocket Implementation](#websocket-implementation)
7. [Setup Instructions](#setup-instructions)
8. [File Structure](#file-structure)
9. [Data Flow](#data-flow)
10. [Error Handling](#error-handling)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Middleware?

The middleware is a Node.js/Express backend server that:
- Handles authentication and session management
- Manages CRUD operations for sessions and study artifacts
- Processes and stores captured frames from webcam/screen
- Provides real-time updates via WebSocket (Socket.IO)
- Interfaces with SQLite database for data persistence

### Technology Stack

- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Database:** SQLite3
- **Authentication:** express-session + bcrypt
- **Real-time:** Socket.IO
- **File Upload:** Multer
- **CORS:** cors middleware

### Key Features

✅ Session-based authentication with secure cookies  
✅ RESTful API endpoints  
✅ Real-time WebSocket communication  
✅ File upload handling for captured frames  
✅ Password hashing with bcrypt  
✅ SQLite database with foreign key constraints  
✅ Error handling and validation  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - User Interface                                           │
│  - API calls via Axios                                      │
│  - WebSocket client (Socket.IO)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP/WebSocket
                  │
┌─────────────────┴───────────────────────────────────────────┐
│              Backend Middleware (Express)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Routes Layer                                         │   │
│  │  - auth.js, sessions.js, materials.js               │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                              │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Controllers Layer                                    │   │
│  │  - Business logic                                    │   │
│  │  - Data validation                                   │   │
│  │  - Response formatting                               │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                              │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Middleware Layer                                     │   │
│  │  - Authentication (session verification)             │   │
│  │  - File upload (Multer)                             │   │
│  │  - Error handling                                    │   │
│  └────────────┬────────────────────────────────────────┘   │
│               │                                              │
│  ┌────────────┴────────────────────────────────────────┐   │
│  │ Database Layer (SQLite)                              │   │
│  │  - Connection management                             │   │
│  │  - Query helpers                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ WebSocket Server (Socket.IO)                         │   │
│  │  - Real-time communication                           │   │
│  │  - Room management                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                  │
                  │ SQL Queries
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                SQLite Database                               │
│  - users, sessions, captured_frames, study_artifacts        │
│  - session_fatigue_flags, session_distraction_events       │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Database Schema

#### 1. Users Table

Stores user account information.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id` - Unique user identifier (auto-increment)
- `email` - User's email address (unique, required)
- `password_hash` - Bcrypt hashed password (required)
- `first_name` - User's first name (optional)
- `last_name` - User's last name (optional)
- `created_at` - Account creation timestamp

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE constraint on `email`

---

#### 2. Sessions Table

Stores study session information.

```sql
CREATE TABLE sessions (
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
```

**Fields:**
- `id` - Unique session identifier
- `user_id` - Foreign key to users table (CASCADE delete)
- `title` - Session title/name (required)
- `start_time` - Session start timestamp
- `end_time` - Session end timestamp
- `duration` - Session duration in seconds
- `status` - Current status: 'active', 'paused', 'completed'
- `focus_score` - Overall focus score (0-100) - *placeholder for future graph*
- `created_at` - Record creation timestamp

**Constraints:**
- CHECK constraint on `status` (must be one of: active, paused, completed)
- Foreign key constraint with CASCADE delete

**Notes:**
- `focus_score` is currently a single value; will be replaced with time-series data in future

---

#### 3. Captured Frames Table

Stores metadata for captured webcam/screen frames.

```sql
CREATE TABLE captured_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    frame_type TEXT CHECK(frame_type IN ('webcam', 'screen')),
    file_path TEXT NOT NULL,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**Fields:**
- `id` - Unique frame identifier
- `session_id` - Foreign key to sessions table
- `frame_type` - Type of capture: 'webcam' or 'screen'
- `file_path` - Relative path to stored frame file
- `captured_at` - Frame capture timestamp

**File Storage:**
- Actual image files stored in: `/uploads/frames/session_X/[webcam|screen]/`
- Format: `frame_TIMESTAMP.jpg`
- Database stores path, not binary data

---

#### 4. Study Artifacts Table

Stores AI-generated study materials (formerly study_materials).

```sql
CREATE TABLE study_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('flashcard', 'equation', 'multiple_choice', 'insights')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**Fields:**
- `id` - Unique artifact identifier
- `session_id` - Foreign key to sessions table
- `type` - Artifact type (constrained to 4 types)
- `title` - Artifact title/name
- `content` - Artifact content (JSON string or plain text)
- `created_at` - Creation timestamp

**Artifact Types:**
1. **flashcard** - Question/answer pairs
2. **equation** - Mathematical equations or formulas
3. **multiple_choice** - Multiple choice questions
4. **insights** - Study insights or analysis

**Content Format Examples:**

```javascript
// Flashcard
{
  "question": "What is the capital of France?",
  "answer": "Paris"
}

// Equation
{
  "formula": "E = mc²",
  "variables": {
    "E": "Energy",
    "m": "Mass",
    "c": "Speed of light"
  }
}

// Multiple Choice
{
  "question": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "correct": 1
}

// Insights
"Your focus was highest during the first 30 minutes. Consider scheduling difficult tasks early in study sessions."
```

---

#### 5. Session Fatigue Flags (Placeholder)

Future implementation for tracking user fatigue during sessions.

```sql
CREATE TABLE session_fatigue_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**Current Status:** Placeholder table with generic `data` field  
**Future Implementation:** Will store structured fatigue events with severity, duration, etc.

---

#### 6. Session Distraction Events (Placeholder)

Future implementation for tracking distraction events.

```sql
CREATE TABLE session_distraction_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**Current Status:** Placeholder table with generic `data` field  
**Future Implementation:** Will store structured distraction events with type, duration, etc.

---

### Entity Relationships

```
users (1) ────── (∞) sessions
                      │
                      ├────── (∞) captured_frames
                      ├────── (∞) study_artifacts
                      ├────── (∞) session_fatigue_flags
                      └────── (∞) session_distraction_events
```

**Key Points:**
- One user can have many sessions
- One session can have many frames, artifacts, flags, events
- All child records CASCADE delete with parent session
- All sessions CASCADE delete with parent user

---

## API Endpoints

### Base URL

```
http://localhost:3001/api
```

### Authentication Endpoints

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "Registration successful"
}
```

**Notes:**
- Password is hashed using bcrypt (10 rounds)
- User is automatically logged in after registration (session created)
- Email must be unique

---

#### POST /api/auth/login

Login with existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-01-15T10:00:00.000Z"
  },
  "message": "Login successful"
}
```

**Notes:**
- Session cookie is set in response
- Cookie name: `cognitive_coach_session` (configurable)
- Cookie is httpOnly and secure (in production)

---

#### POST /api/auth/logout

Logout current user.

**Request:** No body required (uses session cookie)

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Notes:**
- Destroys server-side session
- Clears session cookie

---

#### GET /api/auth/me

Get current logged-in user information.

**Request:** No body required (uses session cookie)

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**Requires:** Authentication (protected route)

---

### Session Endpoints

#### GET /api/sessions

Get all sessions for the logged-in user.

**Request:** No body required

**Response (200):**
```json
{
  "sessions": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Organic Chemistry Review",
      "start_time": "2025-01-15T14:30:00.000Z",
      "end_time": "2025-01-15T16:45:00.000Z",
      "duration": 8100,
      "status": "completed",
      "focus_score": 88,
      "created_at": "2025-01-15T14:30:00.000Z"
    }
  ]
}
```

**Requires:** Authentication

---

#### POST /api/sessions

Create a new session.

**Request Body:**
```json
{
  "title": "Study Session - Math"
}
```

**Response (201):**
```json
{
  "session": {
    "id": 5,
    "user_id": 1,
    "title": "Study Session - Math",
    "start_time": "2025-01-15T15:00:00.000Z",
    "status": "active",
    "created_at": "2025-01-15T15:00:00.000Z"
  },
  "message": "Session created successfully"
}
```

**Notes:**
- `start_time` is automatically set to current time
- Status defaults to 'active'
- WebSocket event `session-created` is emitted

**Requires:** Authentication

---

#### GET /api/sessions/:id

Get a specific session by ID.

**Parameters:**
- `id` - Session ID (integer)

**Response (200):**
```json
{
  "session": {
    "id": 1,
    "user_id": 1,
    "title": "Organic Chemistry Review",
    "start_time": "2025-01-15T14:30:00.000Z",
    "end_time": "2025-01-15T16:45:00.000Z",
    "duration": 8100,
    "status": "completed",
    "focus_score": 88,
    "created_at": "2025-01-15T14:30:00.000Z"
  }
}
```

**Requires:** Authentication (must own the session)

---

#### PUT /api/sessions/:id

Update a session (pause, resume, stop, change title, etc.).

**Parameters:**
- `id` - Session ID (integer)

**Request Body:**
```json
{
  "status": "completed",
  "end_time": "2025-01-15T16:45:00.000Z",
  "duration": 8100,
  "focus_score": 88
}
```

**Allowed Fields:**
- `status` - 'active', 'paused', 'completed'
- `title` - Session title
- `end_time` - ISO datetime string
- `duration` - Duration in seconds
- `focus_score` - Integer 0-100

**Response (200):**
```json
{
  "session": {
    "id": 1,
    "status": "completed",
    "end_time": "2025-01-15T16:45:00.000Z",
    "duration": 8100
  },
  "message": "Session updated successfully"
}
```

**Notes:**
- WebSocket event `session-updated` is emitted to room `session-{id}`

**Requires:** Authentication (must own the session)

---

#### DELETE /api/sessions/:id

Delete a session and all associated data.

**Parameters:**
- `id` - Session ID (integer)

**Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```

**Notes:**
- CASCADE deletes all captured_frames, study_artifacts, etc.
- Attempts to delete associated frame files from filesystem

**Requires:** Authentication (must own the session)

---

#### POST /api/sessions/:id/frames

Upload a captured frame (webcam or screen).

**Parameters:**
- `id` - Session ID (integer)

**Request:** `multipart/form-data`
- `frame` - Image file (JPEG)
- `type` - Frame type: 'webcam' or 'screen'

**Response (200):**
```json
{
  "message": "Frame uploaded successfully",
  "file": {
    "path": "uploads/frames/session_1/webcam/frame_1234567890.jpg",
    "type": "webcam",
    "size": 45678
  }
}
```

**File Storage:**
- Path: `/uploads/frames/session_{id}/{type}/frame_{timestamp}.jpg`
- Metadata saved to `captured_frames` table
- Max file size: 10MB (configurable)

**Requires:** Authentication (must own the session)

---

### Material/Artifact Endpoints

#### GET /api/sessions/:sessionId/materials

Get all study artifacts for a specific session.

**Parameters:**
- `sessionId` - Session ID (integer)

**Response (200):**
```json
{
  "materials": [
    {
      "id": 1,
      "session_id": 1,
      "type": "flashcard",
      "title": "Alkene Reactions",
      "content": "{\"question\":\"What is...\",\"answer\":\"...\"}",
      "created_at": "2025-01-15T16:00:00.000Z"
    }
  ]
}
```

**Requires:** Authentication (must own the session)

---

#### POST /api/materials

Create a new study artifact.

**Request Body:**
```json
{
  "session_id": 1,
  "type": "flashcard",
  "title": "Test Flashcard",
  "content": "{\"question\":\"Test?\",\"answer\":\"Yes!\"}"
}
```

**Allowed Types:**
- `flashcard`
- `equation`
- `multiple_choice`
- `insights`

**Response (201):**
```json
{
  "material": {
    "id": 10,
    "session_id": 1,
    "type": "flashcard",
    "title": "Test Flashcard",
    "content": "{...}",
    "created_at": "2025-01-15T16:30:00.000Z"
  },
  "message": "Material created successfully"
}
```

**Notes:**
- WebSocket event `material-created` is emitted to room `session-{session_id}`
- Frontend will receive real-time update

**Requires:** Authentication (must own the session)

---

#### GET /api/materials/:id

Get a specific artifact by ID.

**Parameters:**
- `id` - Material ID (integer)

**Response (200):**
```json
{
  "material": {
    "id": 1,
    "session_id": 1,
    "type": "flashcard",
    "title": "Alkene Reactions",
    "content": "{...}",
    "created_at": "2025-01-15T16:00:00.000Z"
  }
}
```

**Requires:** Authentication (must own the session)

---

#### PUT /api/materials/:id

Update an existing artifact.

**Parameters:**
- `id` - Material ID (integer)

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "{\"question\":\"Updated?\",\"answer\":\"Yes!\"}"
}
```

**Allowed Fields:**
- `type`
- `title`
- `content`

**Response (200):**
```json
{
  "material": {
    "id": 1,
    "title": "Updated Title",
    "content": "{...}"
  },
  "message": "Material updated successfully"
}
```

**Requires:** Authentication (must own the session)

---

#### DELETE /api/materials/:id

Delete an artifact.

**Parameters:**
- `id` - Material ID (integer)

**Response (200):**
```json
{
  "message": "Material deleted successfully"
}
```

**Requires:** Authentication (must own the session)

---

### Health Check

#### GET /api/health

Check if server is running.

**Response (200):**
```json
{
  "status": "ok",
  "message": "Cognitive Coach backend is running",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

**Requires:** No authentication

---

## Authentication Flow

### Session-Based Authentication

The backend uses express-session for authentication with the following flow:

```
1. User Registration/Login
   ↓
2. Server creates session
   ↓
3. Session ID stored in cookie (httpOnly, secure)
   ↓
4. Client sends cookie with each request
   ↓
5. Server verifies session ID
   ↓
6. If valid → Process request
   If invalid → Return 401 Unauthorized
```

### Session Configuration

```javascript
{
  secret: process.env.SESSION_SECRET,
  name: 'cognitive_coach_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,  // No JavaScript access
    maxAge: 86400000 // 24 hours
  }
}
```

### Protected Routes

All routes except `/api/auth/login` and `/api/auth/register` require authentication.

**Middleware:**
```javascript
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next(); // User authenticated
  } else {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please log in to access this resource'
    });
  }
}
```

### Password Security

- **Hashing:** bcrypt with 10 rounds
- **Salt:** Automatically generated per password
- **Storage:** Only hash stored, never plain password

```javascript
const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);
const isValid = await bcrypt.compare(password, hash);
```

---

## WebSocket Implementation

### Socket.IO Configuration

**Server Setup:**
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
```

### Room Management

Sessions use rooms for targeted message broadcasting:

```
Client connects → Joins room "session-{id}" → Receives updates for that session only
```

### Events

#### Client → Server

**join-session**
```javascript
socket.emit('join-session', { sessionId: 1 });
```
Client joins room to receive updates for session 1.

**leave-session**
```javascript
socket.emit('leave-session', { sessionId: 1 });
```
Client leaves room.

#### Server → Client

**material-created**
```javascript
io.to('session-1').emit('material-created', {
  id: 10,
  session_id: 1,
  type: 'flashcard',
  title: 'New Flashcard',
  content: '{...}',
  created_at: '2025-01-15T16:30:00.000Z'
});
```
Broadcast when new material is created.

**session-updated**
```javascript
io.to('session-1').emit('session-updated', {
  sessionId: 1,
  updates: {
    status: 'completed',
    duration: 8100
  }
});
```
Broadcast when session is updated.

### Connection Handling

```javascript
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (data) => {
    socket.join(`session-${data.sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

---

## Setup Instructions

### Prerequisites

- Node.js v16+
- npm
- SQLite3 (or use Node.js sqlite3 package)

### Installation

```bash
# Navigate to backend directory
cd webapp/backend

# Install dependencies
npm install
```

**Dependencies Installed:**
- express
- express-session
- sqlite3
- bcrypt
- cors
- dotenv
- socket.io
- multer
- body-parser

### Configuration

Create `.env` file in `/backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_PATH=../database/studycoach.db

# Session Configuration
SESSION_SECRET=your-secret-key-change-this-in-production
SESSION_NAME=cognitive_coach_session
SESSION_MAX_AGE=86400000

# File Upload Configuration
UPLOAD_PATH=../uploads/frames
MAX_FILE_SIZE=10485760

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Database Initialization

```bash
# Navigate to database directory
cd ../database

# Initialize database
node initDatabase.js
```

### Starting the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

**Expected Output:**
```
=================================
🚀 Cognitive Coach Backend Server
=================================
✓ Server running on port 3001
✓ API: http://localhost:3001/api
✓ WebSocket: ws://localhost:3001
✓ Environment: development
✓ Connected to SQLite database
=================================
```

---

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js           # SQLite connection & helpers
│   │
│   ├── controllers/
│   │   ├── authController.js     # Auth logic (login, register, etc.)
│   │   ├── sessionController.js  # Session CRUD logic
│   │   └── materialController.js # Material CRUD logic
│   │
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   │
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints
│   │   ├── sessions.js           # Session endpoints
│   │   └── materials.js          # Material endpoints
│   │
│   └── server.js                 # Main server file
│
├── package.json                  # Dependencies & scripts
├── .env                          # Environment variables (not in git)
└── README.md                     # This file
```

### Key Files

**src/server.js**
- Main entry point
- Express app setup
- Middleware configuration
- Route mounting
- WebSocket server initialization
- Error handling

**src/config/database.js**
- SQLite connection
- Helper functions (runQuery, getOne, getAll)
- Database path configuration

**src/controllers/*.js**
- Business logic for each feature
- Data validation
- Database queries
- Response formatting
- WebSocket event emission

**src/routes/*.js**
- Endpoint definitions
- Route parameters
- Middleware application (auth, file upload)
- Controller function mapping

**src/middleware/auth.js**
- Session verification
- Protected route wrapper
- Authorization checks

---

## Data Flow

### Example: Creating a Session

```
1. Frontend: User clicks "Start Session"
   ↓
2. Frontend: POST /api/sessions with title
   ↓
3. Backend: sessionController.createSession()
   ↓
4. Backend: Verify user authentication
   ↓
5. Backend: Insert into sessions table
   ↓
6. Backend: Emit WebSocket event 'session-created'
   ↓
7. Backend: Return session object
   ↓
8. Frontend: Receive session, store session ID
   ↓
9. Frontend: Start capturing frames
   ↓
10. Every 5 seconds: POST /api/sessions/:id/frames
```

### Example: Real-time Material Update

```
1. Backend Process: Generates new material
   ↓
2. Backend: POST /api/materials (or direct DB insert)
   ↓
3. Backend: materialController.createMaterial()
   ↓
4. Backend: Insert into study_artifacts table
   ↓
5. Backend: io.to(`session-${id}`).emit('material-created', material)
   ↓
6. Frontend: WebSocket listener receives event
   ↓
7. Frontend: Updates materials array in state
   ↓
8. Frontend: React re-renders with new material
```

---

## Error Handling

### HTTP Error Responses

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not allowed to access resource)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

### Common Errors

**Authentication Required (401)**
```json
{
  "error": "Unauthorized",
  "message": "Please log in to access this resource"
}
```

**Resource Not Found (404)**
```json
{
  "error": "Not found",
  "message": "Session not found"
}
```

**Validation Error (400)**
```json
{
  "error": "Missing fields",
  "message": "session_id, type, title, and content are required"
}
```

**Duplicate Email (409)**
```json
{
  "error": "User exists",
  "message": "An account with this email already exists"
}
```

### Server Error Handling

```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});
```

---

## Testing

### Manual Testing with cURL

**Register User:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","first_name":"Test","last_name":"User"}' \
  -c cookies.txt
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt
```

**Create Session:**
```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Session"}' \
  -b cookies.txt
```

**Get Materials:**
```bash
curl http://localhost:3001/api/sessions/1/materials \
  -b cookies.txt
```

### Testing WebSocket

Use a WebSocket client or browser console:

```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('join-session', { sessionId: 1 });
});

socket.on('material-created', (material) => {
  console.log('New material:', material);
});
```

### Database Inspection

```bash
cd ../database
node -e "const sqlite3 = require('sqlite3').verbose(); const db = new sqlite3.Database('./studycoach.db'); db.all('SELECT * FROM users', (err, rows) => { console.table(rows); db.close(); });"
```

---

## Troubleshooting

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

Or change `PORT` in `.env`

---

### Issue: Database Not Found

**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:**
```bash
# Ensure database exists
cd ../database
node initDatabase.js

# Check DB_PATH in backend/.env
# Should be: DB_PATH=../database/studycoach.db
```

---

### Issue: CORS Errors

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
- Check `FRONTEND_URL` in `.env` matches frontend URL
- Ensure `withCredentials: true` in frontend axios config
- Restart backend after changing `.env`

---

### Issue: Session Not Persisting

**Symptoms:** User gets logged out on page refresh

**Solution:**
- Check `SESSION_SECRET` is set in `.env`
- Verify `withCredentials: true` in frontend
- Check cookie settings in browser DevTools
- Ensure frontend and backend on same domain (localhost)

---

### Issue: File Upload Fails

**Error:** `LIMIT_FILE_SIZE` or upload errors

**Solution:**
- Check `MAX_FILE_SIZE` in `.env`
- Ensure `uploads/frames/` directory exists
- Verify file is under size limit (default 10MB)
- Check multer configuration in `sessions.js` route

---

### Issue: WebSocket Not Connecting

**Symptoms:** No real-time updates

**Solution:**
- Check backend console for Socket.IO connection logs
- Verify Socket.IO client version matches server version
- Check browser console for connection errors
- Ensure `join-session` event is emitted by client
- Check CORS configuration for WebSocket

---

### Debug Mode

Enable verbose logging:

```javascript
// In src/server.js, add:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// For WebSocket:
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.onAny((event, ...args) => {
    console.log(`Event: ${event}`, args);
  });
});
```

---

## Performance Considerations

### Database Optimization

- Add indexes for frequently queried fields
- Use prepared statements (already implemented)
- Consider connection pooling for high traffic
- Regular VACUUM for SQLite maintenance

### File Storage

- Consider cloud storage (S3, GCS) for production
- Implement cleanup for old sessions
- Add file compression for frames
- Set up CDN for frame delivery

### Session Management

- Consider Redis for session storage in production
- Implement session cleanup for expired sessions
- Add rate limiting to prevent abuse

### WebSocket Scaling

- For multiple server instances, use Redis adapter
- Implement connection limits
- Add heartbeat for connection health

---

## Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt
- httpOnly cookies
- CORS configuration
- Session-based authentication
- SQL injection prevention (parameterized queries)
- File type validation
- File size limits

⚠️ **TODO for Production:**
- HTTPS enforcement
- Rate limiting
- Input sanitization
- CSRF protection
- Content Security Policy headers
- Helmet.js for security headers
- Regular security audits
- Environment variable validation

---

## Future Improvements

### Planned Features

1. **Focus Score Graph**
   - Replace single value with time-series data
   - New table: `session_focus_data`
   - Track focus changes throughout session

2. **Fatigue Flags Timeline**
   - Implement structured fatigue tracking
   - Severity levels, durations
   - Visualization support

3. **Distraction Events**
   - Track distraction types and patterns
   - Integration with AI analysis
   - Timeline visualization

4. **AI Processing Pipeline**
   - Process captured frames with AI
   - Auto-generate study artifacts
   - Real-time analysis and insights

### Technical Debt

- Add comprehensive test suite (Jest)
- Implement logging framework (Winston)
- Add API documentation (Swagger)
- Set up CI/CD pipeline
- Add database migrations system
- Implement proper error tracking (Sentry)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review console logs (backend and frontend)
3. Inspect database contents
4. Verify environment variables
5. Check API response in browser Network tab

---

**Version:** 2.0  
**Last Updated:** January 2025  
**Maintained By:** Team 35 - Senior Design