# Cognitive Coach Middleware Documentation

**Last Updated:** October 29, 2025  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Structure](#database-structure)
4. [API Endpoints](#api-endpoints)
5. [Setup Instructions](#setup-instructions)
6. [Authentication Flow](#authentication-flow)
7. [Data Flow](#data-flow)
8. [Seed Scripts](#seed-scripts)
9. [Testing](#testing)
10. [Known Limitations](#known-limitations)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)

---

## Overview

The Cognitive Coach middleware connects the React frontend with the SQLite database, providing REST API endpoints and WebSocket real-time communication for study session management and artifact generation.

### Tech Stack

**Backend:**
- Node.js + Express.js
- SQLite3 (auto-initialized on startup)
- Socket.IO (WebSocket server)
- bcrypt (password hashing)
- express-session (session management)
- multer (file uploads)

**Frontend:**
- React 18 + TypeScript
- Axios (HTTP client)
- Socket.IO Client
- React Router (navigation)

---

## Architecture

```
┌─────────────────┐
│  React Frontend │
│  (Port 5173)    │
└────────┬────────┘
         │
         │ HTTP/REST (Axios)
         │ WebSocket (Socket.IO)
         │
┌────────▼────────┐
│  Express Server │
│  (Port 3001)    │
├─────────────────┤
│  - Auth Routes  │
│  - Session Routes│
│  - Material Routes│
│  - WebSocket    │
└────────┬────────┘
         │
         │ SQL Queries
         │
┌────────▼────────┐
│  SQLite DB      │
│  (studycoach.db)│
├─────────────────┤
│  - users        │
│  - sessions     │
│  - study_artifacts│
│  - captured_frames│
└─────────────────┘
```

---

## Database Structure

### Auto-Initialization

The database is **automatically created** when the backend server starts if it doesn't exist. No manual setup required!

### Tables

#### **users**
```sql
id                INTEGER PRIMARY KEY
email             TEXT UNIQUE NOT NULL
password_hash     TEXT NOT NULL
first_name        TEXT
last_name         TEXT
created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### **sessions**
```sql
id                INTEGER PRIMARY KEY
user_id           INTEGER NOT NULL (FK → users.id)
title             TEXT NOT NULL
start_time        DATETIME
end_time          DATETIME
duration          INTEGER (seconds)
status            TEXT ('active', 'paused', 'completed')
focus_score       INTEGER
created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### **study_artifacts**
```sql
id                INTEGER PRIMARY KEY
session_id        INTEGER NOT NULL (FK → sessions.id)
type              TEXT ('flashcard', 'equation', 'multiple_choice', 'insights')
title             TEXT NOT NULL
content           TEXT (JSON string)
created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### **captured_frames**
```sql
id                INTEGER PRIMARY KEY
session_id        INTEGER NOT NULL (FK → sessions.id)
frame_type        TEXT ('webcam', 'screen')
file_path         TEXT NOT NULL
captured_at       DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### **session_fatigue_flags** (placeholder)
```sql
id                INTEGER PRIMARY KEY
session_id        INTEGER NOT NULL (FK → sessions.id)
timestamp         DATETIME DEFAULT CURRENT_TIMESTAMP
data              TEXT
```

#### **session_distraction_events** (placeholder)
```sql
id                INTEGER PRIMARY KEY
session_id        INTEGER NOT NULL (FK → sessions.id)
timestamp         DATETIME DEFAULT CURRENT_TIMESTAMP
data              TEXT
```

---

## API Endpoints

Base URL: `http://localhost:3001/api`

### Authentication Endpoints

#### **POST /auth/register**
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
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

#### **POST /auth/login**
Authenticate user and create session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
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
    "created_at": "2025-10-29T12:00:00.000Z"
  },
  "message": "Login successful"
}
```

#### **POST /auth/logout**
Destroy user session.

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

#### **GET /auth/me**
Get current logged-in user info.

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-10-29T12:00:00.000Z"
  }
}
```

---

### Session Endpoints

All session endpoints require authentication.

#### **GET /sessions**
Get all sessions for logged-in user.

**Response (200):**
```json
{
  "sessions": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Organic Chemistry Review",
      "start_time": "2025-10-29T14:30:00.000Z",
      "end_time": "2025-10-29T16:45:00.000Z",
      "duration": 8100,
      "status": "completed",
      "focus_score": 88,
      "created_at": "2025-10-29T14:30:00.000Z"
    }
  ]
}
```

#### **POST /sessions**
Create a new study session.

**Request:**
```json
{
  "title": "Physics Study Session"
}
```

**Response (201):**
```json
{
  "session": {
    "id": 5,
    "user_id": 1,
    "title": "Physics Study Session",
    "start_time": "2025-10-29T18:00:00.000Z",
    "status": "active",
    "created_at": "2025-10-29T18:00:00.000Z"
  },
  "message": "Session created successfully"
}
```

#### **GET /sessions/:id**
Get single session by ID.

**Response (200):**
```json
{
  "session": {
    "id": 1,
    "user_id": 1,
    "title": "Organic Chemistry Review",
    "start_time": "2025-10-29T14:30:00.000Z",
    "end_time": "2025-10-29T16:45:00.000Z",
    "duration": 8100,
    "status": "completed",
    "focus_score": 88
  }
}
```

#### **PUT /sessions/:id**
Update session (pause, resume, complete).

**Request:**
```json
{
  "status": "completed",
  "end_time": "2025-10-29T16:45:00.000Z",
  "duration": 8100,
  "focus_score": 88
}
```

**Response (200):**
```json
{
  "session": { /* updated session */ },
  "message": "Session updated successfully"
}
```

#### **DELETE /sessions/:id**
Delete session and all associated data.

**Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```

#### **POST /sessions/:id/frames**
Upload captured frame (webcam/screen).

**Request:** `multipart/form-data`
- `frame`: Image file (JPEG/PNG, max 10MB)
- `type`: "webcam" or "screen"

**Response (200):**
```json
{
  "message": "Frame uploaded successfully",
  "file": {
    "path": "/path/to/frame.jpg",
    "type": "webcam",
    "size": 125000
  }
}
```

#### **GET /sessions/:sessionId/materials**
Get all study artifacts for a session.

**Response (200):**
```json
{
  "materials": [
    {
      "id": 1,
      "session_id": 1,
      "type": "flashcard",
      "title": "What is the major product...",
      "content": "{\"id\":\"fc_001\",\"front\":\"...\",\"back\":\"...\"}",
      "created_at": "2025-10-29T14:45:00.000Z"
    }
  ]
}
```

---

### Material Endpoints

#### **POST /materials**
Create new study artifact (manual/testing).

**Request:**
```json
{
  "session_id": 1,
  "type": "flashcard",
  "title": "Alkene Reactions",
  "content": "{\"front\":\"Q?\",\"back\":\"A!\"}"
}
```

**Response (201):**
```json
{
  "material": { /* created material */ },
  "message": "Material created successfully"
}
```

#### **GET /materials/:id**
Get single material by ID.

#### **PUT /materials/:id**
Update material.

#### **DELETE /materials/:id**
Delete material.

---

### Health Check

#### **GET /health**
Check if backend is running.

**Response (200):**
```json
{
  "status": "ok",
  "message": "Cognitive Coach backend is running",
  "timestamp": "2025-10-29T18:00:00.000Z"
}
```

---

## Setup Instructions

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Backend Setup

```bash
# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file (optional - has defaults)
touch .env

# Add to .env (optional):
# PORT=3001
# SESSION_SECRET=your-secret-key-here
# FRONTEND_URL=http://localhost:5173
# NODE_ENV=development

# 4. Start the backend
npm start
```

**What happens on startup:**
1. ✅ Checks if database exists
2. ✅ Creates database with schema if missing
3. ✅ Connects to database
4. ✅ Loads routes
5. ✅ Starts Express server on port 3001
6. ✅ WebSocket server ready

### Frontend Setup

```bash
# 1. Navigate to frontend folder
cd cognitive-coach

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Authentication Flow

### Session-Based Authentication

The system uses **cookie-based sessions** (not JWT tokens).

**Flow:**
```
1. User submits login form
   ↓
2. Frontend: POST /api/auth/login
   ↓
3. Backend: Verify credentials
   ↓
4. Backend: Create session (req.session.userId)
   ↓
5. Backend: Send session cookie to browser
   ↓
6. Browser: Stores cookie automatically
   ↓
7. Future requests: Cookie sent automatically
   ↓
8. Backend: requireAuth middleware checks session
```

### Protected Routes

All routes except `/auth/login` and `/auth/register` require authentication.

**Middleware:**
```javascript
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next(); // Allow access
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

**Frontend:**
- `ProtectedRoute` component checks authentication
- Redirects to `/login` if not authenticated
- Uses `api.getCurrentUser()` to verify session

---

## Data Flow

### Dashboard Page

```
User loads Dashboard
  ↓
Frontend: useEffect(() => fetchSessions())
  ↓
Frontend: GET /api/sessions
  ↓
Backend: Query sessions WHERE user_id = ?
  ↓
Backend: Return sessions array
  ↓
Frontend: Display session cards
  ↓
User clicks session
  ↓
Frontend: navigate(`/session/${sessionId}`)
```

### Session Detail Page

```
User loads Session Detail
  ↓
Frontend: useEffect(() => fetchArtifacts())
  ↓
Frontend: GET /api/sessions/:sessionId/materials
  ↓
Backend: Verify session ownership
  ↓
Backend: Query study_artifacts WHERE session_id = ?
  ↓
Backend: Return artifacts array
  ↓
Frontend: Parse JSON content
  ↓
Frontend: Display artifacts by type
```

---

## Seed Scripts

### Location
All seed scripts are in the `database/` folder.

### Available Scripts

#### **1. Seed Users & Sessions**
```bash
cd database
npm run seed:users
```

**Creates:**
- 1 test user (test@example.com / password)
- 4 study sessions with realistic data

**Sessions:**
1. Organic Chemistry Review (2h 15m, Focus: 88%)
2. Calculus Problem Solving (1h 45m, Focus: 92%)
3. World History Reading (3h 20m, Focus: 76%)
4. Physics Lab Analysis (2h 50m, Focus: 94%)

#### **2. Seed Artifacts**
```bash
cd database
npm run seed:artifacts
```

**Creates (for Session 1 only):**
- 10 Flashcards (from `mockFlashcards.json`)
- 12 MCQ Questions (from `mockMCQ.json`)
- 5 Insights (from `mockInsights.json`)
- 3 Equations (static data)
- **Total: 30 artifacts**

#### **3. Seed Everything**
```bash
cd database
npm run seed:all
```

Runs both scripts in sequence.

### Artifact Content Structure

All artifacts store JSON in the `content` field:

**Flashcard:**
```json
{
  "id": "fc_001",
  "front": "What is the major product?",
  "back": "2-bromo-2-methylpropane",
  "tags": ["alkenes", "reactions"],
  "difficulty": 3,
  "hints": ["Consider Markovnikov's rule"]
}
```

**MCQ:**
```json
{
  "id": "mcq_001",
  "stem": "Which statement is correct?",
  "options": ["A", "B", "C", "D"],
  "answer_index": 1,
  "rationale": "Because...",
  "bloom_level": "apply"
}
```

**Equation:**
```json
{
  "title": "Markovnikov Addition",
  "equation": "R₂C=CH₂ + HX → R₂CH-CH₂X",
  "description": "Hydrogen adds to carbon with more hydrogens"
}
```

---

## Testing

### Backend Testing

#### **1. Test Health Endpoint**
```bash
curl http://localhost:3001/api/health
```

#### **2. Test All Routes**
```bash
cd backend
node testRoutes.js
```

**Expected output:**
```
✓ Health check passed
✓ Login endpoint exists
✓ Register endpoint exists
```

#### **3. Test Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### **4. Test Sessions**
```bash
# Requires authentication cookie
curl http://localhost:3001/api/sessions \
  -H "Cookie: cognitive_coach_session=..."
```

#### **5. Test Artifacts**
```bash
curl http://localhost:3001/api/sessions/1/materials \
  -H "Cookie: cognitive_coach_session=..."
```

### Frontend Testing

#### **1. Login Flow**
- Navigate to `http://localhost:5173/login`
- Enter: test@example.com / password
- Should redirect to dashboard
- Should see 4 sessions

#### **2. Session List**
- Dashboard should display all 4 sessions
- Each card shows: title, date, duration, focus score
- Click any session → navigate to detail page

#### **3. Artifacts Display**
- Click "Organic Chemistry Review"
- Should show 30 artifacts total
- Tabs: Flashcards (10), MCQ (12), Equations (3)
- Click artifact → opens popup (existing functionality)

#### **4. Logout**
- Click user avatar (initials in header)
- Profile popup opens
- Click "Sign Out"
- Redirects to login page
- Try accessing dashboard → redirected to login

#### **5. Create Account**
- Click "Create account" on login page
- Fill form with new credentials
- Submit → redirects to login
- Login with new account → works

---

## Known Limitations

### Current Scope
- ✅ Authentication working (login, logout, register)
- ✅ Sessions displayed from database
- ✅ Artifacts displayed from database
- ✅ User-specific data filtering
- ✅ Auto database initialization

### Not Yet Implemented
- ⏳ Artifact popup still uses mock data imports (needs update)
- ⏳ Session metadata in detail page (timeline, chat) still mocked
- ⏳ Only Session 1 has artifacts (others empty)
- ⏳ AI processing of frames (placeholder)
- ⏳ Real-time artifact generation during sessions
- ⏳ Focus tracking and analytics
- ⏳ Distraction/fatigue detection
- ⏳ Password reset
- ⏳ Email verification
- ⏳ Profile editing

### Database
- SQLite used (dev) → PostgreSQL recommended (production)
- Session storage in memory → Redis recommended (production)
- No migration system yet
- Frames stored locally → Cloud storage needed (production)

---

## Troubleshooting

### Backend Won't Start

**Issue:** Port 3001 already in use
```bash
# Find process using port 3001
lsof -i :3001          # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change port in .env
```

**Issue:** Database errors
```bash
# Delete and recreate database
rm database/studycoach.db
npm start  # Auto-creates new database
npm run seed:all  # Re-seed data
```

### Frontend Can't Connect

**Issue:** 404 on API calls
- Check backend is running on port 3001
- Check `api.ts` has correct BASE_URL
- Check CORS settings in server.js

**Issue:** CORS errors
- Verify `FRONTEND_URL` in backend .env
- Check `axios.defaults.withCredentials = true` in api.ts

### Authentication Issues

**Issue:** Login returns 404
- Check routes are loaded in correct order
- Verify auth routes registered after database init
- Check `testRoutes.js` output

**Issue:** Always redirected to login
- Check session cookie is being set
- Verify `withCredentials: true` in axios
- Check browser dev tools → Application → Cookies

### Artifacts Not Showing

**Issue:** Empty artifact list
- Verify artifacts seeded: `sqlite3 database/studycoach.db "SELECT COUNT(*) FROM study_artifacts;"`
- Check session ID matches (only session 1 has artifacts)
- Verify API endpoint: `curl http://localhost:3001/api/sessions/1/materials`
- Check browser console for errors

---

## Next Steps

### Immediate Priorities
1. Update ArtifactPopupController to use API data
2. Fetch real session metadata for detail page
3. Distribute artifacts across all sessions
4. Implement real-time artifact generation

### Short-term Goals
1. Frame processing pipeline
2. AI integration for content analysis
3. Focus tracking implementation
4. Timeline generation from session data
5. Real AI chat integration

### Long-term Goals
1. Production deployment (Heroku, AWS, DigitalOcean)
2. PostgreSQL migration
3. Redis session store
4. Cloud storage for frames (S3, GCS)
5. Advanced analytics dashboard
6. Mobile app integration
7. Multi-device sync

---

## File Structure Reference

```
webapp/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js           # DB connection + helpers
│   │   │   └── initDatabase.js       # Auto-initialization
│   │   ├── controllers/
│   │   │   ├── authController.js     # Auth logic
│   │   │   ├── sessionController.js  # Session CRUD
│   │   │   └── materialController.js # Artifact CRUD
│   │   ├── middleware/
│   │   │   └── auth.js               # requireAuth
│   │   ├── routes/
│   │   │   ├── auth.js               # Auth endpoints
│   │   │   ├── sessions.js           # Session + material endpoints
│   │   │   └── materials.js          # Material CRUD
│   │   └── server.js                 # Main entry point
│   ├── .env                          # Configuration
│   ├── package.json
│   └── testRoutes.js                 # Testing utility
├── cognitive-coach/
│   └── src/
│       ├── components/
│       │   ├── ArtifactPopup/
│       │   ├── ConfigurePopup/
│       │   ├── CurrentSession/
│       │   ├── DistractionTimeline/
│       │   ├── FocusAnalytics/
│       │   ├── FocusChart/
│       │   ├── ProfilePopup/
│       │   ├── StudyArtifacts/
│       │   └── ProtectedRoute.tsx
│       ├── pages/
│       │   ├── CreateAccount/
│       │   ├── Dashboard/
│       │   ├── Login/
│       │   └── SessionDetail/
│       ├── services/
│       │   ├── api.ts               # API client
│       │   └── socket.ts            # WebSocket client
│       ├── assets/data/             # Mock data files
│       ├── App.tsx
│       └── AppRouter.tsx
└── database/
    ├── schema.sql                   # Database schema
    ├── seedUsersAndSessions.js      # User/session seed
    ├── seedArtifacts.js             # Artifact seed
    ├── studycoach.db                # SQLite database
    └── package.json
```

---

## Support & Contact

For questions, issues, or contributions:
- Check this README first
- Review console logs (backend and frontend)
- Test API endpoints with curl
- Check database contents with sqlite3

---

**Last Updated:** October 29, 2025  
**Version:** 1.0  
**Status:** ✅ Core middleware functional, ready for development
