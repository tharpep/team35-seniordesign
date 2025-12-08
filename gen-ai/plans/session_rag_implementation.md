# Session-Based RAG Implementation Plan

## 1. Overview
This plan details the implementation of **Session-Based RAG**, allowing each study session to have its own isolated knowledge base (vector collection) generated from captured markdown content (OCR from glasses/screen).

### Key Goals
- **Isolation**: Each session has its own document context.
- **Asynchronous Ingestion**: Ingestion happens in the background without blocking the UI.
- **Incremental Updates**: Ingest files one by one as they are created.
- **Backward Compatibility**: **Existing demos and `persistant_docs` functionality MUST remain unchanged.**

---

## 2. Architecture & Data Flow

### A. The Flow
1.  **Capture**: `img2study` extracts markdown from an image.
2.  **Transport**: `img2study` sends markdown to Backend (`POST /api/sessions/:id/context`).
3.  **Backend (Traffic Controller)**:
    -   Saves markdown to `gen-ai/src/data/documents/sessions/{session_id}/{timestamp}_{source}.md`.
    -   Appends markdown to SQL `sessions.context` (for summaries/display).
    -   **Immediately** triggers Gen-AI async ingestion endpoint.
    -   Returns success to `img2study`.
4.  **Gen-AI (Async Worker)**:
    -   Receives request (`POST /api/ingest/session_file`).
    -   Starts background task.
    -   Checks/Creates Qdrant collection: `session_docs_{session_id}`.
    -   Ingests the specific file into that collection.
5.  **Artifact Generation**:
    -   When generating artifacts for a session, the RAG system queries `session_docs_{session_id}` instead of the global `persistant_docs`.

### B. Compatibility Strategy (CRITICAL)
To ensure `python run demo` and existing workflows do not break:
1.  **Default Collection**: The `BasicRAG` class will continue to default to `collection_name="persistant_docs"` if no collection is specified.
2.  **Existing CLI**: The `genai ingest` command will continue to use the default `DocumentIngester` which targets `persistant_docs`.
3.  **New Functionality is Additive**: We are adding *new* methods and endpoints, not changing the signature of existing core methods in a breaking way.

---

## 3. Implementation Steps

### Phase 1: Webapp Backend (Node.js)
**File:** `webapp/backend/src/controllers/sessionController.js`

1.  **Modify `appendContext`**:
    -   Import `fs` and `path`.
    -   Determine file path: `gen-ai/src/data/documents/sessions/{session_id}/`.
    -   Ensure directory exists (`fs.mkdirSync(..., { recursive: true })`).
    -   Write markdown file: `{timestamp}_{source}.md`.
    -   **Fire-and-Forget**: Call Gen-AI endpoint `POST http://127.0.0.1:8000/api/ingest/session_file` with `{ session_id, file_path }`.
    -   *Note: Do not await the Gen-AI call's completion if it takes too long, or rely on the Gen-AI's background task to return immediately.*

2.  **Update `deleteSession`**:
    -   Delete the session directory in `gen-ai/src/data/documents/sessions/`.
    -   Call Gen-AI endpoint `DELETE /api/ingest/session/{session_id}` to clean up the vector collection.

---

### Phase 2: Gen-AI API (Python/FastAPI)

**File:** `gen-ai/src/api/models/ingest.py` (New)
-   Create Pydantic model `SessionFileIngestRequest`:
    ```python
    class SessionFileIngestRequest(BaseModel):
        session_id: str
        file_path: str
    ```

**File:** `gen-ai/src/api/routes/ingest.py` (New)
-   Create endpoint `POST /session_file`:
    -   Accept `SessionFileIngestRequest`.
    -   Use `BackgroundTasks` to call `ingester.ingest_session_file`.
    -   Return `{"status": "queued"}` immediately.
-   Create endpoint `DELETE /session/{session_id}`:
    -   Delete the Qdrant collection `session_docs_{session_id}`.

**File:** `gen-ai/src/api/main.py`
-   Include the new `ingest` router.

---

### Phase 3: RAG Core Improvements

**File:** `gen-ai/src/rag/document_ingester.py`
1.  **Add `ingest_session_file(self, session_id: str, file_path: str)`**:
    -   Determine collection name: `session_docs_{session_id}`.
    -   **Dynamic Collection Init**: Check if collection exists. If not, create it using `self.rag.vector_store.setup_collection()`.
    -   Call `self.ingest_file(file_path)` but pass the specific collection name context (might need slight refactor of `ingest_file` or `add_documents` to accept target collection).

**File:** `gen-ai/src/rag/rag_setup.py`
1.  **Update `add_documents`**:
    -   Allow optional `collection_name` argument.
    -   Pass this through to `vector_store.add_points`.
2.  **Update `query` / `search`**:
    -   Allow optional `collection_name` argument.
    -   Default to `self.collection_name` (which is `persistant_docs`) to preserve backward compatibility.

**File:** `gen-ai/src/rag/vector_store.py`
-   Ensure `setup_collection` is robust and can be called safely multiple times (idempotent).

---

### Phase 4: Artifact Generation Updates

**File:** `gen-ai/src/api/routes/artifacts.py`
1.  **Update Generation Endpoints**:
    -   Extract `session_id` from request.
    -   If `session_id` is present:
        -   Pass `collection_name="session_docs_{session_id}"` to the generator.
    -   If no `session_id`:
        -   Use default (global) collection.

**File:** `gen-ai/src/artifact_creation/base_generator.py` & Generators
1.  **Update `generate` method**:
    -   Accept `collection_name` override.
    -   Pass it to `self.rag.query()`.

---

## 4. Implementation Status

### ✅ Completed Implementation

**Phase 1: Webapp Backend**
- ✅ Modified `appendContext` to write markdown files to `gen-ai/src/data/documents/sessions/{session_id}/`
- ✅ Added fire-and-forget HTTP request to Gen-AI ingestion endpoint
- ✅ Updated `deleteSession` to cleanup session files and trigger collection deletion

**Phase 2: Gen-AI API**
- ✅ Created `src/api/models/ingest.py` with `SessionFileIngestRequest` and `IngestionResponse`
- ✅ Created `src/api/routes/ingest.py` with:
  - `POST /api/ingest/session_file` - Queue file ingestion (background task)
  - `DELETE /api/ingest/session/{session_id}` - Delete session collection
- ✅ Updated `src/api/main.py` to include ingest router

**Phase 3: RAG Core**
- ✅ Updated `BasicRAG.add_documents()` to accept optional `collection_name` parameter
- ✅ Updated `BasicRAG.search()` to accept optional `collection_name` parameter
- ✅ Updated `BasicRAG.query()` to accept optional `collection_name` parameter
- ✅ All methods default to `self.collection_name` (backward compatible)

**Phase 4: Artifact Generation**
- ✅ Updated `FlashcardGenerator.generate()` to use session collection from `session_context`
- ✅ Updated `MCQGenerator.generate()` to use session collection from `session_context`
- ✅ Updated `InsightsGenerator.generate()` to use session collection from `session_context`
- ✅ All generators automatically use `session_docs_{session_id}` when `session_context.session_id` is provided

### Key Implementation Details

1. **Collection Naming**: Session collections use format `session_docs_{session_id}`
2. **Backward Compatibility**: All existing code continues to work with `persistant_docs` default
3. **Background Processing**: Ingestion happens asynchronously via FastAPI BackgroundTasks
4. **File Storage**: Markdown files stored at `gen-ai/src/data/documents/sessions/{session_id}/{timestamp}_{source}.md`
5. **Path Handling**: Backend sends relative paths from gen-ai root, normalized for cross-platform compatibility

## 5. Verification Plan

1.  **Test Legacy Demo**:
    -   Run `python run demo`.
    -   Verify it still loads `persistant_docs` and answers questions.
    -   *Success Criteria: No errors, functionality identical to before.*

2.  **Test Session Flow**:
    -   Start Gen-AI server: `python run start`
    -   Start Backend server
    -   Send markdown via `POST /api/sessions/{id}/context` from img2study
    -   Verify file is written to `gen-ai/src/data/documents/sessions/{id}/`
    -   Check Gen-AI logs to see ingestion task started
    -   Wait a few seconds, then check Qdrant to see `session_docs_{id}` collection created
    -   Call `POST /api/flashcards` with `session_context: { session_id: "{id}" }`
    -   Verify the flashcards are generated using the content from that specific file.

3.  **Test Session Deletion**:
    -   Delete a session via `DELETE /api/sessions/{id}`
    -   Verify session directory is deleted
    -   Verify Qdrant collection `session_docs_{id}` is deleted

