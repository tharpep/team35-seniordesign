# Team 35 Senior Design

## Overview
This repository contains the codebase for Team 35's Senior Design project. The project is divided into several components, each serving a specific purpose in the overall system. Below is a high-level explanation of the directory structure and its contents.

## Directory Structure

### `gen-ai/`
This directory contains the core logic for the generative AI features of the project. Key components include:
- **`ai_providers/`**: Contains implementations for different AI providers, such as `gateway.py`, `local.py`, and `purdue_api.py`.
- **`artifact creation/`**: Includes schemas and templates for generating artifacts like flashcards, insights, and multiple-choice questions.
- **`data/`**: Stores data files, including academic notes and a Qdrant database for vector storage.
- **`demos/`**: Demonstrates the functionality of various AI features, such as data ingestion and retrieval-augmented generation (RAG).
- **`rag/`**: Implements the RAG pipeline, including document ingestion, retrievers, and vector store management.
- **`tests/`**: Contains unit tests for the AI components.

### `glasses/`
This directory is reserved for components related to the glasses interface. It includes a `README.md` file for further details.

### `mobile/`
Contains mockups and resources for the mobile application, including HTML and CSS files for the dashboard, login, and session detail pages.

### `webapp/`
This directory houses the web application, which is further divided into:
- **`backend/`**: Implements the server-side logic, including authentication, session management, and database configuration.
- **`cognitive-coach/`**: Contains the frontend code for the Cognitive Coach application, built with TypeScript and React. It includes components, pages, and assets for the user interface.
- **`database/`**: Scripts and schema files for initializing and managing the database.
- **`mockups/`**: HTML and CSS mockups for the web application.

## Key Features
- **Generative AI**: Supports artifact creation, retrieval-augmented generation, and integration with multiple AI providers.
- **Multi-Platform Support**: Includes components for web, mobile, and glasses interfaces.
- **Database Management**: Provides scripts and schemas for initializing and managing the database.
- **Testing**: Comprehensive unit tests for core functionalities.

## Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/tharpep/team35-seniordesign.git
   ```
2. Navigate to the project directory:
   ```bash
   cd team35-seniordesign
   ```
3. Follow the setup instructions in the respective subdirectories (`gen-ai/`, `webapp/`, etc.) to get started with development.