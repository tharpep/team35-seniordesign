@echo off
REM Cognitive Coach - Startup Script (Windows Batch)
REM This script starts both the backend and frontend servers

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

timeout /t 3 /nobreak >nul

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
echo.
echo Two new command windows have opened.
echo Close those windows to stop the servers.
echo.
pause
