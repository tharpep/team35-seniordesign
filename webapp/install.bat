@echo off
REM Cognitive Coach - Install Dependencies Script
REM This script installs all required packages for backend, frontend, and database

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

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm version: %NPM_VERSION%
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
echo [3/3] Installing Database Dependencies
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

echo =================================
echo   Installation Complete!
echo =================================
echo.
echo Next steps:
echo 1. Run 'start.bat' to start the servers
echo 2. Open http://localhost:5173 in your browser
echo.
pause
