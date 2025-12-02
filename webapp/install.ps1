# Cognitive Coach - Install Dependencies Script
# This script installs all required packages for backend, frontend, and database

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📦 Installing Cognitive Coach Dependencies" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$totalSteps = 3
$currentStep = 0

# Function to display progress
function Show-Progress {
    param([string]$Task, [int]$Step)
    Write-Host ""
    Write-Host "[$Step/$totalSteps] $Task" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Gray
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Install backend dependencies
$currentStep++
Show-Progress "Installing Backend Dependencies" $currentStep
Set-Location "$PSScriptRoot\backend"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
}

# Install frontend dependencies
$currentStep++
Show-Progress "Installing Frontend Dependencies" $currentStep
Set-Location "$PSScriptRoot\cognitive-coach"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
}

# Install database dependencies
$currentStep++
Show-Progress "Installing Database Dependencies" $currentStep
Set-Location "$PSScriptRoot\database"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install database dependencies" -ForegroundColor Red
}

# Return to original directory
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Installation Complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run '.\start.ps1' or 'start.bat' to start the servers" -ForegroundColor White
Write-Host "2. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
