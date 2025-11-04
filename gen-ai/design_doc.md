# Subsystem 3: Gen AI + Data

## Subsystem Diagram

[Design Document 2] ![System Architecture](system_diagram.png)

## Specifications

[Design Document 2] 
- **Artifact Generation**: Must generate at least 3 types of artifacts (flashcards, MCQs, insights)
- **Data Security**: Data must be encrypted and accessible only to the signed-in user
- **Factual Accuracy**: Achieves 90% factual accuracy with <5% hallucination rate across all generated artifacts and chatbot responses
- **Processing Latency**: GenAI-stage processing latency of no more than 5.0 seconds at the 95th percentile
- **System Reliability**: System must maintain 98% uptime with <2% drop rate during active user sessions
- **Schema Compliance**: All generated artifacts must conform to a fixed JSON schema per artifact type for consistent structure and formatting
- **Token Management**: Maximum 500 tokens per artifact generation, 150 tokens per chatbot response for optimal speed and cost efficiency

## Specification Demonstrations

Each specification will be validated through comprehensive testing in the `subsystem_demo.py`:

- **Artifact Generation**: Generate flashcards, MCQs, and insights from ingested documents, validate JSON schema compliance, and measure generation success rates
- **Data Security**: Mock encryption/decryption demonstration using base64 encoding to simulate data protection mechanisms
- **Factual Accuracy**: LLM-based evaluation of generated content against source documents, measuring correctness and context alignment with target of 90% accuracy
- **Processing Latency**: Measure end-to-end response times for artifact generation and chatbot responses, ensuring 95th percentile under 5.0 seconds
- **System Reliability**: Simulate multiple concurrent requests, measure success/failure rates, and demonstrate graceful degradation when no relevant documents are found
- **Schema Compliance**: Validate all generated artifacts against predefined JSON schemas, ensuring consistent structure and formatting
- **Token Management**: Monitor and enforce token limits for both artifact generation (500 tokens) and chatbot responses (150 tokens), with tolerance for slight overages

## Subsystem Interactions

[Design Document 2]
- **Hardware Capture Layer** → **Middleware API** → **GenAI + Data Subsystem**
- **Middleware API** → **Document Ingestor** → **Vector Store** (Qdrant) for indexing
- **RAG System** → **Vector Store** + **AI Provider** (Ollama/Purdue API) → **Artifact Generator**
- **Artifact Generator** → **JSON Output** → **Middleware API** → **User Interface**
- **Chatbot Interface** → **RAG System** → **Persistent Memory** for contextual responses
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

[Design Document 1][proposed parts]

Software: Ollama (Qwen-3/Llama-3.2), sentence-transformers (e5/BGE) for embeddings, Postgres + pgvector (FAISS for dev).

API/Messaging: FastAPI endpoints + WebSocket streaming.

Retrieval & Indexing: Recursive text splitter → embed (e5/BGE) → upsert/search in pgvector.

Generation (Artifacts): RAG prompt templates → flashcards/notes/quizzes in Markdown → PDF via WeasyPrint (optional).

Evaluation/Quality: RAGAS basic checks (faithfulness/answer quality) + pytest smoke tests.

[Design Document 2][Finalized List - Implemented]
- **AI Providers**: Ollama (local), Purdue GenAI API (cloud)
- **Vector Store**: Qdrant (persistent storage for note-based memory)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **Framework**: Python with modular architecture
- **Testing**: pytest with async support
- **Artifact Generation**: JSON schema validation, flashcards, MCQs, insights
- **RAG System**: Document ingestion, context retrieval, chatbot interface

[Design Document 2][Planned for Integration]
- **API Layer**: FastAPI endpoints for middleware integration
- **Model Tuning**: LoRA/QLoRA fine-tuning with Hugging Face PEFT and TRL
- **Enhanced Security**: Data encryption and user authentication
- **Session Management**: User engagement tracking and personalized recommendations

## Algorithm

[Design Document 2]
The GenAI + Data subsystem operates through a five-stage pipeline that transforms captured content into intelligent educational artifacts. The process begins with data ingestion, where content captured by the hardware layer is routed through the middleware API to the document processing engine, which then stores the processed information in the vector database for future retrieval. When a user interacts with the system, context retrieval mechanisms generate embeddings from their queries and perform similarity searches to identify the most relevant content chunks from the stored knowledge base. The artifact generation stage combines this retrieved context with specialized prompt templates, feeds the combined input to the LLM, and validates the output to ensure proper JSON formatting for structured educational materials. Chatbot interactions follow a similar pattern, where user questions trigger RAG retrieval processes that generate contextual responses while simultaneously updating the persistent memory system. Finally, session management continuously tracks user engagement patterns, consolidates learning data, and generates personalized recommendations to enhance the educational experience.

## Theory of Operation

[Design Document 2]
The subsystem operates on the principle of Retrieval-Augmented Generation (RAG), which combines document search capabilities with large language model generation to provide contextual, accurate responses. Vector similarity calculations using cosine similarity between query and document embeddings enable the system to identify and retrieve the most relevant content chunks from the knowledge base. To maintain optimal performance in real-time processing scenarios, the system employs a limited context window approach that balances information richness with computational efficiency. The artifact generation mechanism produces structured JSON outputs for educational materials such as flashcards, quizzes, and summaries, all based on the content captured and processed by the hardware layer. A persistent memory system maintains learning context across user sessions, creating a continuous educational experience that builds upon previous interactions. The entire system is designed with a privacy-first approach, utilizing local processing with encrypted storage to protect student data and ensure compliance with FERPA regulations. When no relevant documents are found during retrieval, the system implements a graceful degradation strategy by providing direct LLM responses, ensuring continuous functionality even when the knowledge base lacks specific information.

## Specification Measurements

[Design Document 3][Every specification above should be validated with measurements]

## Standards

[Design Document 1][Expected]

IEEE 7003 – Algorithmic bias considerations

IEEE 7010 – Well-being metrics for ethical AI

ISO/IEC 22989 – AI concepts and terminology

ISO/IEC 23894 – AI risk management

ISO/IEC 23053 – Framework for AI systems using machine learning

ISO/IEC 42001 – AI management system standard

NIST AI RMF 1.0 – Risk management framework for AI

ISO/IEC 27001 – Information security

[Design Document 3][Finalized]
- **IEEE 7003** – Algorithmic bias considerations for educational AI
- **IEEE 7010** – Well-being metrics for student learning outcomes
- **ISO/IEC 22989** – AI concepts and terminology standardization
- **ISO/IEC 23894** – AI risk management for educational systems
- **ISO/IEC 23053** – Framework for ML systems in education
- **ISO/IEC 42001** – AI management system for academic institutions
- **NIST AI RMF 1.0** – Risk management framework for educational AI
- **ISO/IEC 27001** – Information security for student data protection
- **FERPA** – Family Educational Rights and Privacy Act compliance
- **COPPA** – Children's Online Privacy Protection Act (if applicable)
- **WCAG 2.1** – Web Content Accessibility Guidelines for inclusive design 