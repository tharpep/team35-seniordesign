#!/bin/bash
# Cognitive Coach - Install Dependencies Script
# This script installs all required packages for backend, frontend, and database

echo "================================="
echo "📦 Installing Cognitive Coach Dependencies"
echo "================================="
echo ""

set -e  # Exit on error

TOTAL_STEPS=3
CURRENT_STEP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display progress
show_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${YELLOW}[$CURRENT_STEP/$TOTAL_STEPS] $1${NC}"
    echo "================================="
}

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Node.js is installed
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"

echo ""

# Install backend dependencies
show_progress "Installing Backend Dependencies"
cd "$SCRIPT_DIR/backend"
npm install
echo -e "${GREEN}✅ Backend dependencies installed successfully${NC}"

# Install frontend dependencies
show_progress "Installing Frontend Dependencies"
cd "$SCRIPT_DIR/cognitive-coach"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed successfully${NC}"

# Install database dependencies
show_progress "Installing Database Dependencies"
cd "$SCRIPT_DIR/database"
npm install
echo -e "${GREEN}✅ Database dependencies installed successfully${NC}"

# Return to original directory
cd "$SCRIPT_DIR"

echo ""
echo -e "${CYAN}=================================${NC}"
echo -e "${CYAN}✅ Installation Complete!${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run './start.sh' to start the servers"
echo "2. Open http://localhost:5173 in your browser"
echo ""
