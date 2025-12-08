# Cognitive Coach Startup Scripts

This folder contains scripts to install dependencies and launch both the backend and frontend servers.

## Installation

Before starting the servers for the first time, install all dependencies:

### Windows

#### PowerShell:
```powershell
.\install.ps1
```

#### Command Prompt:
```cmd
install.bat
```
Or double-click the `install.bat` file.

### Mac/Linux

```bash
chmod +x install.sh
./install.sh
```

---

## Starting the Servers

After installation, use these scripts to start both servers:

## Windows

### Option 1: PowerShell Script (Recommended)
```powershell
.\start.ps1
```

### Option 2: Batch Script
```cmd
start.bat
```
Double-click the `start.bat` file or run it from Command Prompt.

## Mac/Linux

```bash
chmod +x start.sh
./start.sh
```

## What the scripts do:

1. Check if ports 3001 (backend), 5173 (frontend), and 8000 (gen-ai) are already in use
2. Start the backend server on port 3001
3. Wait 2 seconds for backend initialization
4. Start the frontend server on port 5173
5. Wait 2 seconds for frontend initialization
6. Start the Gen-AI API server on port 8000
7. Open new terminal windows for each server

## Stopping the servers:

Simply close the terminal windows that were opened by the script, or press `Ctrl+C` in each window.

## Manual startup:

If you prefer to start servers manually:

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd cognitive-coach
npm run dev
```

**Gen-AI API:**
```bash
cd ../gen-ai
python run start
```

## URLs:

- **Backend API:** http://localhost:3001/api
- **Frontend:** http://localhost:5173
- **Gen-AI API:** http://localhost:8000
- **Gen-AI Docs:** http://localhost:8000/docs
