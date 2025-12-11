#!/bin/bash
# Cognitive Coach - Stop Script (Mac/Linux)
# This script terminates all servers running on the application ports

echo "================================="
echo "🛑 Stopping Cognitive Coach"
echo "================================="
echo ""

# Define the ports used by the application
PORTS=(3001 5173 8000 8001)
PORT_NAMES=("Backend" "Frontend" "Gen-AI" "Facial Processing")

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local name=$2

    # Find PIDs listening on the port
    PIDS=$(lsof -ti :$port 2>/dev/null)

    if [ -n "$PIDS" ]; then
        echo "🔴 Stopping $name (port $port)..."
        for pid in $PIDS; do
            # Get process name for logging
            PROC_NAME=$(ps -p $pid -o comm= 2>/dev/null)
            echo "   Killing PID $pid ($PROC_NAME)"
            kill -9 $pid 2>/dev/null
        done
        echo "   ✅ $name stopped"
    else
        echo "⚪ $name (port $port) - not running"
    fi
}

# Kill processes on each port
for i in "${!PORTS[@]}"; do
    kill_port "${PORTS[$i]}" "${PORT_NAMES[$i]}"
done

echo ""
echo "================================="
echo "✅ All servers stopped"
echo "================================="
echo ""

# Verify all ports are free
echo "Verifying ports are free..."
ALL_FREE=true
for i in "${!PORTS[@]}"; do
    if lsof -Pi :${PORTS[$i]} -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port ${PORTS[$i]} (${PORT_NAMES[$i]}) still has active connections"
        ALL_FREE=false
    else
        echo "✅ Port ${PORTS[$i]} (${PORT_NAMES[$i]}) is free"
    fi
done

echo ""
if [ "$ALL_FREE" = true ]; then
    echo "🎉 All ports are now available"
else
    echo "⚠️  Some ports may still be in use. Try running this script again."
fi
echo ""
