#!/bin/bash
# Cognitive Coach - Startup Script (Mac/Linux)
# This script starts the backend, frontend, and gen-ai API servers

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
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start backend server
echo "================================="
echo "📦 Starting Backend Server"
echo "================================="
osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && echo '🔧 Backend Server' && npm start\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$SCRIPT_DIR/backend' && echo '🔧 Backend Server' && npm start; exec bash" 2>/dev/null || \
xterm -e "cd '$SCRIPT_DIR/backend' && echo '🔧 Backend Server' && npm start" 2>/dev/null || \
(cd "$SCRIPT_DIR/backend" && npm start &)

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
GENAI_DIR="$SCRIPT_DIR/../gen-ai"
osascript -e "tell app \"Terminal\" to do script \"cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start\"" 2>/dev/null || \
gnome-terminal -- bash -c "cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start; exec bash" 2>/dev/null || \
xterm -e "cd '$GENAI_DIR' && echo '🤖 Gen-AI API Server' && python run start" 2>/dev/null || \
(cd "$GENAI_DIR" && python run start &)

# Wait for gen-ai to start
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
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo "Gen-AI:   http://localhost:8000"
echo ""
echo "New terminal windows have opened."
echo "Close those windows to stop the servers."
echo ""
