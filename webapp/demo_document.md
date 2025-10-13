# Cognitive Coach - Middleware Subsystem Demo

## Overview

The middleware subsystem serves as the core integration layer for the Cognitive Coach application, managing data flow between the frontend interface and the database, while providing real-time updates through WebSocket connections. This subsystem handles user authentication, session management, frame capture, and study artifact delivery.

---

## System Components

### 1. Backend API (Express Server)

The REST API provides structured endpoints for client-server communication:

- **Authentication endpoints** (`/api/auth/*`) - Handle user registration, login, logout, and session validation
- **Session endpoints** (`/api/sessions/*`) - Manage study session lifecycle (create, read, update, delete) and frame uploads
- **Material endpoints** (`/api/materials/*`) - Retrieve and manage generated study artifacts

Each endpoint validates user authentication, enforces data ownership rules, and returns standardized JSON responses. The API architecture separates routing logic from business logic through controller pattern implementation.

### 2. Database Layer

SQLite database provides persistent storage with a helper function abstraction layer:

- **Helper functions** - `getOne()`, `getAll()`, and `runQuery()` wrap SQLite operations in Promise-based interfaces for cleaner async/await usage
- **Schema structure** - Users, sessions, captured frames, and study artifacts tables with foreign key relationships ensuring data integrity
- **Query optimization** - Indexed columns and prepared statements improve performance for frequent operations

The database connection is initialized at server startup and shared across all controllers through module exports.

### 3. WebSocket Server (Socket.IO)

Real-time bidirectional communication enables instant UI updates:

- **Room management** - Clients join session-specific rooms to receive targeted updates for their active session
- **Event broadcasting** - Server emits `material-created` events when new study artifacts are generated, `session-updated` events for status changes
- **Connection handling** - Automatic reconnection logic and graceful disconnection cleanup

WebSocket shares Express session data, ensuring authentication state is consistent across HTTP and WebSocket connections.

### 4. Frontend Integration Points

Two service modules handle server communication:

- **API Service** (`api.ts`) - Axios-based HTTP client configured with credentials support for session cookies. Provides typed methods for all backend endpoints with error handling.
- **Socket Service** (`socket.ts`) - Socket.IO client manages WebSocket connection lifecycle. Exposes subscription methods for real-time events with automatic room joining/leaving.

The frontend maintains authentication state through HTTP session cookies, which are automatically included in all API requests and WebSocket handshakes.

### 5. Middleware Components

**Authentication Middleware** - `requireAuth` function intercepts protected route requests, validates session existence, and attaches user ID to request object. Unauthorized requests receive 401 responses.

**File Upload Middleware** - Multer handles multipart form data for frame uploads. Configures destination folders based on session ID and frame type (webcam/screen), validates file types and sizes, and provides error handling for invalid uploads.

**Session Management** - Express-session creates server-side session storage with cookie-based client identification. Sessions persist user authentication state and expire after 24 hours of inactivity.

---

## Data Flow Examples

### Frame Upload Flow

User captures frame → Frontend sends multipart POST to `/api/sessions/:id/frames` → Auth middleware validates → Multer processes file → Controller saves to disk and inserts metadata into database → Response confirms success

### Material Generation Flow

Artifact generated → Database insert → WebSocket server emits `material-created` to session room → Connected clients receive event → Frontend automatically updates display without page refresh

### Authentication Flow

User submits credentials → Backend validates against database → Bcrypt compares password hash → Session created with user ID → Cookie sent to client → Subsequent requests include cookie for authentication

---

## Specifications & Testing

**SPEC-1: Frame Upload Time**

- **Requirement**: Frame must reach backend in <500ms after preparation
- **Testing**: Automated logging tracks upload duration from request receipt to controller completion. Log file shows timestamp, duration, and pass/fail status.

**SPEC-2: Metadata Persistence**

- **Requirement**: Frame metadata persisted in database ≤150ms
- **Testing**: Automated logging measures time from database write initiation to completion. Each frame upload generates a SPEC-2 log entry.

**SPEC-3: Material Display Time**

- **Requirement**: Study artifacts appear in frontend ≤1s after database insertion
- **Testing**: Script measures time from database insert to WebSocket emission. Log shows material ID, type, and total latency.

**SPEC-4: System Uptime**

- **Requirement**: >98% uptime during operation
- **Testing**: Not feasible to test in isolation without full system integration and extended monitoring period. Requires deployment with load balancing and health monitoring.

**SPEC-5: Upload Success Rate**

- **Requirement**: >95% of frame uploads succeed
- **Testing**: Automated logging tracks both successful and failed uploads. Summary calculates success percentage across all attempts.

**SPEC-6: Authentication Rejection**

- **Requirement**: 100% rejection of unauthenticated requests to protected endpoints
- **Testing**: Manual demonstration during demo - attempt login with incorrect credentials to show rejection. Auth middleware implementation ensures all protected routes require valid session.

**SPEC-7: Data Isolation**

- **Requirement**: Users can only access their own session data 100% of the time
- **Testing**: Automated logging records data access checks. Each session retrieval validates user ownership before returning data.

**SPEC-8: Login Time**

- **Requirement**: Login completes in ≤400ms
- **Testing**: Automated logging tracks authentication flow duration including password hashing and session creation.

**SPEC-9: Payload Validation**

- **Requirement**: Accept only JPEG/PNG frames up to 5MB
- **Testing**: Automated logging validates file type and size before processing. Invalid uploads are rejected and logged as failures.

### Testing Methodology

The demo logging system automatically records specification compliance during operation. When the backend server starts, a timestamped log file is created. Each relevant action (login, frame upload, material display, etc.) generates a log entry showing duration, result, and pass/fail status against the specification threshold. When the server stops, a summary section is automatically generated showing aggregate statistics for each specification including pass rates and average durations.

To observe testing results: Start the backend server, perform demo actions through the frontend, then stop the server and examine the generated log file in `backend/logs/`.

---

## Integration Plan

### 1. Database Schema Evolution

As the artifact generation and analysis teams develop their processing capabilities, the database schema must evolve to accommodate new data types:

- **Attention scores and metrics** - Add columns or tables to store frame-by-frame attention analysis results
- **Fatigue and distraction flags** - Extend placeholder tables with actual data structures defined by the analysis team
- **Artifact metadata** - Adjust `study_artifacts` table to include confidence scores, source frame references, or generation parameters

Schema changes require coordinated updates to controllers and API responses to ensure data consistency across the system.

### 2. Backend Processing API Design

The middleware must provide endpoints for the artifact generation service to integrate with:

- **Frame retrieval endpoint** - `GET /api/sessions/:id/frames` to allow processing service to fetch captured frames for a session, with filtering options by type (webcam/screen) and time range
- **Artifact submission endpoint** - `POST /api/sessions/:id/artifacts` to accept generated study materials, validate format, and store in database with automatic WebSocket notification to active clients
- **Metrics update endpoint** - `PUT /api/sessions/:id/metrics` to receive computed attention scores, focus metrics, and other analytics for display in session summaries

Frame data format must be determined (file paths vs. base64 encoding vs. binary streams) based on processing service requirements and performance constraints.

### 3. Frontend-Database Coordination

Work with frontend team to optimize data delivery:

- **Initial page load** - Determine which data should be fetched via HTTP GET requests (historical sessions, completed artifacts) versus streamed via WebSocket (real-time updates during active sessions)
- **Display requirements** - Define what level of detail each view needs to avoid over-fetching or under-fetching data
- **Update strategies** - Coordinate on when to refresh data (polling intervals, WebSocket triggers, user actions)

Balance between real-time responsiveness and database query load, potentially implementing caching layers for frequently accessed data.

### 4. Database Cleanup Strategy

Implement automated cleanup processes to manage storage growth:

- **Frame deletion** - After session completion and artifact generation, captured frames can be deleted since they've served their processing purpose
- **Session archival** - Define retention policies for old sessions (30 days? 90 days?) and implement automated archival or deletion
- **Storage limits** - Implement monitoring and alerts when database or file storage approaches capacity thresholds

Consider whether some data should be archived to cold storage versus permanently deleted, based on potential future use cases like re-processing or analytics.

### 5. Service Authentication & Security

To secure communication between the middleware and other subsystems (artifact generation service, analytics service):

- **JWT token-based authentication** - Issue JSON Web Tokens to trusted services, allowing them to authenticate API requests without user sessions
- **Service credentials** - Implement API keys or service accounts specifically for inter-service communication
- **Security benefits** - Prevent unauthorized services from pushing fake artifacts or accessing user data, rate-limit requests to prevent abuse, audit trail of which service performed which actions

This adds a security layer beyond user authentication, ensuring only legitimate components can interact with the middleware.

### 6. Future Discussion Topics

Several integration aspects require team coordination once all subsystems are further developed:

- **Error handling and retry logic** - Strategy for handling processing failures, network issues, or invalid data
- **Data format contracts** - Exact JSON schemas and field requirements for all data exchanges between services
- **Processing pipeline design** - Whether to process frames individually as uploaded or batch them for efficiency, real-time versus post-session processing tradeoffs

These topics should be addressed in team meetings as subsystem interfaces become more defined.

---

## Conclusion

The middleware subsystem provides a robust foundation for the Cognitive Coach application, handling authentication, data persistence, and real-time updates. The modular architecture allows for independent development of frontend and backend processing services while maintaining clean integration points. Automated specification logging demonstrates system performance and compliance with requirements, providing transparent validation of the middleware's capabilities during demonstrations and testing phases.
