"""
Subsystem demo command
Runs comprehensive demo of all GenAI subsystem specifications
"""

import typer
import sys
import os
from pathlib import Path
from cli.utils import print_header, print_section

app = typer.Typer(name="demo", help="Run comprehensive subsystem demo")


@app.command()
def subsystem(
    mode: str = typer.Option("interactive", "--mode", "-m", help="Demo mode: 'automated' or 'interactive'"),
    base_url: str = typer.Option("http://127.0.0.1:8000", "--base-url", help="API server base URL")
):
    """
    Run comprehensive subsystem demo via API (true integration test)
    
    Demonstrates all design document specifications through API endpoints:
    - Artifact Generation
    - Schema Compliance
    - Token Management
    - Processing Latency
    - Factual Accuracy
    - System Reliability
    
    Requires API server to be running (use 'genai server' in another terminal)
    """
    print_header("GENAI SUBSYSTEM DEMO (API-BASED)")
    
    # Validate mode
    if mode.lower() not in ['automated', 'interactive']:
        print(f"[ERROR] Invalid mode: {mode}")
        print("   Mode must be 'automated' or 'interactive'")
        raise typer.Exit(1)
    
    # Add project root to path for imports
    project_root = Path(__file__).parent.parent.parent
    sys.path.append(str(project_root))
    
    try:
        # Import and run the API-based demo
        from src.demos.api_subsystem_demo import run_api_subsystem_demo
        
        print(f"\n[MODE] Running in '{mode.lower()}' mode via API")
        print(f"[API] Base URL: {base_url}")
        print_section("STARTING DEMO")
        
        success = run_api_subsystem_demo(mode=mode.lower(), base_url=base_url)
        
        if success:
            print_section("DEMO COMPLETED")
            print("[OK] Demo finished successfully")
        else:
            print_section("DEMO FAILED")
            print("[ERROR] Demo encountered errors")
            raise typer.Exit(1)
            
    except ImportError as e:
        print(f"\n[ERROR] Failed to import demo module: {e}")
        print("   Make sure you're in the gen-ai directory")
        raise typer.Exit(1)
    except Exception as e:
        print(f"\n[ERROR] Demo failed: {e}")
        import traceback
        traceback.print_exc()
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Subsystem demo - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(subsystem, mode="interactive", base_url="http://127.0.0.1:8000")

