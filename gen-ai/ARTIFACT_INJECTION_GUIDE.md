# Real-Time Artifact Injection System

This system enables the gen-ai subsystem to inject generated artifacts (flashcards, MCQs, insights) directly into the webapp database in real-time.

---

## 🚀 Quick Start

### Prerequisites
- Node.js installed (for backend)
- Python 3.8+ installed (for gen-ai)
- Backend and gen-ai set up

### Step 1: Install Dependencies

**Backend:**
```powershell
cd webapp/backend
npm install
```

**Gen-AI:**
```powershell
cd gen-ai
pip install -r requirements.txt
```

### Step 2: Start the Backend Server

```powershell
cd webapp/backend
npm start
```

You should see:
```
✓ Connected to SQLite database
Server is running on http://localhost:3001
```

**Keep this terminal open!**

### Step 3: Test the Injection

Open a **new PowerShell terminal**:

```powershell
cd gen-ai
python test_injection.py
```

This will inject 3 test artifacts and show results. Expected output:
```
✅ All tests passed!
```

### Step 4: Verify in Database

```powershell
cd webapp/database
sqlite3 studycoach.db "SELECT id, session_id, type, title FROM study_artifacts ORDER BY created_at DESC LIMIT 3;"
```

---

## 🏗️ Architecture

```
┌─────────────────────┐
│   Gen-AI (Python)   │
│   RAG + Generators  │
└──────────┬──────────┘
           │
           │ HTTP POST
           │ /api/materials/inject
           │
┌──────────▼──────────┐
│  Backend (Node.js)  │
│  - Validates        │
│  - Stores in DB     │
│  - Emits Socket.IO  │
└──────────┬──────────┘
           │
           ├─────────────┐
           │             │
┌──────────▼────┐   ┌───▼──────────┐
│  SQLite DB    │   │  Frontend    │
│  (artifacts)  │   │  (Real-time) │
└───────────────┘   └──────────────┘
```

### Data Flow
1. **Gen-AI** generates artifact (JSON format)
2. **Python client** sends HTTP POST to backend API
3. **Backend** validates, stores in database, broadcasts via Socket.IO
4. **Frontend** (if connected) receives real-time update

---

## 📁 Files Added/Modified

### Backend (webapp/backend)

**`src/controllers/materialController.js`**
- Added `injectArtifact()` function
- Handles artifact reception from gen-ai
- Auto-selects most recent session if not specified
- Maps artifact types to database schema
- Broadcasts Socket.IO events

**`src/routes/materials.js`**
- Added `POST /api/materials/inject` endpoint
- No authentication required (internal service call)

### Gen-AI (gen-ai/src)

**`artifact_creation/artifact_injector.py`** (NEW)
- `ArtifactInjector` class for HTTP communication
- `inject_artifact()` - Send single artifact
- `inject_multiple()` - Batch injection
- `health_check()` - Verify backend availability

**`demos/injection_demo.py`** (NEW)
- End-to-end demonstration
- Generates all 3 artifact types
- Injects into webapp database

**`test_injection.py`** (NEW)
- Quick test without RAG setup
- Uses pre-made test artifacts
- Validates entire pipeline

**`artifact_creation/__init__.py`**
- Added exports for `ArtifactInjector` and `inject_artifact_simple`

**`requirements.txt`**
- Added `requests>=2.31.0` for HTTP calls

---

## 💻 Usage Examples

### Quick Test (No RAG Required)
```powershell
cd gen-ai
python test_injection.py
```

### Full Demo (With RAG)
```powershell
cd gen-ai
python src/demos/injection_demo.py

# With specific session
python src/demos/injection_demo.py --session-id 5
```

### Programmatic Usage

```python
from src.rag.rag_setup import BasicRAG
from src.artifact_creation.generators import FlashcardGenerator
from src.artifact_creation.artifact_injector import ArtifactInjector

# Initialize
rag = BasicRAG()
generator = FlashcardGenerator(rag)
injector = ArtifactInjector()

# Generate artifact
artifact = generator.generate("Python decorators", num_items=1)

# Inject to database (uses most recent session)
result = injector.inject_artifact(artifact)
print(f"Artifact injected with ID: {result['material']['id']}")

# Or inject to specific session
result = injector.inject_artifact(artifact, session_id=42)
```

---

## 📊 API Specification

### POST /api/materials/inject

**Endpoint:** `http://localhost:3001/api/materials/inject`

**Authentication:** None required (internal service)

**Request Body:**
```json
{
  "artifact": {
    "artifact_type": "flashcards|mcq|insights",
    "version": "1.0",
    "cards|questions|insights": [...],
    "provenance": {...},
    "metrics": {...}
  },
  "session_id": 123  // Optional, uses most recent if omitted
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "material": {
    "id": 45,
    "session_id": 123,
    "type": "flashcard",
    "title": "What is Python?",
    "content": "{...}",
    "created_at": "2025-11-14T10:30:00.000Z"
  },
  "message": "Artifact injected successfully"
}
```

**Response (Error - 400/404/500):**
```json
{
  "error": "Error type",
  "message": "Error description",
  "details": "Additional info"
}
```

---

## 🗄️ Database Schema

Artifacts are stored in the `study_artifacts` table:

```sql
CREATE TABLE study_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('flashcard', 'equation', 'multiple_choice', 'insights')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,  -- JSON string of full artifact
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

### Type Mapping

| Gen-AI Type | Database Type   |
|-------------|-----------------|
| flashcards  | flashcard       |
| mcq         | multiple_choice |
| insights    | insights        |
| equation    | equation        |

---

## 🔄 Real-Time Updates

When an artifact is injected:

1. Backend stores in database
2. Backend emits Socket.IO event: `material-created`
3. Event is broadcast to room: `session-${sessionId}`
4. Connected frontend clients receive update automatically

**Socket.IO Event:**
```javascript
socket.on('material-created', (material) => {
  console.log('New artifact:', material);
  // Update UI with new artifact
});
```

---

## 🎯 Integration with Image Processing

When your image processing is ready, integrate like this:

```python
# After processing captured frame and extracting text:

from src.rag.document_ingester import DocumentIngester
from src.artifact_creation.generators import FlashcardGenerator
from src.artifact_creation.artifact_injector import ArtifactInjector

# 1. Ingest extracted text into RAG system
ingester = DocumentIngester(rag)
ingester.ingest_text(extracted_text)

# 2. Generate artifact based on content
generator = FlashcardGenerator(rag)
artifact = generator.generate(topic)

# 3. Inject to database with session_id from frame capture
injector = ArtifactInjector()
result = injector.inject_artifact(
    artifact, 
    session_id=captured_frame.session_id
)

print(f"✓ Artifact injected with ID: {result['material']['id']}")
```

---

## 🐛 Troubleshooting

### "Failed to connect to backend"
- Ensure backend server is running: `cd webapp/backend && npm start`
- Check backend URL is correct (default: `http://localhost:3001`)
- Verify firewall isn't blocking port 3001

### "No sessions found"
Create a test session:
```powershell
cd webapp/database
sqlite3 studycoach.db
INSERT INTO users (email, password_hash, first_name, last_name) VALUES ('test@test.com', 'hash', 'Test', 'User');
INSERT INTO sessions (user_id, title, status) VALUES (1, 'Test Session', 'completed');
.exit
```

### "Module 'requests' not found"
```powershell
cd gen-ai
pip install -r requirements.txt
```

### Socket.IO events not working
- Check frontend is connected to Socket.IO
- Verify frontend has joined the session room: `socket.join('session-${sessionId}')`
- Check browser console for Socket.IO connection

---

## 🧪 Complete Testing Workflow

**Terminal 1 (Backend):**
```powershell
cd webapp/backend
npm start
# ✓ Server running on http://localhost:3001
```

**Terminal 2 (Gen-AI Test):**
```powershell
cd gen-ai
python test_injection.py
# ✓ All tests passed!
```

**Terminal 3 (Verify Database):**
```powershell
cd webapp/database
sqlite3 studycoach.db "SELECT * FROM study_artifacts ORDER BY created_at DESC LIMIT 3;"
```

---

## 📈 Integration Flow Diagram

```
PHASE 1: CONTENT CAPTURE (Your System - To Be Implemented)
───────────────────────────────────────────────────────────
📷 Camera/Screen → 🖼️ Frame Storage → 🤖 Image Processing → 📄 Text


PHASE 2: ARTIFACT GENERATION (✅ Implemented)
─────────────────────────────────────────────
📄 Text → Document Ingester → 🗄️ Vector DB → RAG Retriever
                                                    │
                                                    ▼
User Query → Context Retrieval → LLM → JSON Artifacts
                                            │
                                            ▼
                    ┌───────────────────────────────────┐
                    │  Flashcards, MCQs, Insights       │
                    └───────────────────────────────────┘


PHASE 3: INJECTION TO WEBAPP (✅ Implemented)
──────────────────────────────────────────────
Python ArtifactInjector
        │
        │ POST /api/materials/inject
        ▼
Node.js Backend
        │
        ├─► SQLite DB (study_artifacts)
        └─► Socket.IO Broadcast
                │
                ▼
        React Frontend (Real-time Update)
```

---

## 🔧 Configuration

### Backend URL Configuration
```python
# Default
injector = ArtifactInjector()  # http://localhost:3001

# Custom
injector = ArtifactInjector(backend_url="http://localhost:8080")
```

### Environment Variables
```bash
# In gen-ai .env file
BACKEND_URL=http://localhost:3001
```

---

## ✅ Success Criteria

You've successfully set up the system if:
- ✅ Backend starts without errors
- ✅ Test script passes all 3 artifact injections
- ✅ Artifacts appear in database with correct structure
- ✅ No error messages in terminal

---

## 🔮 Future Enhancements

1. **Authentication**: Add API key or JWT token for injection endpoint
2. **Rate Limiting**: Prevent injection spam
3. **Batch API**: Single endpoint for multiple artifacts
4. **Webhooks**: Notify gen-ai when session starts/ends
5. **Artifact Validation**: JSON schema validation before insertion
6. **Metrics Tracking**: Log generation time, success rate, etc.

---

**Last Updated:** November 14, 2025  
**Status:** Production-ready for testing
