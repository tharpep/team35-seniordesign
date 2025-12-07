# Cognitive Coach - Startup Script
# This script starts the backend, frontend, and gen-ai API servers

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Cognitive Coach" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow
$backendPort = 3001
$frontendPort = 5173
$genaiPort = 8000

if (Test-Port -Port $backendPort) {
    Write-Host "⚠️  Port $backendPort is already in use. Backend may already be running." -ForegroundColor Yellow
}

if (Test-Port -Port $frontendPort) {
    Write-Host "⚠️  Port $frontendPort is already in use. Frontend may already be running." -ForegroundColor Yellow
}

if (Test-Port -Port $genaiPort) {
    Write-Host "⚠️  Port $genaiPort is already in use. Gen-AI API may already be running." -ForegroundColor Yellow
}

Write-Host ""

# Start backend server
Write-Host "=================================" -ForegroundColor Green
Write-Host "📦 Starting Backend Server" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host '🔧 Backend Server' -ForegroundColor Green; npm start"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start frontend server
Write-Host "=================================" -ForegroundColor Blue
Write-Host "🎨 Starting Frontend Server" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\cognitive-coach'; Write-Host '🎨 Frontend Server' -ForegroundColor Blue; npm run dev"

# Wait for frontend to start
Start-Sleep -Seconds 2

# Start Gen-AI API server
Write-Host "=================================" -ForegroundColor Magenta
Write-Host "🤖 Starting Gen-AI API Server" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
$genaiPath = Join-Path $PSScriptRoot "..\gen-ai"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$genaiPath'; Write-Host '🤖 Gen-AI API Server' -ForegroundColor Magenta; python run start"

# Wait for gen-ai to start
Start-Sleep -Seconds 2

# Open the web browser
Write-Host ""
Write-Host "🌐 Opening browser..." -ForegroundColor Magenta
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Servers Starting" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host "Gen-AI:   http://localhost:8000" -ForegroundColor Magenta
Write-Host ""
Write-Host "Three new PowerShell windows have opened." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
