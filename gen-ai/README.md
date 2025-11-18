# GenAI Subsystem

GenAI subsystem for artifact generation, RAG queries, and interactive chat.

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Poetry (dependency management)

### Install Poetry

If you don't have Poetry installed, install it using one of these methods:

**Windows (PowerShell):**
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

**macOS/Linux:**
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

**Alternative (pip):**
```bash
pip install poetry
```

After installation, verify Poetry is installed:
```bash
poetry --version
```

**Note:** If you're using Poetry 2.0.0 or later, you need to install the shell plugin:
```bash
poetry self add poetry-plugin-shell
```

### Setup

1. **Install dependencies:**
   ```bash
   poetry install
   ```
   This creates a virtual environment and installs all required dependencies.

2. **Activate the virtual environment:**
   
   **Option A - Using shell plugin (recommended):**
   ```bash
   poetry shell
   ```
   This spawns a new shell within the virtual environment. To exit, type `exit`.
   
   **Option B - Using env activate (Poetry 2.0+ alternative):**
   ```bash
   poetry env activate
   ```
   Or on Windows PowerShell:
   ```powershell
   .venv\Scripts\Activate.ps1
   ```
   Or on Windows CMD:
   ```cmd
   .venv\Scripts\activate.bat
   ```

3. **Verify installation:**
   ```bash
   genai --help
   ```

## CLI Commands

After running `poetry shell`, you can use the following commands:

### `genai chat`
Interactive chat with conversation context (requires API server).

```bash
genai chat
```

**Features:**
- Three-layer context: RAG + Summary + Recent messages
- Stateful conversation maintained through API
- Real-time metrics and performance tracking

**Commands in chat:**
- `clear` - Clear the chat session (reset context)
- `stats` - Show session statistics
- `help` - Show help
- `quit` - Exit the chat

### `genai ingest`
Ingest documents from the default folder into the RAG system.

```bash
genai ingest
```

**Options:**
- `--path PATH` - Custom path to documents folder (defaults to `src/data/documents/notes/`)

**What it does:**
- Processes all `.txt` and `.md` files in the folder
- Creates embeddings and indexes them in Qdrant
- Uses the `persistant_docs` collection

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

### `genai server`
Start the FastAPI server.

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
- ReDoc: `http://127.0.0.1:8000/redoc`

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

1. **Start the API server** (in one terminal):
   ```bash
   poetry shell
   genai server
   ```

2. **Ingest documents** (in another terminal):
   ```bash
   poetry shell
   genai ingest
   ```

3. **Use the features**:
   ```bash
   # Interactive chat
   genai chat
   
   # Generate artifacts
   genai artifact --topic "Your topic here"
   
   # Query RAG system
   genai query
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

## Legacy Support

The old `run` script is still available for backward compatibility:

```bash
python run setup
python run start
python run demo
python run test
python run config
```

However, the new Poetry-based CLI is recommended for all new development.

## Troubleshooting

**Poetry not found:**
- Make sure Poetry is installed and in your PATH
- On Windows, you may need to restart your terminal after installation
- Try `python -m poetry` instead of `poetry`

**`poetry shell` command not available (Poetry 2.0+):**
- Install the shell plugin: `poetry self add poetry-plugin-shell`
- Or use the alternative: `poetry env activate` or activate the venv directly
- On Windows PowerShell: `.venv\Scripts\Activate.ps1`
- On Windows CMD: `.venv\Scripts\activate.bat`

**Command not found after `poetry shell`:**
- Make sure you ran `poetry install` first
- Verify the virtual environment was created: `poetry env info`
- Try `poetry run genai --help` instead

**API server connection errors:**
- Make sure the server is running: `genai server`
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

