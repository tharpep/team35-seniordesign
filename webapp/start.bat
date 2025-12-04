@echo off
REM Cognitive Coach - Startup Script (Windows Batch)
REM This script starts the backend, frontend, and gen-ai API servers

echo =================================
echo ^|  Starting Cognitive Coach    ^|
echo =================================
echo.

echo =================================
echo    Starting Backend Server
echo =================================
start "Backend Server" cmd /k "cd backend && npm start"

timeout /t 2 /nobreak >nul

echo =================================
echo    Starting Frontend Server
echo =================================
start "Frontend Server" cmd /k "cd cognitive-coach && npm run dev"

timeout /t 2 /nobreak >nul

echo =================================
echo    Starting Gen-AI API Server
echo =================================
start "Gen-AI API Server" cmd /k "cd ..\gen-ai && python run start"

timeout /t 2 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo =================================
echo    Servers Starting
echo =================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo Gen-AI:   http://localhost:8000
echo.
echo Three new command windows have opened.
echo Close those windows to stop the servers.
echo.
pause
