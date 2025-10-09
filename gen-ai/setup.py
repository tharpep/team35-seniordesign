#!/usr/bin/env python3
"""
Setup script for SimRAG project
Creates virtual environment, installs dependencies, and configures environment
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f" {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f" {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f" {description} failed")
        print(f"Error: {e.stderr}")
        return False


def check_python():
    """Check if Python is available"""
    print("🐍 Checking Python...")
    try:
        version = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f" {version.stdout.strip()}")
        return True
    except Exception as e:
        print(f" Python not found: {e}")
        return False


def create_venv():
    """Create virtual environment"""
    venv_path = Path("venv")
    
    if venv_path.exists():
        print(" Virtual environment already exists")
        return True
    
    return run_command(f"{sys.executable} -m venv venv", "Creating virtual environment")


def get_activation_command():
    """Get the correct activation command for the platform"""
    if os.name == 'nt':  # Windows
        return "venv\\Scripts\\activate"
    else:  # Unix/Linux/Mac
        return "source venv/bin/activate"


def install_dependencies():
    """Install Python dependencies"""
    if os.name == 'nt':  # Windows
        pip_cmd = "venv\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        pip_cmd = "venv/bin/pip"
    
    # Upgrade pip first
    if not run_command(f"{pip_cmd} install --upgrade pip", "Upgrading pip"):
        return False
    
    # Install requirements
    return run_command(f"{pip_cmd} install -r requirements.txt", "Installing dependencies")


def create_env_file():
    """Create .env file from template if it doesn't exist"""
    env_file = Path(".env")
    env_example = Path("env_example.txt")
    
    if env_file.exists():
        print(" .env file already exists")
        return True
    
    if env_example.exists():
        print(" Creating .env file from template...")
        shutil.copy(env_example, env_file)
        print(" .env file created")
        print("  Please edit .env file with your configuration")
        return True
    else:
        print(" env_example.txt not found")
        return False


def test_setup():
    """Test if everything is working"""
    print(" Testing setup...")
    
    if os.name == 'nt':  # Windows
        python_cmd = "venv\\Scripts\\python"
    else:  # Unix/Linux/Mac
        python_cmd = "venv/bin/python"
    
    # Test import
    test_script = """
try:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath('.')))
    from src.ai_providers import AIGateway
    print(" AI providers import successful")
except ImportError as e:
    print(f" Import failed: {e}")
    exit(1)
"""
    
    try:
        result = subprocess.run([python_cmd, "-c", test_script], 
                              capture_output=True, text=True, check=True)
        print(result.stdout.strip())
        return True
    except subprocess.CalledProcessError as e:
        print(f" Test failed: {e.stderr}")
        return False


def main():
    """Main setup function"""
    print(" SimRAG Project Setup")
    print("=" * 50)
    
    # Check Python
    if not check_python():
        return 1
    
    # Create virtual environment
    if not create_venv():
        return 1
    
    # Install dependencies
    if not install_dependencies():
        return 1
    
    # Create .env file
    if not create_env_file():
        return 1
    
    # Test setup
    if not test_setup():
        return 1
    
    print("\n" + "=" * 50)
    print(" Setup completed successfully!")
    print("\nNext steps:")
    print(f"1. Activate virtual environment:")
    print(f"   {get_activation_command()}")
    print("2. Edit .env file with your configuration")
    print("3. Try: python run demo")
    print("4. Try: python run config local")
    print("\nFor Ollama:")
    print("- Install Ollama from https://ollama.ai")
    print("- Run: ollama pull qwen3:1.7b")
    print("- Set USE_OLLAMA=true in .env")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
