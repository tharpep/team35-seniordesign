# Cognitive Coach - Backend Integration Update

This update implements the backend server, database, authentication, frame capture storage, and real-time WebSocket communication for the Cognitive Coach web application.

---

## What's New

### Backend Server (Express + Node.js)
- RESTful API with authentication
- Session-based auth using express-session
- SQLite database integration
- File upload handling for captured frames
- Real-time WebSocket communication via Socket.IO

### Database (SQLite)
- User management with bcrypt password hashing
- Session tracking and metadata
- Study materials storage
- Captured frames metadata

### Frontend Updates
- Real API integration (replaced mock services)
- Protected routes requiring authentication
- Frame capture with flexible camera/screen support
- Real-time material updates via WebSocket
- Login/logout functionality

---

## Project Structure

```
webapp/
├── cognitive-coach/              # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfigurePopup/
│   │   │   ├── CurrentSession/   # Updated: Frame upload to backend
│   │   │   └── ProtectedRoute.tsx # New: Auth guard
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Login/            # Updated: Real authentication
│   │   │   └── SessionDetail/    # Updated: Real-time materials
│   │   ├── services/
│   │   │   ├── api.ts           # Updated: Real HTTP calls
│   │   │   └── socket.ts        # Updated: Real WebSocket
│   │   ├── App.tsx
│   │   └── AppRouter.tsx        # Updated: Protected routes
│   └── package.json
│
├── backend/                      # Backend Server (NEW)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # SQLite connection
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── sessionController.js
│   │   │   └── materialController.js
│   │   ├── middleware/
│   │   │   └── auth.js          # Session verification
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── sessions.js
│   │   │   └── materials.js
│   │   └── server.js            # Main Express server
│   ├── package.json
│   └── .env                     # Configuration
│
├── database/                     # Database (SQLite)
│   ├── schema.sql               # Database schema
│   ├── studycoach.db           # SQLite database file
│   ├── initDatabase.js         # DB initialization script
│   └── createTestUser.js       # Test user creation
│
├── uploads/                     # Frame Storage (NEW)
│   └── frames/
│       ├── session_1/
│       │   ├── webcam/
│       │   └── screen/
│       └── session_2/
│
├── scripts/                     # Utility Scripts
│   └── insertTestMaterials.js  # Test data insertion via API
│
└── mockups/                     # Design mockups
```

---

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- npm

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd cognitive-coach
npm install axios socket.io-client
```

**Database:**
```bash
cd database
npm install bcrypt sqlite3
```

**Scripts:**
```bash
cd scripts
npm install axios
```

### 2. Initialize Database

```bash
cd database
node initDatabase.js
```

This creates the database with:
- Test user: `test@example.com` / `password`
- 4 sample sessions
- Empty materials and frames tables

### 3. Configure Environment

Backend `.env` is already configured for local development:
- Port: 3001
- Database: `../database/studycoach.db`
- Frontend URL: `http://localhost:5173`

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd cognitive-coach
npm run dev
```

Access at: `http://localhost:5173`

---

## Features

### Authentication
- Session-based authentication with secure cookies
- Password hashing using bcrypt
- Protected API routes
- Login/logout functionality
- Automatic redirect to login for unauthorized access

### Session Management
- Create sessions when starting study
- Track session state (active/paused/completed)
- Store session metadata (duration, timestamps, metrics)
- Update sessions on pause/resume/stop

### Frame Capture
- Flexible capture: works with webcam, screen, or both
- Captures every 5 seconds during active session
- Uploads frames to backend via multipart/form-data
- Organized storage: `/uploads/frames/session_X/{webcam|screen}/`
- Metadata tracked in database

### Study Materials
- Store materials linked to sessions
- Support multiple types: flashcards, summaries, quizzes, equations
- API for CRUD operations
- Real-time updates via WebSocket

### Real-time Communication
- WebSocket connection via Socket.IO
- Join/leave session rooms
- Broadcast new materials to connected clients
- Automatic UI updates without refresh

---

## API Endpoints

### Authentication
```
POST   /api/auth/login       - Login user
POST   /api/auth/logout      - Logout user
POST   /api/auth/register    - Register new user
GET    /api/auth/me          - Get current user
```

### Sessions
```
GET    /api/sessions              - Get all sessions
POST   /api/sessions              - Create session
GET    /api/sessions/:id          - Get session by ID
PUT    /api/sessions/:id          - Update session
DELETE /api/sessions/:id          - Delete session
POST   /api/sessions/:id/frames   - Upload captured frame
```

### Materials
```
GET    /api/sessions/:sessionId/materials  - Get materials for session
POST   /api/materials                      - Create material
GET    /api/materials/:id                  - Get material by ID
PUT    /api/materials/:id                  - Update material
DELETE /api/materials/:id                  - Delete material
```

### Health Check
```
GET    /api/health            - Server health status
```

---

## Testing

### Test Login
1. Navigate to `http://localhost:5173`
2. Should redirect to `/login`
3. Login with:
   - Email: `test@example.com`
   - Password: `password`
4. Should redirect to Dashboard

### Test Session Creation & Frame Capture
1. Click "Start Session" on Dashboard
2. Allow camera and/or screen sharing
3. Watch console - frames captured every 5 seconds
4. Check backend logs for upload confirmations
5. Verify files in `uploads/frames/session_X/`
6. Stop session

### Test Real-time Materials
1. Navigate to Session 1: `http://localhost:5173/session/1`
2. Open browser console (F12)
3. Verify WebSocket connection messages
4. In separate terminal, run:
   ```bash
   cd scripts
   node insertTestMaterials.js
   ```
5. Materials should appear automatically on page

### Test Protected Routes
1. Logout (if logged in)
2. Try accessing `http://localhost:5173/session/1`
3. Should redirect to login page
4. After login, should access session detail

---

## Database Schema

### users
- `id` (PRIMARY KEY)
- `email` (UNIQUE)
- `password_hash`
- `initials`
- `created_at`

### sessions
- `id` (PRIMARY KEY)
- `user_id` (FOREIGN KEY → users)
- `title`
- `start_time`
- `end_time`
- `duration`
- `status` (active/paused/completed)
- `focus_score`
- `attention_score`
- `materials_count`
- `created_at`

### captured_frames
- `id` (PRIMARY KEY)
- `session_id` (FOREIGN KEY → sessions)
- `frame_type` (webcam/screen)
- `file_path`
- `captured_at`

### study_materials
- `id` (PRIMARY KEY)
- `session_id` (FOREIGN KEY → sessions)
- `type` (flashcard/summary/quiz/equation/question)
- `title`
- `content` (JSON or text)
- `created_at`

---

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify database path in `.env`
- Ensure all dependencies installed

### Login fails
- Verify test user exists in database
- Check password hash was created properly
- Run `node database/createTestUser.js` to recreate

### CORS errors
- Verify backend is running on port 3001
- Check `FRONTEND_URL` in backend `.env`
- Ensure frontend runs on port 5173

### Frames not uploading
- Check camera/screen permissions in browser
- Verify `uploads/frames/` directory exists
- Check backend logs for errors
- Ensure user is authenticated

### WebSocket not connecting
- Backend must be running
- Check browser console for connection errors
- Verify Socket.IO versions match

### Materials not appearing
- Verify you're on correct session page (1 or 2)
- Check WebSocket connection in console
- Ensure materials exist in database
- Run `insertTestMaterials.js` script

---

## Known Limitations

- SQLite is used for development (consider PostgreSQL/MySQL for production)
- Session storage in memory (consider Redis for production)
- No email verification for registration
- No password reset functionality
- No rate limiting on API endpoints
- Frames stored locally (consider cloud storage for production)
- No frame compression or optimization

---

## Next Steps / Future Work

### Backend Processing
- Implement AI processing of captured frames
- Generate study materials automatically from frames
- OCR for text extraction
- Object detection for material identification

### User Features
- User profile management
- Password reset via email
- Session analytics and insights
- Export session data
- Share sessions with others

### Production Readiness
- Deploy backend to cloud (Heroku, AWS, DigitalOcean)
- Set up PostgreSQL database
- Implement Redis for session storage
- Add rate limiting and request validation
- Set up HTTPS and proper CORS
- Cloud storage for frames (AWS S3, Google Cloud Storage)
- Error tracking (Sentry)
- Logging service

### Performance
- Frame compression before upload
- Lazy loading for materials
- Pagination for session lists
- Database indexing optimization

---

## Technologies Used

### Backend
- Node.js
- Express.js
- SQLite3
- Socket.IO
- bcrypt
- express-session
- multer
- cors

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios
- Socket.IO Client

---

## Development Team Notes

### Code Organization
- Controllers handle business logic
- Routes define endpoints
- Middleware handles authentication
- Services on frontend abstract API calls
- Components are self-contained

### Testing Credentials
- Email: `test@example.com`
- Password: `password`

### Important Files
- `backend/src/server.js` - Main server entry point
- `backend/.env` - Configuration (don't commit to git)
- `database/studycoach.db` - SQLite database (don't commit to git)
- `src/services/api.ts` - Frontend API client
- `src/services/socket.ts` - WebSocket client

### Git Ignore Recommendations
Add to `.gitignore`:
```
# Database
database/studycoach.db

# Uploads
uploads/frames/*

# Environment
backend/.env

# Dependencies
node_modules/
```

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review console logs (backend and frontend)
3. Verify database contents
4. Check environment variables
5. Ensure all dependencies are installed

---

## License

[Your License Here]

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Development