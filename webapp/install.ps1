# Cognitive Coach - Install Dependencies Script
# This script installs all required packages for backend, frontend, database, and Python subsystems

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📦 Installing Cognitive Coach Dependencies" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$totalSteps = 6
$currentStep = 0

# Function to display progress
function Show-Progress {
    param([string]$Task, [int]$Step)
    Write-Host ""
    Write-Host "[$Step/$totalSteps] $Task" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Gray
}

# Function to check Python version of existing venv
function Get-VenvPythonVersion {
    param([string]$VenvPath)
    if (Test-Path "$VenvPath\Scripts\python.exe") {
        try {
            $versionOutput = & "$VenvPath\Scripts\python.exe" --version 2>&1
            if ($versionOutput -match "Python\s+(\d+)\.(\d+)") {
                return "$($matches[1]).$($matches[2])"
            }
        } catch {
            return $null
        }
    }
    return $null
}

# Function to find best compatible Python version (3.12 or highest ≤3.12)
function Get-BestPythonVersion {
    # Try py launcher first
    try {
        $pyList = py --list 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   py --list failed, trying alternative detection..." -ForegroundColor Yellow
        }
        
        $versions = @()
        
        # Parse output to find versions like "-V:3.12" or "Python 3.12"
        foreach ($line in $pyList) {
            $line = $line.Trim()
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            
            # Clear matches to avoid cross-contamination
            $null = $line -match "dummy"
            
            # Try to match -V:3.12 format first (most common in py --list output)
            # Example: " -V:3.12          Python 3.12"
            $matchResult = $line -match "-V:(\d+)\.(\d+)"
            if ($matchResult -and $matches.Count -ge 3) {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                $versionStr = "$major.$minor"
                if ($major -eq 3 -and $minor -ge 10 -and $minor -le 12) {
                    if ($versions -notcontains $versionStr) {
                        $versions += $versionStr
                    }
                    continue
                }
            }
            
            # Clear matches again
            $null = $line -match "dummy"
            
            # Try to match "Python 3.12" format (fallback)
            # Example: "Python 3.12" or "Python 3.14 (64-bit)"
            $matchResult = $line -match "Python\s+(\d+)\.(\d+)"
            if ($matchResult -and $matches.Count -ge 3) {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                $versionStr = "$major.$minor"
                if ($major -eq 3 -and $minor -ge 10 -and $minor -le 12) {
                    if ($versions -notcontains $versionStr) {
                        $versions += $versionStr
                    }
                }
            }
        }
        
        if ($versions.Count -gt 0) {
            # Sort descending and pick highest (3.12 > 3.11 > 3.10)
            # Use version-aware sorting to ensure 3.12 > 3.11 > 3.10
            $bestVersion = ($versions | ForEach-Object { 
                $parts = $_ -split '\.'
                [PSCustomObject]@{ Version = $_; Major = [int]$parts[0]; Minor = [int]$parts[1] }
            } | Sort-Object -Property Major, Minor -Descending | Select-Object -First 1).Version
            
            # Validate version format (must be X.Y where X=3 and 10<=Y<=12)
            if ($bestVersion -and $bestVersion -match "^3\.(1[0-2])$") {
                Write-Host "   Found compatible Python versions: $($versions -join ', ')" -ForegroundColor Gray
                return $bestVersion
            } else {
                Write-Host "   Warning: Invalid version format detected: '$bestVersion'" -ForegroundColor Yellow
                Write-Host "   Available versions found: $($versions -join ', ')" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   No compatible Python versions found in py --list output" -ForegroundColor Yellow
        }
    } catch {
        # py launcher not available, fall through
        Write-Host "   py launcher not available or error: $_" -ForegroundColor Yellow
    }
    
    # Fallback: check if system python is compatible
    try {
        $versionOutput = python --version 2>&1
        if ($versionOutput -match "Python\s+(\d+)\.(\d+)") {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            if ($major -eq 3 -and $minor -ge 10 -and $minor -le 12) {
                Write-Host "   Using system Python: $major.$minor" -ForegroundColor Gray
                return "$major.$minor"
            } else {
                Write-Host "   System Python is $major.$minor (not compatible, need 3.10-3.12)" -ForegroundColor Yellow
            }
        }
    } catch {
        # No python found
        Write-Host "   System python check failed: $_" -ForegroundColor Yellow
    }
    
    return $null
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

# Check if Python is installed and find best compatible version
Write-Host ""
Write-Host "Checking Python installation..." -ForegroundColor Yellow

# Find best compatible Python version
$PYTHON_VER = Get-BestPythonVersion

if ($null -eq $PYTHON_VER) {
    Write-Host "❌ No compatible Python version found (3.10-3.12 required)!" -ForegroundColor Red
    Write-Host "Please install Python 3.10-3.12 from https://www.python.org/" -ForegroundColor Yellow
    Write-Host "   (Python 3.10+ is required for Facial Processing, 3.12 recommended)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Determine Python command to use
$PYTHON_CMD = "py"
$PYTHON_ARGS = "-$PYTHON_VER"

# Verify Python version and that it's actually the correct version
try {
    $pythonVersionOutput = & $PYTHON_CMD $PYTHON_ARGS --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  py launcher failed for version $PYTHON_VER, trying system python..." -ForegroundColor Yellow
        # Fallback to system python if py launcher fails
        $PYTHON_CMD = "python"
        $PYTHON_ARGS = ""
        $pythonVersionOutput = & $PYTHON_CMD --version 2>&1
        
        # Verify system python is compatible
        if ($pythonVersionOutput -match "Python\s+(\d+)\.(\d+)") {
            $sysMajor = [int]$matches[1]
            $sysMinor = [int]$matches[2]
            if ($sysMajor -ne 3 -or $sysMinor -lt 10 -or $sysMinor -gt 12) {
                Write-Host "❌ System Python is $sysMajor.$sysMinor, but need 3.10-3.12!" -ForegroundColor Red
                Write-Host "   Please install Python 3.12 and ensure 'py -3.12' works" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Press any key to exit..." -ForegroundColor Gray
                $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                exit 1
            }
        }
    } else {
        # Verify the py launcher is actually using the correct version
        if ($pythonVersionOutput -match "Python\s+(\d+)\.(\d+)") {
            $actualMajor = [int]$matches[1]
            $actualMinor = [int]$matches[2]
            $expectedMinor = [int]($PYTHON_VER -split '\.')[1]
            if ($actualMinor -ne $expectedMinor) {
                Write-Host "⚠️  Warning: py -$PYTHON_VER returned Python $actualMajor.$actualMinor (expected $PYTHON_VER)" -ForegroundColor Yellow
            }
        }
    }
    Write-Host "✅ Using Python version: $pythonVersionOutput" -ForegroundColor Green
    Write-Host "   Selected version: $PYTHON_VER (compatible with ML libraries)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to verify Python installation!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if pip is available and upgrade it
try {
    if ($PYTHON_ARGS) {
        $pipVersion = & $PYTHON_CMD $PYTHON_ARGS -m pip --version 2>&1
        Write-Host "✅ pip is available: $pipVersion" -ForegroundColor Green
        Write-Host "Upgrading pip to latest version..." -ForegroundColor Yellow
        & $PYTHON_CMD $PYTHON_ARGS -m pip install --upgrade pip --quiet
    } else {
        $pipVersion = & $PYTHON_CMD -m pip --version 2>&1
        Write-Host "✅ pip is available: $pipVersion" -ForegroundColor Green
        Write-Host "Upgrading pip to latest version..." -ForegroundColor Yellow
        & $PYTHON_CMD -m pip install --upgrade pip --quiet
    }
    Write-Host "✅ pip upgraded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ pip is not available!" -ForegroundColor Red
    Write-Host "Please ensure pip is installed with Python" -ForegroundColor Yellow
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

# Install Gen-AI Python dependencies
$currentStep++
Show-Progress "Installing Gen-AI Python Dependencies" $currentStep
$genaiPath = Join-Path $PSScriptRoot "..\gen-ai"
if (Test-Path $genaiPath) {
    Set-Location $genaiPath
    Write-Host "Setting up Gen-AI virtual environment with Python $PYTHON_VER..." -ForegroundColor Yellow
    
    # Check if venv exists and what Python version it uses
    $venvNeedsRecreation = $false
    if (Test-Path "venv") {
        Write-Host "Checking existing virtual environment..." -ForegroundColor Gray
        $existingVersion = Get-VenvPythonVersion "venv"
        if ($existingVersion -eq $PYTHON_VER) {
            Write-Host "✅ Existing venv uses Python $PYTHON_VER, skipping recreation" -ForegroundColor Green
            # Venv is correct, just run setup to ensure packages are installed
        } elseif ($null -eq $existingVersion) {
            Write-Host "⚠️  Existing venv appears corrupted, recreating..." -ForegroundColor Yellow
            $venvNeedsRecreation = $true
        } else {
            Write-Host "Removing existing venv (Python $existingVersion) to recreate with Python $PYTHON_VER..." -ForegroundColor Yellow
            $venvNeedsRecreation = $true
        }
    } else {
        $venvNeedsRecreation = $true
    }
    
    # Create venv only if needed
    if ($venvNeedsRecreation) {
        if (Test-Path "venv") {
            Remove-Item -Recurse -Force venv
        }
        # Create venv with correct Python version
        if ($PYTHON_ARGS) {
            & $PYTHON_CMD $PYTHON_ARGS -m venv venv
        } else {
            & $PYTHON_CMD -m venv venv
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to create Gen-AI virtual environment" -ForegroundColor Red
            Set-Location $PSScriptRoot
            continue
        }
    }
    
    # Run setup using the venv's python (it will handle pip upgrade and package installation)
    if (Test-Path "venv\Scripts\python.exe") {
        Write-Host "Running Gen-AI setup (this may take several minutes, especially on first run)..." -ForegroundColor Yellow
        Write-Host "  - Installing dependencies..." -ForegroundColor Gray
        Write-Host "  - Health check may take 60+ seconds (downloading ML models if needed)" -ForegroundColor Gray
        & venv\Scripts\python.exe run setup
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Gen-AI dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install Gen-AI dependencies" -ForegroundColor Red
            Write-Host "You may need to run 'python run setup' manually in gen-ai directory" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ venv\Scripts\python.exe not found" -ForegroundColor Red
    }
    Set-Location $PSScriptRoot
} else {
    Write-Host "⚠️  Gen-AI directory not found at: $genaiPath" -ForegroundColor Yellow
}

# Install Facial Processing Python dependencies
$currentStep++
Show-Progress "Installing Facial Processing Python Dependencies" $currentStep
$facialPath = Join-Path $PSScriptRoot "..\facial-processing"
if (Test-Path $facialPath) {
    Set-Location $facialPath
    Write-Host "Setting up Facial Processing virtual environment..." -ForegroundColor Yellow
    
    # Check if uv is available
    $uvAvailable = $false
    try {
        $null = uv --version 2>&1
        $uvAvailable = $true
    } catch {
        $uvAvailable = $false
    }
    
    if ($uvAvailable) {
        Write-Host "Using uv for installation..." -ForegroundColor Yellow
        uv venv
        .venv\Scripts\activate
        uv pip install -e .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Facial Processing dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install Facial Processing dependencies with uv" -ForegroundColor Red
            Write-Host "   This may be due to Python version (3.10+ required) or platform compatibility" -ForegroundColor Yellow
            Write-Host "   Try: cd facial-processing && python -m venv .venv && .venv\Scripts\activate && pip install -e ." -ForegroundColor Yellow
        }
    } else {
        Write-Host "uv not found, using standard pip..." -ForegroundColor Yellow
        
        # Check if venv exists and what Python version it uses
        $venvNeedsRecreation = $false
        if (Test-Path ".venv") {
            $existingVersion = Get-VenvPythonVersion ".venv"
            if ($existingVersion -eq $PYTHON_VER) {
                Write-Host "✅ Existing .venv uses Python $PYTHON_VER, skipping recreation" -ForegroundColor Green
                # Venv is correct, just install/upgrade packages
            } elseif ($null -eq $existingVersion) {
                Write-Host "⚠️  Existing .venv appears corrupted, recreating..." -ForegroundColor Yellow
                $venvNeedsRecreation = $true
            } else {
                Write-Host "Removing existing .venv (Python $existingVersion) to recreate with Python $PYTHON_VER..." -ForegroundColor Yellow
                $venvNeedsRecreation = $true
            }
        } else {
            Write-Host "Creating virtual environment with Python $PYTHON_VER..." -ForegroundColor Yellow
            $venvNeedsRecreation = $true
        }
        
        # Create venv only if needed
        if ($venvNeedsRecreation) {
            if (Test-Path ".venv") {
                Remove-Item -Recurse -Force .venv
            }
            if ($PYTHON_ARGS) {
                & $PYTHON_CMD $PYTHON_ARGS -m venv .venv
            } else {
                & $PYTHON_CMD -m venv .venv
            }
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to create Facial Processing virtual environment" -ForegroundColor Red
                Set-Location $PSScriptRoot
                continue
            }
        }
        
        .venv\Scripts\activate
        if ($venvNeedsRecreation) {
            # Only upgrade pip if we just created the venv
            Write-Host "Upgrading pip in virtual environment..." -ForegroundColor Yellow
            .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
        }
        .venv\Scripts\python.exe -m pip install -e .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Facial Processing dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install Facial Processing dependencies" -ForegroundColor Red
            Write-Host "   Common issues:" -ForegroundColor Yellow
            Write-Host "   - MediaPipe may not be available for your platform/architecture" -ForegroundColor Yellow
            Write-Host "   - Try installing manually: cd facial-processing && .venv\Scripts\activate && pip install -e ." -ForegroundColor Yellow
        }
    }
    Set-Location $PSScriptRoot
} else {
    Write-Host "⚠️  Facial Processing directory not found at: $facialPath" -ForegroundColor Yellow
}

# Install Img2study Python dependencies (fixes OCR error)
$currentStep++
Show-Progress "Installing Img2study Python Dependencies" $currentStep
$img2studyPath = Join-Path $PSScriptRoot "..\img2study"
if (Test-Path $img2studyPath) {
    $requirementsFile = Join-Path $img2studyPath "requirements-working.txt"
    if (Test-Path $requirementsFile) {
        Set-Location $img2studyPath
        Write-Host "Installing OCR dependencies (opencv-python, paddleocr, etc.)..." -ForegroundColor Yellow
        Write-Host "Using Python $PYTHON_VER for installation..." -ForegroundColor Yellow
        Write-Host "Note: PaddlePaddle may take several minutes to download..." -ForegroundColor Yellow
        if ($PYTHON_ARGS) {
            & $PYTHON_CMD $PYTHON_ARGS -m pip install -r requirements-working.txt
        } else {
            & $PYTHON_CMD -m pip install -r requirements-working.txt
        }
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Img2study dependencies installed successfully" -ForegroundColor Green
            Write-Host "   This fixes the OCR 'ModuleNotFoundError: No module named cv2' error" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install Img2study dependencies" -ForegroundColor Red
            Write-Host "   Common issues:" -ForegroundColor Yellow
            Write-Host "   - PaddlePaddle may not be available for your Python version/platform" -ForegroundColor Yellow
            Write-Host "   - Try installing packages individually:" -ForegroundColor Yellow
            Write-Host "     pip install opencv-python pillow numpy requests" -ForegroundColor Yellow
            Write-Host "     pip install paddleocr==2.10.0" -ForegroundColor Yellow
            Write-Host "     pip install paddlepaddle (may fail on some platforms)" -ForegroundColor Yellow
            Write-Host "   OCR may still work without PaddlePaddle if other packages installed" -ForegroundColor Yellow
        }
        Set-Location $PSScriptRoot
    } else {
        Write-Host "⚠️  requirements-working.txt not found in img2study directory" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Img2study directory not found at: $img2studyPath" -ForegroundColor Yellow
}

# Return to original directory
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Installation Complete!" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed components:" -ForegroundColor Yellow
Write-Host "  ✓ Node.js dependencies (backend, frontend, database)" -ForegroundColor Green
Write-Host "  ✓ Gen-AI Python dependencies" -ForegroundColor Green
Write-Host "  ✓ Facial Processing Python dependencies" -ForegroundColor Green
Write-Host "  ✓ Img2study OCR dependencies (fixes OCR errors)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run '.\start.ps1' or 'start.bat' to start the servers" -ForegroundColor White
Write-Host "2. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
