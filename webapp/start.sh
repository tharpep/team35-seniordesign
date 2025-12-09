#!/bin/bash
# Cognitive Coach - Startup Script (Mac/Linux)
# This script starts the backend, frontend, gen-ai API, and facial-processing servers

echo "================================="
echo "🚀 Starting Cognitive Coach"
echo "================================="
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $1 is already in use. Server may already be running."
        return 0
    fi
    return 1
}

# Check if ports are already in use
echo "Checking ports..."
check_port 3001
check_port 5173
check_port 8000
check_port 8001
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Pre-start validation: Check if Python environments exist
echo "Validating Python environments..."
GENAI_DIR="$SCRIPT_DIR/../gen-ai"
FACIAL_DIR="$SCRIPT_DIR/../facial-processing"

GENAI_VENV="$GENAI_DIR/venv"
FACIAL_VENV="$FACIAL_DIR/.venv"

# Determine Python path for backend (same logic as install script)
PYTHON_PATH="python3"
# Try python3.12, python3.11, python3.10 in order
for version in "3.12" "3.11" "3.10"; do
    if command -v "python${version}" &> /dev/null; then
        if "python${version}" --version 2>&1 | grep -q "Python ${version}"; then
            PYTHON_PATH="python${version}"
            break
        fi
    fi
done
# Fallback to python3 or python
if [ "$PYTHON_PATH" = "python3" ]; then
    if ! command -v python3 &> /dev/null; then
        PYTHON_PATH="python"
    fi
fi

VALIDATION_FAILED=0

if [ ! -d "$GENAI_VENV" ]; then
    echo "❌ Gen-AI virtual environment not found at: $GENAI_VENV"
    echo "   Run the install script first: ./install.sh"
    VALIDATION_FAILED=1
else
    echo "✅ Gen-AI virtual environment found"
fi

if [ ! -d "$FACIAL_VENV" ]; then
    echo "❌ Facial Processing virtual environment not found at: $FACIAL_VENV"
    echo "   Run the install script first: ./install.sh"
    VALIDATION_FAILED=1
else
    echo "✅ Facial Processing virtual environment found"
fi

# Quick check for img2study dependencies (optional but helpful)
if $PYTHON_PATH -c "import cv2" 2>/dev/null; then
    echo "✅ Img2study OCR dependencies found"
else
    echo "⚠️  Img2study OCR dependencies may be missing (cv2 not found)"
    echo "   OCR may fail. Run install script to fix: ./install.sh"
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo ""
    echo "❌ Validation failed. Please run the install script first."
    exit 1
fi

echo ""

# Start backend server
echo "================================="
echo "📦 Starting Backend Server"
echo "================================="
# Set PYTHON_PATH environment variable so backend uses correct Python for OCR
osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && export PYTHON_PATH='$PYTHON_PATH' && echo '🔧 Backend Server' && npm start\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$SCRIPT_DIR/backend' && export PYTHON_PATH='$PYTHON_PATH' && echo '🔧 Backend Server' && npm start; exec bash" 2>/dev/null || \
xterm -e "cd '$SCRIPT_DIR/backend' && export PYTHON_PATH='$PYTHON_PATH' && echo '🔧 Backend Server' && npm start" 2>/dev/null || \
(cd "$SCRIPT_DIR/backend" && export PYTHON_PATH="$PYTHON_PATH" && npm start &)

# Wait a moment for backend to initialize
sleep 2

# Start frontend server
echo "================================="
echo "🎨 Starting Frontend Server"
echo "================================="
osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/cognitive-coach' && echo '🎨 Frontend Server' && npm run dev\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$SCRIPT_DIR/cognitive-coach' && echo '🎨 Frontend Server' && npm run dev; exec bash" 2>/dev/null || \
xterm -e "cd '$SCRIPT_DIR/cognitive-coach' && echo '🎨 Frontend Server' && npm run dev" 2>/dev/null || \
(cd "$SCRIPT_DIR/cognitive-coach" && npm run dev &)

# Wait for frontend to start
sleep 2

# Start Gen-AI API server
echo "================================="
echo "🤖 Starting Gen-AI API Server"
echo "================================="
osascript -e "tell app \"Terminal\" to do script \"cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start; exec bash" 2>/dev/null || \
xterm -e "cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start" 2>/dev/null || \
(cd "$GENAI_DIR" && python run start &)

# Wait for gen-ai to start
sleep 2

# Start Facial Processing API server
echo "================================="
echo "👁️ Starting Facial Processing Server"
echo "================================="
osascript -e "tell app \"Terminal\" to do script \"cd '$FACIAL_DIR' && echo '👁️ Facial Processing Server' && source .venv/bin/activate && python -m src.api.server\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$FACIAL_DIR' && echo '👁️ Facial Processing Server' && source .venv/bin/activate && python -m src.api.server; exec bash" 2>/dev/null || \
xterm -e "cd '$FACIAL_DIR' && echo '👁️ Facial Processing Server' && source .venv/bin/activate && python -m src.api.server" 2>/dev/null || \
(cd "$FACIAL_DIR" && source .venv/bin/activate && python -m src.api.server &)

# Wait for facial processing to start
sleep 2

# Open the web browser
echo ""
echo "🌐 Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:5173 2>/dev/null || \
    sensible-browser http://localhost:5173 2>/dev/null || \
    x-www-browser http://localhost:5173 2>/dev/null || \
    echo "Please open http://localhost:5173 in your browser"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Git Bash on Windows
    start http://localhost:5173
fi

echo ""
echo "================================="
echo "✅ Servers Starting"
echo "================================="
echo ""
echo "Backend:          http://localhost:3001"
echo "Frontend:         http://localhost:5173"
echo "Gen-AI:           http://localhost:8000"
echo "Facial Processing: http://localhost:8001"
echo ""
echo "New terminal windows have opened."
echo "Close those windows to stop the servers."
echo ""
