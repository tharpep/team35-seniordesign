@echo off
setlocal enabledelayedexpansion
REM Cognitive Coach - Install Dependencies Script
REM This script installs all required packages for backend, frontend, database, and Python subsystems

echo =================================
echo   Installing Dependencies
echo =================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to get Node.js version
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    echo.
    pause
    exit /b 1
)
echo [OK] npm is installed
echo.

REM Check if Python is installed and find best compatible version
echo Checking Python installation...

REM Try to find Python 3.12, 3.11, or 3.10 using py launcher
set PYTHON_VER=
set PYTHON_CMD=

REM Try py launcher with version flags
py -3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_VER=3.12
    set PYTHON_CMD=py -3.12
    goto :python_found
)

py -3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_VER=3.11
    set PYTHON_CMD=py -3.11
    goto :python_found
)

py -3.10 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_VER=3.10
    set PYTHON_CMD=py -3.10
    goto :python_found
)

REM Fallback to system python (warn if version might be incompatible)
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION_OUT=%%i
    echo [WARNING] Using system python: %PYTHON_VERSION_OUT%
    echo    If installation fails, install Python 3.10-3.12 and use py launcher
    set PYTHON_VER=system
    set PYTHON_CMD=python
    goto :python_found
)

echo [ERROR] No compatible Python version found (3.10-3.12 required)!
echo Please install Python 3.10-3.12 from https://www.python.org/
echo    (Python 3.10+ is required for Facial Processing, 3.12 recommended)
echo.
pause
exit /b 1

:python_found
for /f "tokens=*" %%i in ('%PYTHON_CMD% --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Using Python version: %PYTHON_VERSION%
echo    Selected version: %PYTHON_VER% (compatible with ML libraries)

REM Check if pip is available and upgrade it
%PYTHON_CMD% -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pip is not available!
    echo Please ensure pip is installed with Python
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('%PYTHON_CMD% -m pip --version 2^>^&1') do set PIP_VERSION=%%i
echo [OK] pip is available: %PIP_VERSION%
echo Upgrading pip to latest version...
%PYTHON_CMD% -m pip install --upgrade pip --quiet
echo [OK] pip upgraded successfully
echo.

REM Install backend dependencies
echo =================================
echo [1/3] Installing Backend Dependencies
echo =================================
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
cd ..
echo.

REM Install frontend dependencies
echo =================================
echo [2/3] Installing Frontend Dependencies
echo =================================
cd cognitive-coach
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..
echo.

REM Install database dependencies
echo =================================
echo [3/6] Installing Database Dependencies
echo =================================
cd database
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install database dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Database dependencies installed
cd ..
echo.

REM Install Gen-AI Python dependencies
echo =================================
echo [4/6] Installing Gen-AI Python Dependencies
echo =================================
cd ..\gen-ai
if exist "run" (
    echo Setting up Gen-AI virtual environment with Python %PYTHON_VER%
    
    REM Check if venv exists and what Python version it uses
    set VENV_NEEDS_RECREATION=1
    if exist "venv\Scripts\python.exe" (
        echo Checking existing virtual environment
        REM Check existing venv Python version (with error handling to prevent hanging)
        set EXISTING_VERSION=
        set EXISTING_MAJOR=
        set EXISTING_MINOR=
        REM Try to get version, but don't hang if venv is broken
        venv\Scripts\python.exe --version >nul 2>&1
        if %errorlevel% equ 0 (
            REM Python executable works, try to get version string
            for /f "tokens=2" %%i in ('venv\Scripts\python.exe --version 2^>^&1') do set EXISTING_VERSION=%%i
            if not "!EXISTING_VERSION!"=="" (
                for /f "tokens=1,2 delims=." %%a in ("!EXISTING_VERSION!") do (
                    set EXISTING_MAJOR=%%a
                    set EXISTING_MINOR=%%b
                )
                REM Extract just major.minor (e.g., "3.12" from "3.12.10")
                if "!EXISTING_MAJOR!.!EXISTING_MINOR!"=="%PYTHON_VER%" (
                    echo [OK] Existing venv uses Python %PYTHON_VER%, skipping recreation
                    set VENV_NEEDS_RECREATION=0
                ) else (
                    echo Removing existing venv - Python !EXISTING_MAJOR!.!EXISTING_MINOR! - to recreate with Python %PYTHON_VER%
                    set VENV_NEEDS_RECREATION=1
                )
            ) else (
                echo [WARNING] Could not determine venv Python version, recreating
                set VENV_NEEDS_RECREATION=1
            )
        ) else (
            echo [WARNING] Existing venv appears corrupted, recreating
            set VENV_NEEDS_RECREATION=1
        )
    ) else (
        set VENV_NEEDS_RECREATION=1
    )
    
    REM Create venv only if needed
    if !VENV_NEEDS_RECREATION! equ 1 (
        if exist "venv" (
            rmdir /s /q venv
        )
        REM Create venv with correct Python version
        %PYTHON_CMD% -m venv venv
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to create Gen-AI virtual environment
        ) else (
            REM Run setup using the venv's python (it will handle pip upgrade and package installation)
            if exist "venv\Scripts\python.exe" (
                echo Running Gen-AI setup (this may take several minutes, especially on first run)
                echo   - Installing dependencies
                echo   - Health check may take 60+ seconds (downloading ML models if needed)
                venv\Scripts\python.exe run setup
                if %errorlevel% equ 0 (
                    echo [OK] Gen-AI dependencies installed successfully
                ) else (
                    echo [WARNING] Failed to install Gen-AI dependencies
                    echo You may need to run 'python run setup' manually in gen-ai directory
                )
            ) else (
                echo [ERROR] venv\Scripts\python.exe not found
            )
        )
    ) else (
        REM Venv exists and is correct version, just run setup
        if exist "venv\Scripts\python.exe" (
            venv\Scripts\python.exe run setup
            if %errorlevel% equ 0 (
                echo [OK] Gen-AI dependencies installed successfully
            ) else (
                echo [WARNING] Failed to install Gen-AI dependencies
                echo You may need to run 'python run setup' manually in gen-ai directory
            )
        ) else (
            echo [ERROR] venv\Scripts\python.exe not found
        )
    )
) else (
    echo [WARNING] Gen-AI directory or run script not found
)
cd ..\webapp
echo.

REM Install Facial Processing Python dependencies
echo =================================
echo [5/6] Installing Facial Processing Python Dependencies
echo =================================
cd ..\facial-processing
if exist "pyproject.toml" (
    echo Setting up Facial Processing virtual environment...
    
    REM Check if uv is available
    uv --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Using uv for installation...
        uv venv
        call .venv\Scripts\activate.bat
        uv pip install -e .
        if %errorlevel% equ 0 (
            echo [OK] Facial Processing dependencies installed successfully
        ) else (
            echo [ERROR] Failed to install Facial Processing dependencies with uv
        )
    ) else (
        echo uv not found, using standard pip...
        
        REM Check if venv exists and what Python version it uses
        set VENV_NEEDS_RECREATION=1
        if exist ".venv\Scripts\python.exe" (
            REM Check existing venv Python version (with error handling to prevent hanging)
            set EXISTING_VERSION=
            set EXISTING_MAJOR=
            set EXISTING_MINOR=
            REM Try to get version, but don't hang if venv is broken
            .venv\Scripts\python.exe --version >nul 2>&1
            if %errorlevel% equ 0 (
                REM Python executable works, try to get version string
                for /f "tokens=2" %%i in ('.venv\Scripts\python.exe --version 2^>^&1') do set EXISTING_VERSION=%%i
                if not "!EXISTING_VERSION!"=="" (
                    for /f "tokens=1,2 delims=." %%a in ("!EXISTING_VERSION!") do (
                        set EXISTING_MAJOR=%%a
                        set EXISTING_MINOR=%%b
                    )
                    REM Extract just major.minor (e.g., "3.12" from "3.12.10")
                    if "!EXISTING_MAJOR!.!EXISTING_MINOR!"=="%PYTHON_VER%" (
                        echo [OK] Existing .venv uses Python %PYTHON_VER%, skipping recreation
                        set VENV_NEEDS_RECREATION=0
                    ) else (
                        echo Removing existing .venv - Python !EXISTING_MAJOR!.!EXISTING_MINOR! - to recreate with Python %PYTHON_VER%
                        set VENV_NEEDS_RECREATION=1
                    )
                    ) else (
                        echo [WARNING] Could not determine venv Python version, recreating
                        set VENV_NEEDS_RECREATION=1
                    )
            ) else (
                echo [WARNING] Existing .venv appears corrupted, recreating
                set VENV_NEEDS_RECREATION=1
            )
        ) else (
            echo Creating virtual environment with Python %PYTHON_VER%
            set VENV_NEEDS_RECREATION=1
        )
        
        REM Create venv only if needed
        if !VENV_NEEDS_RECREATION! equ 1 (
            if exist ".venv" (
                rmdir /s /q .venv
            )
            %PYTHON_CMD% -m venv .venv
            if %errorlevel% neq 0 (
                echo [ERROR] Failed to create Facial Processing virtual environment
            ) else (
                call .venv\Scripts\activate.bat
                REM Only upgrade pip if we just created the venv
                echo Upgrading pip in virtual environment...
                .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
                .venv\Scripts\python.exe -m pip install -e .
                if %errorlevel% equ 0 (
                    echo [OK] Facial Processing dependencies installed successfully
                ) else (
                    echo [ERROR] Failed to install Facial Processing dependencies
                    echo Common issues:
                    echo   - MediaPipe may not be available for your platform/architecture
                    echo   - Try installing manually: cd facial-processing ^&^& .venv\Scripts\activate ^&^& pip install -e .
                )
            )
        ) else (
            REM Venv exists and is correct version, just install/upgrade packages
            call .venv\Scripts\activate.bat
            .venv\Scripts\python.exe -m pip install -e .
            if %errorlevel% equ 0 (
                echo [OK] Facial Processing dependencies installed successfully
            ) else (
                echo [ERROR] Failed to install Facial Processing dependencies
                echo Common issues:
                echo   - MediaPipe may not be available for your platform/architecture
                echo   - Try installing manually: cd facial-processing ^&^& .venv\Scripts\activate ^&^& pip install -e .
            )
        )
    )
) else (
    echo [WARNING] Facial Processing directory or pyproject.toml not found
)
cd ..\webapp
echo.

REM Install Img2study Python dependencies (fixes OCR error)
echo =================================
echo [6/6] Installing Img2study Python Dependencies
echo =================================
cd ..\img2study
if exist "requirements-working.txt" (
    echo Installing OCR dependencies (opencv-python, paddleocr, etc.)
    echo Using Python %PYTHON_VER% for installation
    echo Note: PaddlePaddle may take several minutes to download
    %PYTHON_CMD% -m pip install -r requirements-working.txt
    if %errorlevel% equ 0 (
        echo [OK] Img2study dependencies installed successfully
        echo This fixes the OCR 'ModuleNotFoundError: No module named cv2' error
    ) else (
        echo [ERROR] Failed to install Img2study dependencies
        echo Common issues:
        echo   - PaddlePaddle may not be available for your Python version/platform
        echo   - Try installing packages individually:
        echo     pip install opencv-python pillow numpy requests
        echo     pip install paddleocr==2.10.0
        echo     pip install paddlepaddle (may fail on some platforms)
        echo   OCR may still work without PaddlePaddle if other packages installed
    )
) else (
    echo [WARNING] requirements-working.txt not found in img2study directory
)
cd ..\webapp
echo.

echo =================================
echo   Installation Complete!
echo =================================
echo.
echo Installed components:
echo   [OK] Node.js dependencies (backend, frontend, database)
echo   [OK] Gen-AI Python dependencies
echo   [OK] Facial Processing Python dependencies
echo   [OK] Img2study OCR dependencies (fixes OCR errors)
echo.
echo Next steps:
echo 1. Run 'start.bat' to start the servers
echo 2. Open http://localhost:5173 in your browser
echo.
pause
