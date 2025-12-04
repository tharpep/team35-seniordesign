# Artifact Creation System

RAG-based artifact generation system that creates flashcards, MCQs, and insights from your knowledge base.

## Quick Start

### Switch to Purdue API (Recommended for Performance)
```bash
# Windows
set USE_OLLAMA=false
set PURDUE_API_KEY=your_key_here

# Unix/Mac
export USE_OLLAMA=false
export PURDUE_API_KEY=your_key_here
```

### Run the Demo
```bash
python run demo
# Select "Artifact" → Choose automated or interactive mode
```

## Configuration

The system automatically switches between providers based on your config:

| Provider | Model | Speed | Quality |
|----------|-------|-------|---------|
| Ollama | llama3.2:1b (laptop) / qwen3:8b (PC) | Slow (30-45s) | Good |
| Purdue API | llama4:latest | Fast (5-10s) | Excellent |

### Switching Methods

**Method 1: Edit config.py**
```python
use_ollama = False  # Use Purdue API
use_ollama = True   # Use Ollama
```

**Method 2: Environment Variables**
```bash
USE_OLLAMA=false PURDUE_API_KEY=key python run demo
```

## Generated Artifacts

### Flashcards
- Front/back question-answer pairs
- Difficulty levels (1-5)
- Tags and hints
- Source references

### Multiple Choice Questions
- 4-6 answer options
- Correct answer index
- Detailed rationale
- Bloom's taxonomy levels

### Insights
- Key takeaways
- Action items
- Common misconceptions
- Confidence scores

## Output

Artifacts are saved to `src/artifact_creation/artifact_output/` with timestamps:
- `flashcard_topic_20250109_154958.json`
- `mcq_topic_20250109_154958.json`
- `insight_topic_20250109_154958.json`

## Troubleshooting

**Slow Generation**: Switch to Purdue API (`USE_OLLAMA=false`)

**JSON Parsing Errors**: The system handles partial responses gracefully

**No Documents**: Run the RAG demo first to ingest documents

**Provider Errors**: Check that Ollama is running or PURDUE_API_KEY is set
