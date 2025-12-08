# Subsystem 3: Gen AI + Data

## Subsystem Diagram

[Design Document 2] ![System Architecture](system_diagram.png)

## Specifications

[Design Document 2] 
- **Artifact Generation**: Must generate at least 3 types of artifacts (flashcards, MCQs, insights)
- **Factual Accuracy**: Achieves 90% factual accuracy with <5% hallucination rate across all generated artifacts and chatbot responses
- **Processing Latency**: GenAI-stage processing latency of no more than 5.0 seconds at the 95th percentile
- **System Reliability**: System must maintain 98% uptime with <2% drop rate during active user sessions
- **Schema Compliance**: All generated artifacts must conform to a fixed JSON schema per artifact type for consistent structure and formatting
- **Token Management**: Maximum 500 tokens per artifact generation, 300 tokens per chatbot response for optimal speed and cost efficiency

## Specification Demonstrations

Each specification is validated through comprehensive testing implemented in `src/demos/subsystem_demo.py` (direct RAG) and `src/demos/api_subsystem_demo.py` (API-based). Both demos are accessible via the CLI command `genai demo` with automated or interactive modes.

**Implementation Status**: Both demo systems are fully implemented and operational.

- **Artifact Generation**: Generate flashcards, MCQs, and insights from ingested documents via API endpoints, validate JSON schema compliance, and measure generation success rates
- **Factual Accuracy**: LLM-based evaluation of generated content against source documents, measuring correctness and context alignment with target of 90% accuracy
- **Processing Latency**: Measure end-to-end response times for artifact generation and chatbot responses via API, ensuring 95th percentile under 5.0 seconds
- **System Reliability**: Simulate multiple concurrent API requests, measure success/failure rates, and demonstrate graceful degradation when no relevant documents are found
- **Schema Compliance**: Validate all generated artifacts from API against predefined JSON schemas, ensuring consistent structure and formatting
- **Token Management**: Monitor and enforce token limits for both artifact generation (500 tokens) and chatbot responses (300 tokens), with tolerance for slight overages

## Subsystem Interactions

[Design Document 2]
- **Hardware Capture Layer** → **Middleware API** → **GenAI + Data Subsystem (FastAPI)**
- **Middleware API** → **FastAPI Endpoints** (`/api/flashcards`, `/api/mcq`, `/api/insights`, `/api/chat`)
- **FastAPI Endpoints** → **Document Ingestor** → **Vector Store** (Qdrant) for indexing
- **RAG System** → **Vector Store** + **AI Provider** (Ollama/Purdue API) → **Artifact Generator**
- **Artifact Generator** → **JSON Output** → **FastAPI Response** → **Middleware API** → **User Interface**
- **Chatbot Interface** (`/api/chat`) → **RAG System** → **Persistent Memory** for contextual responses
- **Logging System** → **File Storage** for audit trails and session management

## Core ECE Design Tasks

[Design Document 2] [Explain which course helps accomplish the task]

- **Vector Database Design** (ECE 368) - Data structures for efficient similarity search and persistent memory
- **AI Model Integration** (ECE 570) - LLM selection, prompt engineering, and artifact generation
- **System Architecture** (ECE 461) - Modular design, API development, and subsystem integration
- **Data Processing Pipeline** (ECE 20875) - Real-time document ingestion, embedding generation, and JSON validation

## Schematics

[Design Document 2] ![Flowchart](flowchart.png)
A diagram of a flowchart

AI-generated content may be incorrect.

## Parts

[Design Document 1][Proposed - Not Implemented]

Software: Ollama (Qwen-3/Llama-3.2), sentence-transformers (e5/BGE) for embeddings, Postgres + pgvector (FAISS for dev).

API/Messaging: FastAPI endpoints + WebSocket streaming.

Retrieval & Indexing: Recursive text splitter → embed (e5/BGE) → upsert/search in pgvector.

Generation (Artifacts): RAG prompt templates → flashcards/notes/quizzes in Markdown → PDF via WeasyPrint (optional).

Evaluation/Quality: RAGAS basic checks (faithfulness/answer quality) + pytest smoke tests.

[Design Document 2][Finalized List - Implemented]
- **AI Providers**: Ollama (local), Purdue GenAI API (cloud) with gateway abstraction pattern
- **Vector Store**: Qdrant (persistent storage for note-based memory)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **Framework**: Python with modular architecture, FastAPI for async REST API
- **CLI Interface**: Typer-based command-line interface for all operations
- **Testing**: pytest with async support, comprehensive test suite in `src/tests/`
- **Artifact Generation**: JSON schema validation, flashcards, MCQs, insights with provenance tracking
- **RAG System**: Document ingestion, context retrieval, chatbot interface with persistent memory
- **Logging**: Structured logging system with file rotation and console output
- **Chat Service**: Stateful conversation management with three-layer context (RAG + summary + recent messages)

[Design Document 2][Implemented - API Layer]
- **API Layer**: FastAPI endpoints for middleware integration (implemented)
  - `/api/flashcards` - Generate flashcards
  - `/api/mcq` - Generate multiple-choice questions
  - `/api/insights` - Generate insights
  - `/api/chat` - Interactive chat with conversation context
  - `/health` - Health check endpoint

[Design Document 2][Implemented - CLI Interface]
- **CLI System**: Comprehensive command-line interface using Typer (implemented)
  - `genai server` - Start FastAPI server
  - `genai ingest` - Ingest documents into RAG system
  - `genai artifact` - Generate educational artifacts via API
  - `genai chat` - Interactive chat with conversation context
  - `genai query` - Interactive RAG query REPL (direct, no API)
  - `genai demo` - Run comprehensive subsystem demo (automated/interactive)
  - `genai test` - Run pytest test suite
  - `genai config` - Display current configuration settings
- **CLI Features**: All operations accessible via CLI, supports both API-based and direct RAG operations

[Design Document 2][Planned for Integration]
- Additional features to be determined based on integration requirements

## Algorithm

[Design Document 2]
The GenAI + Data subsystem operates through a five-stage pipeline that transforms captured content into intelligent educational artifacts. The process begins with data ingestion, where content captured by the hardware layer is routed through the middleware API to the document processing engine, which then stores the processed information in the vector database (Qdrant) for future retrieval. When a user interacts with the system through the FastAPI endpoints or CLI interface, context retrieval mechanisms generate embeddings from their queries and perform similarity searches to identify the most relevant content chunks from the stored knowledge base. The artifact generation stage combines this retrieved context with specialized prompt templates, feeds the combined input to the LLM (via Ollama or Purdue API through the gateway abstraction), and validates the output to ensure proper JSON formatting for structured educational materials. Chatbot interactions follow a similar pattern, where user questions sent to `/api/chat` or via `genai chat` CLI command trigger RAG retrieval processes that generate contextual responses while simultaneously updating the persistent memory system. The system provides both REST API endpoints and a comprehensive CLI interface for all operations, enabling integration with the middleware and user interfaces. The chat service maintains conversation context within API sessions using a three-layer approach (RAG context + conversation summary + recent messages), providing stateful interactions for improved educational experiences. All operations are logged with structured logging for audit trails and performance monitoring.

## Theory of Operation

[Design Document 2]
The subsystem operates on the principle of Retrieval-Augmented Generation (RAG), which combines document search capabilities with large language model generation to provide contextual, accurate responses. Vector similarity calculations using cosine similarity between query and document embeddings enable the system to identify and retrieve the most relevant content chunks from the knowledge base. To maintain optimal performance in real-time processing scenarios, the system employs a limited context window approach that balances information richness with computational efficiency. The artifact generation mechanism produces structured JSON outputs for educational materials such as flashcards, quizzes, and summaries, all based on the content captured and processed by the hardware layer. A persistent memory system maintains learning context across user sessions, creating a continuous educational experience that builds upon previous interactions. The system is accessible through a FastAPI-based REST API that provides endpoints for artifact generation and interactive chat. When no relevant documents are found during retrieval, the system implements a graceful degradation strategy by providing direct LLM responses, ensuring continuous functionality even when the knowledge base lacks specific information.

## Specification Measurements

[Design Document 3][Implemented - Results from Demo 2025-10-16]

All specifications validated via `api_subsystem_demo.py` (access via `genai demo` CLI). Results from most recent successful demo:

**1. Artifact Generation** ✅ PASS
- 3 types generated: flashcards (3.25s), MCQs (3.57s), insights (1.06s)

**2. Processing Latency** ✅ PASS  
- p95 latency: 1.05s (target: <5.0s), avg: 0.97s

**3. Token Management** ✅ PASS
- Artifacts: flashcard 124, MCQ 133, insight 113 tokens (all <500 limit)

**4. Schema Compliance** ✅ PASS
- 100% compliance: all artifacts validated against fixed JSON schemas

**5. System Reliability** ✅ PASS
- Success rate: 100% (15/15 requests), drop rate: 0%, graceful degradation verified

**6. Factual Accuracy** ✅ PASS
- Achieved: 91.9% accuracy (target: 90%), LLM: 96.1%, HITL: 87.8%

## Standards

[Design Document 3][Implemented]

The subsystem implements the following standards:

- **ISO/IEC 22989** – AI concepts and terminology: System uses standardized AI/ML terminology (RAG, embeddings, vector similarity, LLM) throughout codebase and documentation
- **ISO/IEC 23053** – Framework for ML systems: RAG-based ML pipeline with document ingestion, embedding generation, vector search, and LLM generation follows ML system framework principles
- **FERPA** – Family Educational Rights and Privacy Act compliance: User data access controls, data retention policies, and privacy protection for student educational records
- **ISO/IEC 27001** – Information security basics: Password hashing (bcrypt), input validation, secure error handling, and security event logging
- **ISO/IEC 23894** – AI risk management: Risk documentation for AI system risks (hallucination, bias, data privacy), mitigation strategies (RAG for accuracy, provenance tracking), and graceful degradation handling 