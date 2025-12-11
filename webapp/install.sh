#!/bin/bash
# Cognitive Coach - Install Dependencies Script
# This script installs all required packages for backend, frontend, database, and Python subsystems

echo "================================="
echo "📦 Installing Cognitive Coach Dependencies"
echo "================================="
echo ""

set -e  # Exit on error

TOTAL_STEPS=7
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

# Function to get Python executable path from venv (handles Windows and Unix)
get_venv_python() {
    local venv_path="$1"
    # Check Windows layout (Scripts) first, then Unix layout (bin)
    if [ -f "$venv_path/Scripts/python.exe" ]; then
        echo "$venv_path/Scripts/python.exe"
        return 0
    elif [ -f "$venv_path/bin/python" ]; then
        echo "$venv_path/bin/python"
        return 0
    elif [ -f "$venv_path/bin/python3" ]; then
        echo "$venv_path/bin/python3"
        return 0
    fi
    return 1
}

# Function to get activate script path from venv (handles Windows and Unix)
get_venv_activate() {
    local venv_path="$1"
    # Check Windows layout (Scripts) first, then Unix layout (bin)
    if [ -f "$venv_path/Scripts/activate" ]; then
        echo "$venv_path/Scripts/activate"
        return 0
    elif [ -f "$venv_path/bin/activate" ]; then
        echo "$venv_path/bin/activate"
        return 0
    fi
    return 1
}

# Function to check Python version of existing venv
get_venv_python_version() {
    local venv_path="$1"
    local python_exe
    
    python_exe=$(get_venv_python "$venv_path")
    if [ -n "$python_exe" ]; then
        # Use simple execution without timeout to avoid MinGW pipe hangs
        local version_output
        version_output=$("$python_exe" --version 2>&1)
        
        if echo "$version_output" | grep -qE "Python ([0-9]+)\.([0-9]+)"; then
            echo "$version_output" | sed -E 's/.*Python ([0-9]+)\.([0-9]+).*/\1.\2/'
            return 0
        fi
    fi
    return 1
}

# Function to find best compatible Python version (3.12 or highest ≤3.12)
get_best_python_version() {
    # Try python3.12, python3.11, python3.10 in order
    for version in "3.12" "3.11" "3.10"; do
        if command -v "python${version}" &> /dev/null; then
            # Verify it's actually that version
            if "python${version}" --version 2>&1 | grep -q "Python ${version}"; then
                echo "${version}"
                return 0
            fi
        fi
    done
    
    # Try python3
    if command -v python3 &> /dev/null; then
        PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
        if [ -n "$PYTHON_VER" ]; then
            MAJOR=$(echo "$PYTHON_VER" | cut -d. -f1)
            MINOR=$(echo "$PYTHON_VER" | cut -d. -f2)
            if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 10 ] && [ "$MINOR" -le 12 ]; then
                echo "$PYTHON_VER"
                return 0
            fi
        fi
    fi
    
    # Try python
    if command -v python &> /dev/null; then
        PYTHON_VER=$(python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
        if [ -n "$PYTHON_VER" ]; then
            MAJOR=$(echo "$PYTHON_VER" | cut -d. -f1)
            MINOR=$(echo "$PYTHON_VER" | cut -d. -f2)
            if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 10 ] && [ "$MINOR" -le 12 ]; then
                echo "$PYTHON_VER"
                return 0
            fi
        fi
    fi
    
    return 1
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

# Check if Python is installed and find best compatible version
echo ""
echo -e "${YELLOW}Checking Python installation...${NC}"

# Find best compatible Python version
PYTHON_VER=$(get_best_python_version)
if [ -z "$PYTHON_VER" ]; then
    echo -e "${RED}❌ No compatible Python version found (3.10-3.12 required)!${NC}"
    echo "Please install Python 3.10-3.12 from https://www.python.org/"
    echo "   (Python 3.10+ is required for Facial Processing, 3.12 recommended)"
    exit 1
fi

# Determine Python command to use
if command -v "python${PYTHON_VER}" &> /dev/null; then
    PYTHON_CMD="python${PYTHON_VER}"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}✅ Using Python version: $PYTHON_VERSION${NC}"
echo -e "${GREEN}   Selected version: $PYTHON_VER (compatible with ML libraries)${NC}"

# Check if pip is available and upgrade it
# if ! $PYTHON_CMD -m pip --version &> /dev/null; then
#     echo -e "${RED}❌ pip is not available!${NC}"
#     echo "Please ensure pip is installed with Python"
#     exit 1
# fi
# PIP_VERSION=$($PYTHON_CMD -m pip --version 2>&1)
# echo -e "${GREEN}✅ pip is available: $PIP_VERSION${NC}"
# echo "Upgrading pip to latest version..."
# $PYTHON_CMD -m pip install --upgrade pip --quiet
# echo -e "${GREEN}✅ pip upgraded successfully${NC}"

# echo ""

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

# Install mobile dependencies
show_progress "Installing Mobile Dependencies"
MOBILE_DIR="$SCRIPT_DIR/../mobile/cognitive-coach"
if [ -d "$MOBILE_DIR" ]; then
    cd "$MOBILE_DIR"
    npm install
    echo -e "${GREEN}✅ Mobile dependencies installed successfully${NC}"
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}⚠️  Mobile directory not found at: $MOBILE_DIR${NC}"
fi

# Return to original directory
cd "$SCRIPT_DIR"

# Install Gen-AI Python dependencies
show_progress "Installing Gen-AI Python Dependencies"
GENAI_DIR="$SCRIPT_DIR/../gen-ai"
if [ -d "$GENAI_DIR" ]; then
    cd "$GENAI_DIR"
    echo "Setting up Gen-AI virtual environment with Python $PYTHON_VER..."
    
    # Check if venv exists and what Python version it uses
    venv_needs_recreation=false
    if [ -d "venv" ]; then
        echo "Checking existing virtual environment..."
        existing_version=$(get_venv_python_version "venv" 2>/dev/null)
        if [ "$existing_version" = "$PYTHON_VER" ]; then
            echo -e "${GREEN}✅ Existing venv uses Python $PYTHON_VER, skipping recreation${NC}"
            # Venv is correct, just run setup to ensure packages are installed
        elif [ -z "$existing_version" ]; then
            echo -e "${YELLOW}⚠️  Existing venv appears corrupted, recreating...${NC}"
            venv_needs_recreation=true
        else
            echo "Removing existing venv (Python $existing_version) to recreate with Python $PYTHON_VER..."
            venv_needs_recreation=true
        fi
    else
        venv_needs_recreation=true
    fi
    
    # Create venv only if needed
    if [ "$venv_needs_recreation" = true ]; then
        if [ -d "venv" ]; then
            rm -rf venv
        fi
        # Create venv with correct Python version
        $PYTHON_CMD -m venv venv --upgrade-deps
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to create Gen-AI virtual environment${NC}"
            cd "$SCRIPT_DIR"
            continue
        fi
    fi
    
    # Run setup using the venv's python (it will handle pip upgrade and package installation)
    VENV_PYTHON=$(get_venv_python "venv")
    if [ -n "$VENV_PYTHON" ] && [ -f "$VENV_PYTHON" ]; then
        echo "Running Gen-AI setup (this may take several minutes, especially on first run)..."
        echo "  - Installing dependencies..."
        echo "  - Health check may take 60+ seconds (downloading ML models if needed)"
        "$VENV_PYTHON" run setup
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Gen-AI dependencies installed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to install Gen-AI dependencies${NC}"
            echo "You may need to run 'python run setup' manually in gen-ai directory"
        fi
    else
        echo -e "${RED}❌ venv Python executable not found${NC}"
    fi
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}⚠️  Gen-AI directory not found at: $GENAI_DIR${NC}"
fi

# Install Facial Processing Python dependencies
show_progress "Installing Facial Processing Python Dependencies"
FACIAL_DIR="$SCRIPT_DIR/../facial-processing"
if [ -d "$FACIAL_DIR" ]; then
    cd "$FACIAL_DIR"
    echo "Setting up Facial Processing virtual environment..."
    
    # Check if uv is available
    if command -v uv &> /dev/null; then
        echo "Using uv for installation..."
        uv venv
        VENV_ACTIVATE=$(get_venv_activate ".venv")
        if [ -n "$VENV_ACTIVATE" ] && [ -f "$VENV_ACTIVATE" ]; then
            source "$VENV_ACTIVATE"
        fi
        uv pip install -e .
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Facial Processing dependencies installed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to install Facial Processing dependencies with uv${NC}"
        fi
    else
        echo "uv not found, using standard pip..."
        
        # Check if venv exists and what Python version it uses
        venv_needs_recreation=false
        if [ -d ".venv" ]; then
            existing_version=$(get_venv_python_version ".venv" 2>/dev/null)
            if [ "$existing_version" = "$PYTHON_VER" ]; then
                echo -e "${GREEN}✅ Existing .venv uses Python $PYTHON_VER, skipping recreation${NC}"
                # Venv is correct, just install/upgrade packages
            elif [ -z "$existing_version" ]; then
                echo -e "${YELLOW}⚠️  Existing .venv appears corrupted, recreating...${NC}"
                venv_needs_recreation=true
            else
                echo "Removing existing .venv (Python $existing_version) to recreate with Python $PYTHON_VER..."
                venv_needs_recreation=true
            fi
        else
            echo "Creating virtual environment with Python $PYTHON_VER..."
            venv_needs_recreation=true
        fi
        
        # Create venv only if needed
        if [ "$venv_needs_recreation" = true ]; then
            if [ -d ".venv" ]; then
                rm -rf .venv
            fi
            $PYTHON_CMD -m venv .venv --upgrade-deps
            if [ $? -ne 0 ]; then
                echo -e "${RED}❌ Failed to create Facial Processing virtual environment${NC}"
                cd "$SCRIPT_DIR"
                continue
            fi
        fi
        
        VENV_ACTIVATE=$(get_venv_activate ".venv")
        VENV_PYTHON=$(get_venv_python ".venv")
        if [ -n "$VENV_ACTIVATE" ] && [ -f "$VENV_ACTIVATE" ]; then
            source "$VENV_ACTIVATE"
            # Always ensure pip is available and up to date
            echo "Ensuring pip is available in virtual environment..."
            "$VENV_PYTHON" -m ensurepip --default-pip 2>/dev/null || true
            "$VENV_PYTHON" -m pip install --upgrade pip --quiet
            "$VENV_PYTHON" -m pip install -e .
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Facial Processing dependencies installed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to install Facial Processing dependencies${NC}"
                echo -e "${YELLOW}   Common issues:${NC}"
                echo -e "${YELLOW}   - MediaPipe may not be available for your platform/architecture${NC}"
                echo -e "${YELLOW}   - Try installing manually: cd facial-processing && source .venv/bin/activate && pip install -e .${NC}"
            fi
        else
            echo -e "${RED}❌ .venv activate script not found${NC}"
        fi
    fi
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}⚠️  Facial Processing directory not found at: $FACIAL_DIR${NC}"
fi

# Install Img2study Python dependencies (fixes OCR error)
show_progress "Installing Img2study Python Dependencies"
IMG2STUDY_DIR="$SCRIPT_DIR/../img2study"
if [ -d "$IMG2STUDY_DIR" ]; then
    REQUIREMENTS_FILE="$IMG2STUDY_DIR/requirements-working.txt"
    if [ -f "$REQUIREMENTS_FILE" ]; then
        cd "$IMG2STUDY_DIR"
        echo "Installing OCR dependencies (opencv-python, paddleocr, etc.)..."
        
        # Check if root .venv exists and use it, otherwise use system Python
        ROOT_VENV_PYTHON="$SCRIPT_DIR/../.venv/bin/python"
        if [ -f "$ROOT_VENV_PYTHON" ]; then
            echo "Using root virtual environment Python for installation..."
            IMG2STUDY_PYTHON="$ROOT_VENV_PYTHON"
        else
            echo "Using system Python $PYTHON_VER for installation..."
            # Get absolute path to system Python to avoid venv interference
            IMG2STUDY_PYTHON=$(command -v "$PYTHON_CMD" | head -1)
            # Fallback to explicit system paths if needed
            if [[ "$IMG2STUDY_PYTHON" == *".venv"* ]] || [[ "$IMG2STUDY_PYTHON" == *"venv"* ]]; then
                for syspath in "/usr/local/bin/python$PYTHON_VER" "/Library/Frameworks/Python.framework/Versions/$PYTHON_VER/bin/python$PYTHON_VER" "/usr/bin/python3"; do
                    if [ -f "$syspath" ]; then
                        IMG2STUDY_PYTHON="$syspath"
                        break
                    fi
                done
            fi
        fi
        echo "Note: PaddlePaddle may take several minutes to download..."
        echo "Installing with: $IMG2STUDY_PYTHON"
        # Use absolute path and unset any interfering environment variables
        unset PYTHONPATH VIRTUAL_ENV PATH
        export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        "$IMG2STUDY_PYTHON" -m pip install --user -r requirements-working.txt
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Img2study dependencies installed successfully${NC}"
            echo -e "${GREEN}   This fixes the OCR 'ModuleNotFoundError: No module named cv2' error${NC}"
        else
            echo -e "${RED}❌ Failed to install Img2study dependencies${NC}"
            echo -e "${YELLOW}   Common issues:${NC}"
            echo -e "${YELLOW}   - PaddlePaddle may not be available for your Python version/platform${NC}"
            echo -e "${YELLOW}   - Try installing packages individually:${NC}"
            echo -e "${YELLOW}     pip install opencv-python pillow numpy requests${NC}"
            echo -e "${YELLOW}     pip install paddleocr==2.10.0${NC}"
            echo -e "${YELLOW}     pip install paddlepaddle (may fail on some platforms)${NC}"
            echo -e "${YELLOW}   OCR may still work without PaddlePaddle if other packages installed${NC}"
        fi
        cd "$SCRIPT_DIR"
    else
        echo -e "${YELLOW}⚠️  requirements-working.txt not found in img2study directory${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Img2study directory not found at: $IMG2STUDY_DIR${NC}"
fi

# Return to original directory
cd "$SCRIPT_DIR"

echo ""
echo -e "${CYAN}=================================${NC}"
echo -e "${CYAN}✅ Installation Complete!${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""
echo -e "${YELLOW}Installed components:${NC}"
echo -e "${GREEN}  ✓ Node.js dependencies (backend, frontend, database, mobile)${NC}"
echo -e "${GREEN}  ✓ Gen-AI Python dependencies${NC}"
echo -e "${GREEN}  ✓ Facial Processing Python dependencies${NC}"
echo -e "${GREEN}  ✓ Img2study OCR dependencies (fixes OCR errors)${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run './start.sh' to start the servers"
echo "2. Open http://localhost:5173 in your browser"
echo ""
