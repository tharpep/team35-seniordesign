@echo off
REM Cognitive Coach - Startup Script (Windows Batch)
REM This script starts the backend, frontend, gen-ai API, and facial-processing servers

echo =================================
echo ^|  Starting Cognitive Coach    ^|
echo =================================
echo.

REM Pre-start validation: Check if Python environments exist
echo Validating Python environments...
set GENAI_DIR=..\gen-ai
set FACIAL_DIR=..\facial-processing

REM Determine Python path for backend (same logic as install.bat)
REM Resolve to actual Python executable path instead of 'py -3.12' format
set PYTHON_PATH=python
REM Try py launcher with version flags and resolve to actual executable
py -3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    REM Resolve 'py -3.12' to actual Python executable path
    for /f "delims=" %%i in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set PYTHON_PATH=%%i
    if "!PYTHON_PATH!"=="python" (
        REM Resolution failed, use py -3.12 format as fallback
        set PYTHON_PATH=py -3.12
    )
    goto :python_path_found
)
py -3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -3.11 -c "import sys; print(sys.executable)" 2^>nul') do set PYTHON_PATH=%%i
    if "!PYTHON_PATH!"=="python" (
        set PYTHON_PATH=py -3.11
    )
    goto :python_path_found
)
py -3.10 --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -3.10 -c "import sys; print(sys.executable)" 2^>nul') do set PYTHON_PATH=%%i
    if "!PYTHON_PATH!"=="python" (
        set PYTHON_PATH=py -3.10
    )
    goto :python_path_found
)
REM Fallback to python
:python_path_found

set VALIDATION_FAILED=0

if not exist "%GENAI_DIR%\venv" (
    echo [ERROR] Gen-AI virtual environment not found at: %GENAI_DIR%\venv
    echo Run the install script first: install.bat
    set VALIDATION_FAILED=1
) else (
    echo [OK] Gen-AI virtual environment found
)

if not exist "%FACIAL_DIR%\.venv" (
    echo [ERROR] Facial Processing virtual environment not found at: %FACIAL_DIR%\.venv
    echo Run the install script first: install.bat
    set VALIDATION_FAILED=1
) else (
    echo [OK] Facial Processing virtual environment found
)

REM Quick check for img2study dependencies (optional but helpful)
REM Use the same Python that will be used by the backend
if "%PYTHON_PATH%"=="py -3.12" (
    py -3.12 -c "import cv2" >nul 2>&1
) else if "%PYTHON_PATH%"=="py -3.11" (
    py -3.11 -c "import cv2" >nul 2>&1
) else if "%PYTHON_PATH%"=="py -3.10" (
    py -3.10 -c "import cv2" >nul 2>&1
) else (
    python -c "import cv2" >nul 2>&1
)
if %errorlevel% equ 0 (
    echo [OK] Img2study OCR dependencies found
) else (
    echo [WARNING] Img2study OCR dependencies may be missing (cv2 not found)
    echo OCR may fail. Run install script to fix: install.bat
)

if %VALIDATION_FAILED% equ 1 (
    echo.
    echo [ERROR] Validation failed. Please run the install script first.
    pause
    exit /b 1
)

echo.

echo =================================
echo    Starting Backend Server
echo =================================
REM Set PYTHON_PATH environment variable so backend uses correct Python for OCR
start "Backend Server" cmd /k "cd backend && set PYTHON_PATH=%PYTHON_PATH% && npm start"

timeout /t 2 /nobreak >nul

echo =================================
echo    Starting Frontend Server
echo =================================
start "Frontend Server" cmd /k "cd cognitive-coach && npm run dev"

timeout /t 2 /nobreak >nul

echo =================================
echo    Starting Gen-AI API Server
echo =================================
start "Gen-AI API Server" cmd /k "cd %GENAI_DIR% && python run start"

timeout /t 2 /nobreak >nul

echo =================================
echo    Starting Facial Processing Server
echo =================================
start "Facial Processing Server" cmd /k "cd %FACIAL_DIR% && .venv\Scripts\activate && python -m src.api.server"

timeout /t 2 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo =================================
echo    Servers Starting
echo =================================
echo.
echo Backend:          http://localhost:3001
echo Frontend:         http://localhost:5173
echo Gen-AI:           http://localhost:8000
echo Facial Processing: http://localhost:8001
echo.
echo Four new command windows have opened.
echo Close those windows to stop the servers.
echo.
pause
