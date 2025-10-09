"""
Configuration Demo
Shows how to switch between Ollama and Purdue API
"""

import os
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from config import get_rag_config
from src.ai_providers.gateway import AIGateway


def show_current_config():
    """Display current configuration"""
    print("=== Current Configuration ===")
    
    config = get_rag_config()
    
    print(f"Hardware: {'Laptop' if config.use_laptop else 'PC'}")
    print(f"Provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
    print(f"Model: {config.model_name}")
    print(f"Storage: {'Persistent' if config.use_persistent else 'In-memory'}")
    print(f"Collection: {config.collection_name}")
    
    # Test AI Gateway
    print(f"\n=== AI Gateway Test ===")
    try:
        gateway = AIGateway()
        available_providers = gateway.get_available_providers()
        print(f"Available providers: {available_providers}")
        
        if available_providers:
            print(f"Active provider: {'Ollama' if config.use_ollama else 'Purdue API'}")
        else:
            print("❌ No providers available!")
            print("   For Ollama: Make sure Ollama is running")
            print("   For Purdue API: Set PURDUE_API_KEY environment variable")
            
    except Exception as e:
        print(f"❌ Gateway error: {e}")


def show_switching_instructions():
    """Show how to switch between providers"""
    print(f"\n=== How to Switch Providers ===")
    print("")
    print("Method 1: Edit config.py")
    print("  Change: use_ollama = True   # for Ollama")
    print("  Change: use_ollama = False  # for Purdue API")
    print("")
    print("Method 2: Environment Variables")
    print("  For Ollama:    set USE_OLLAMA=true")
    print("  For Purdue:    set USE_OLLAMA=false")
    print("  For Purdue:    set PURDUE_API_KEY=your_key_here")
    print("")
    print("Method 3: Command Line (Windows)")
    print("  Ollama:    set USE_OLLAMA=true && python run demo")
    print("  Purdue:    set USE_OLLAMA=false && set PURDUE_API_KEY=key && python run demo")
    print("")
    print("Method 4: Command Line (Unix/Mac)")
    print("  Ollama:    USE_OLLAMA=true python run demo")
    print("  Purdue:    USE_OLLAMA=false PURDUE_API_KEY=key python run demo")


def main():
    """Main function"""
    show_current_config()
    show_switching_instructions()


if __name__ == "__main__":
    main()
