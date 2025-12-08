# Web Application

## Overview
The `webapp` directory contains the codebase for the web application component of the project. This application serves as the primary interface for users to interact with the system. It is divided into backend and frontend components, along with supporting resources such as database scripts and mockups.

## Directory Structure

### `backend/`
The backend implements the server-side logic for the web application. Key components include:
- **`src/`**: Contains the main server code, including:
  - **`server.js`**: Entry point for the backend server.
  - **`config/`**: Configuration files, such as `database.js` for database connections.
  - **`controllers/`**: Handles business logic for various features, such as authentication (`authController.js`) and session management (`sessionController.js`).
  - **`middleware/`**: Middleware functions, such as `auth.js` for authentication.
  - **`routes/`**: API route definitions for authentication, materials, and sessions.
- **`package.json`**: Lists dependencies and scripts for the backend.
- **`studycoach.db`**: SQLite database file used for development.

### `cognitive-coach/`
The frontend is built using TypeScript and React. Key components include:
- **`src/`**: Contains the main application code, including:
  - **`App.tsx`**: Entry point for the React application.
  - **`AppRouter.tsx`**: Defines the routing structure for the application.
  - **`components/`**: Reusable UI components, such as `ArtifactPopup` and `CurrentSession`.
  - **`pages/`**: Page-level components, such as `Dashboard` and `Login`.
  - **`assets/`**: Static assets, including mock data and styles.
- **`public/`**: Publicly accessible files, such as `index.html`.
- **`vite.config.ts`**: Configuration file for Vite, the build tool.
- **`package.json`**: Lists dependencies and scripts for the frontend.

### `database/`
This directory contains scripts and schema files for initializing and managing the database. Key files include:
- **`schema.sql`**: Defines the database schema.
- **`initDatabase.js`**: Script to initialize the database.
- **`createTestUser.js`**: Script to create a test user for development.

### `mockups/`
Contains HTML and CSS mockups for the web application, including:
- **`dashboard.html`**: Mockup for the dashboard page.
- **`login.html`**: Mockup for the login page.
- **`session-detail.html`**: Mockup for the session detail page.

## Key Features
- **Backend**: Provides RESTful APIs for authentication, session management, and material handling.
- **Frontend**: A responsive and user-friendly interface built with React and TypeScript.
- **Database**: SQLite database for development, with scripts for initialization and testing.
- **Mockups**: HTML and CSS prototypes for the application's design.

## Getting Started

### Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

### Frontend
1. Navigate to the `cognitive-coach` directory:
   ```bash
   cd cognitive-coach
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Gen-AI
1. Navigate to the `gen-ai` directory:
   ```bash
   cd gen-ai
   ```
2. Set up the virtual environment and install dependencies:
   ```bash
   python run setup
   ```
3. Start the FastAPI server:
   ```bash
   python run start
   ```
   The server will start at `http://127.0.0.1:8000`. Keep this terminal running.
