# GenAI Subsystem

GenAI subsystem for artifact generation, RAG queries, and interactive chat.

## Quick Start

### Step 1: Install Poetry

If you don't have Poetry installed:

**Using pip (recommended):**
```bash
pip install poetry
```

**Or using the official installer:**
- **Windows (PowerShell):**
  ```powershell
  (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
  ```
- **macOS/Linux:**
  ```bash
  curl -sSL https://install.python-poetry.org | python3 -
  ```

Verify installation:
```bash
poetry --version
```

### Step 2: Setup Project

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **Add shell plugin (required for Poetry 2.0+):**
   ```bash
   poetry self add poetry-plugin-shell
   ```

3. **Activate the virtual environment:**
   ```bash
   poetry shell
   ```
   You should see your prompt change to indicate you're in the virtual environment.

4. **Verify installation:**
   ```bash
   genai --help
   ```

### Step 3: Start the Server

**IMPORTANT:** Start the API server first in a terminal before using other commands.

In your terminal (after `poetry shell`):
```bash
genai server
```

The server will start at `http://127.0.0.1:8000`. Keep this terminal running.

### Step 4: Test the System

Open a **new terminal** and run:

```bash
cd gen-ai
poetry shell
```

Then test the commands:

**Ingest documents:**
```bash
genai ingest
```

**Generate artifacts:**
```bash
genai artifact --topic "Newton's laws of motion"
```

**Interactive chat:**
```bash
genai chat
```

**Run comprehensive demo:**
```bash
genai demo
```

## CLI Commands

All commands require `poetry shell` to be active and the API server running (except `genai server` and `genai query`).

### `genai server`
Start the FastAPI server (run this first in a separate terminal).

```bash
genai server
```

**Options:**
- `--host HOST` - Host to bind to (default: `127.0.0.1`)
- `--port PORT` - Port to bind to (default: `8000`)
- `--reload/--no-reload` - Enable/disable auto-reload (default: enabled)

**Endpoints:**
- API: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### `genai ingest`
Ingest documents into the RAG system.

```bash
genai ingest
```

**Options:**
- `--path PATH` - Custom path to documents folder (defaults to `src/data/documents/notes/`)

**What it does:**
- Processes all `.txt` and `.md` files in the folder
- Creates embeddings and indexes them in Qdrant
- Uses the `persistant_docs` collection

### `genai artifact`
Generate educational artifacts (flashcards, MCQ, insights) via API.

```bash
genai artifact
```

**Options:**
- `--topic TOPIC` - Topic to generate artifacts for (default: "Newton's laws of motion")
- `--base-url URL` - API server base URL (default: `http://127.0.0.1:8000`)

**What it generates:**
- One flashcard
- One multiple-choice question
- One insight

**Output:**
Artifacts are saved to `src/artifact_creation/artifact_output/` with timestamps.

### `genai chat`
Interactive chat with conversation context (requires API server).

```bash
genai chat
```

**Options:**
- `--base-url URL` - API server base URL (default: `http://127.0.0.1:8000`)

**Features:**
- Three-layer context: RAG + Summary + Recent messages
- Stateful conversation maintained through API
- Real-time metrics and performance tracking

**Commands in chat:**
- `clear` - Clear the chat session (reset context)
- `stats` - Show session statistics
- `help` - Show help
- `quit` - Exit the chat

### `genai query`
Interactive RAG query REPL (no API server required).

```bash
genai query
```

**Features:**
- Direct RAG queries using `persistant_docs` collection
- Shows retrieved context documents with similarity scores
- LLM-generated answers based on retrieved context

**Commands in query:**
- `help` - Show help
- `quit` - Exit the query REPL

### `genai demo`
Run comprehensive subsystem demo via API (tests all specifications).

```bash
genai demo
```

**Options:**
- `--mode MODE` - Demo mode: 'automated' or 'interactive' (default: 'interactive')
- `--base-url URL` - API server base URL (default: `http://127.0.0.1:8000`)

**What it tests:**
- Artifact Generation
- Schema Compliance
- Token Management
- Processing Latency
- Factual Accuracy
- System Reliability

**Note:** Requires API server to be running.

### `genai test`
Run pytest tests.

```bash
genai test
```

**Options:**
- `--all` - Run all tests without interaction
- `--verbose/--quiet` - Verbose or quiet output

### `genai config`
Display current configuration settings.

```bash
genai config
```

Shows:
- Hardware configuration (laptop/PC, model)
- AI provider settings (Ollama/Purdue API)
- Vector store settings
- Retrieval and generation settings
- Chat session settings

## Typical Workflow

1. **Terminal 1 - Start the server:**
   ```bash
   cd gen-ai
   poetry shell
   genai server
   ```
   Keep this terminal running.

2. **Terminal 2 - Use the system:**
   ```bash
   cd gen-ai
   poetry shell
   
   # Ingest documents
   genai ingest
   
   # Generate artifacts
   genai artifact --topic "Your topic here"
   
   # Interactive chat
   genai chat
   
   # Run comprehensive demo
   genai demo
   ```

## Configuration

Configuration is managed through `config.py` and environment variables.

**Environment variables:**
- `USE_LAPTOP` - Set to `"true"` for laptop (llama3.2:1b), `"false"` for PC (qwen3:8b)
- `USE_OLLAMA` - Set to `"true"` for Ollama (local), `"false"` for Purdue API
- `USE_PERSISTENT` - Set to `"true"` for persistent storage, `"false"` for in-memory
- `COLLECTION_NAME` - Name for Qdrant collection (default: `persistant_docs`)
- `PURDUE_API_KEY` - API key for Purdue GenAI API (required if not using Ollama)

**View current configuration:**
```bash
genai config
```

## Project Structure

```
gen-ai/
├── cli/                    # CLI package (Poetry-based)
│   ├── main.py            # Main Typer app
│   ├── utils.py           # Shared utilities
│   └── commands/          # Command implementations
├── src/                    # Core source code
│   ├── ai_providers/      # AI provider integrations
│   ├── api/               # FastAPI application
│   ├── artifact_creation/ # Artifact generators
│   ├── data/              # Data and documents
│   ├── llm_chat/          # Chat service
│   ├── rag/               # RAG system
│   └── tests/             # Unit tests
├── prompts/               # Prompt templates
├── pyproject.toml         # Poetry configuration
└── requirements.txt       # Legacy requirements (for reference)
```

## Troubleshooting

**Poetry not found:**
- Make sure Poetry is installed: `pip install poetry`
- Verify: `poetry --version`
- On Windows, you may need to restart your terminal after installation

**`poetry shell` command not available:**
- Install the shell plugin: `poetry self add poetry-plugin-shell`
- Then run `poetry shell` again

**Command not found after `poetry shell`:**
- Make sure you ran `poetry install` first
- Verify the virtual environment: `poetry env info`
- Try `poetry run genai --help` instead

**API server connection errors:**
- **Make sure the server is running first:** `genai server` (in a separate terminal)
- Check the server is accessible: `curl http://127.0.0.1:8000/health`
- Verify the `--base-url` matches the server address

**Import errors:**
- Make sure you're in the `poetry shell` environment
- Run `poetry install` to ensure all dependencies are installed
- Check that you're in the `gen-ai` directory

## Development

**Run tests:**
```bash
poetry shell
genai test
```

**Check code quality:**
```bash
poetry run pytest src/tests/ -v
```

**View API documentation:**
Start the server and visit `http://127.0.0.1:8000/docs`

## License

Team 35 Senior Design Project
