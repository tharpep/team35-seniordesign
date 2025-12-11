# Cognitive Coach - Startup Script
# This script starts the backend, frontend, gen-ai API, and facial-processing servers

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Cognitive Coach" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use (using .NET sockets for speed)
function Test-Port {
    param([int]$Port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(100, $false)
        if ($wait) {
            $tcpClient.EndConnect($connect)
            $tcpClient.Close()
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Pre-start validation: Check if Python environments exist
Write-Host "Validating Python environments..." -ForegroundColor Yellow
$genaiPath = Join-Path $PSScriptRoot "..\gen-ai"
$facialPath = Join-Path $PSScriptRoot "..\facial-processing"

$genaiVenv = Join-Path $genaiPath "venv"
$facialVenv = Join-Path $facialPath ".venv"

# Determine Python path for backend (same logic as install script)
# Resolve to actual Python executable path instead of 'py -3.12' format
$PYTHON_PATH = "python"

# Check for root .venv first (preferred)
$rootVenvPython = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
if (Test-Path $rootVenvPython) {
    $PYTHON_PATH = $rootVenvPython
    Write-Host "✅ Using root virtual environment: $PYTHON_PATH" -ForegroundColor Green
} else {
    try {
        $pyList = py --list 2>&1
        if ($LASTEXITCODE -eq 0) {
            $versions = @()
            foreach ($line in $pyList) {
                $line = $line.Trim()
                if ($line -match "-V:(\d+)\.(\d+)") {
                    $major = [int]$matches[1]
                    $minor = [int]$matches[2]
                    if ($major -eq 3 -and $minor -ge 10 -and $minor -le 12) {
                        $versionStr = "$major.$minor"
                        if ($versions -notcontains $versionStr) {
                            $versions += $versionStr
                        }
                    }
                }
            }
            if ($versions.Count -gt 0) {
                $bestVersion = ($versions | Sort-Object { [version]$_ } -Descending)[0]
                # Resolve 'py -3.12' to actual Python executable path
                try {
                    $pythonPath = py -$bestVersion -c "import sys; print(sys.executable)" 2>&1
                    if ($LASTEXITCODE -eq 0 -and $pythonPath) {
                        $PYTHON_PATH = $pythonPath.Trim()
                    } else {
                        # Fallback to py -3.12 format if resolution fails
                        $PYTHON_PATH = "py -$bestVersion"
                    }
                } catch {
                    # Fallback to py -3.12 format if resolution fails
                    $PYTHON_PATH = "py -$bestVersion"
                }
            }
        }
    } catch {
        # Fallback to python
    }
}

$validationFailed = $false

if (-not (Test-Path $genaiVenv)) {
    Write-Host "❌ Gen-AI virtual environment not found at: $genaiVenv" -ForegroundColor Red
    Write-Host "   Run the install script first: .\install.ps1" -ForegroundColor Yellow
    $validationFailed = $true
} else {
    Write-Host "✅ Gen-AI virtual environment found" -ForegroundColor Green
}

if (-not (Test-Path $facialVenv)) {
    Write-Host "❌ Facial Processing virtual environment not found at: $facialVenv" -ForegroundColor Red
    Write-Host "   Run the install script first: .\install.ps1" -ForegroundColor Yellow
    $validationFailed = $true
} else {
    Write-Host "✅ Facial Processing virtual environment found" -ForegroundColor Green
}

# Quick check for img2study dependencies (optional but helpful)
try {
    # Use the same Python that will be used by the backend
    $pythonCheckCmd = if ($PYTHON_PATH -eq "python") { "python" } else { $PYTHON_PATH -split ' ' }
    $null = & $pythonCheckCmd[0] ($pythonCheckCmd[1..($pythonCheckCmd.Length-1)] + @('-c', 'import cv2')) 2>&1
    Write-Host "✅ Img2study OCR dependencies found" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Img2study OCR dependencies may be missing (cv2 not found)" -ForegroundColor Yellow
    Write-Host "   OCR may fail. Run install script to fix: .\install.ps1" -ForegroundColor Yellow
}

if ($validationFailed) {
    Write-Host ""
    Write-Host "❌ Validation failed. Please run the install script first." -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow
$backendPort = 3001
$frontendPort = 5173
$genaiPort = 8000
$facialPort = 8001

if (Test-Port -Port $backendPort) {
    Write-Host "⚠️  Port $backendPort is already in use. Backend may already be running." -ForegroundColor Yellow
}

if (Test-Port -Port $frontendPort) {
    Write-Host "⚠️  Port $frontendPort is already in use. Frontend may already be running." -ForegroundColor Yellow
}

if (Test-Port -Port $genaiPort) {
    Write-Host "⚠️  Port $genaiPort is already in use. Gen-AI API may already be running." -ForegroundColor Yellow
}

if (Test-Port -Port $facialPort) {
    Write-Host "⚠️  Port $facialPort is already in use. Facial Processing API may already be running." -ForegroundColor Yellow
}

Write-Host ""

# Start backend server
Write-Host "=================================" -ForegroundColor Green
Write-Host "📦 Starting Backend Server" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
# Set PYTHON_PATH environment variable so backend uses correct Python for OCR
Write-Host "Setting PYTHON_PATH to: $PYTHON_PATH" -ForegroundColor Yellow
# Escape the PYTHON_PATH value for use in the command string
$escapedPythonPath = $PYTHON_PATH -replace "'", "''"
$backendScript = "cd '$PSScriptRoot\backend'; `$env:PYTHON_PATH='$escapedPythonPath'; Write-Host '🔧 Backend Server' -ForegroundColor Green; Write-Host 'PYTHON_PATH=' `$env:PYTHON_PATH -ForegroundColor Gray; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

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
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$genaiPath'; Write-Host '🤖 Gen-AI API Server' -ForegroundColor Magenta; python run start"

# Wait for gen-ai to start
Start-Sleep -Seconds 2

# Start Facial Processing API server
Write-Host "=================================" -ForegroundColor DarkCyan
Write-Host "👁️  Starting Facial Processing Server" -ForegroundColor DarkCyan
Write-Host "=================================" -ForegroundColor DarkCyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$facialPath'; Write-Host '👁️  Facial Processing Server' -ForegroundColor DarkCyan; .venv\Scripts\activate; python -m src.api.server"

# Wait for facial processing to start
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
Write-Host "Backend:          http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend:         http://localhost:5173" -ForegroundColor Blue
Write-Host "Gen-AI:           http://localhost:8000" -ForegroundColor Magenta
Write-Host "Facial Processing: http://localhost:8001" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "Four new PowerShell windows have opened." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
