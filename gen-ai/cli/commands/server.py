"""
FastAPI server startup command
"""

import typer
import subprocess
import sys
import os
from pathlib import Path

app = typer.Typer(name="server", help="Start FastAPI server")


@app.command()
def start(
    host: str = typer.Option("127.0.0.1", "--host", help="Host to bind to"),
    port: int = typer.Option(8000, "--port", help="Port to bind to"),
    reload: bool = typer.Option(True, "--reload/--no-reload", help="Enable auto-reload")
):
    """
    Start the FastAPI server
    
    Server will be available at http://127.0.0.1:8000 by default.
    API docs available at http://127.0.0.1:8000/docs
    """
    print("\n" + "=" * 70)
    print("GENAI FASTAPI SERVER")
    print("=" * 70)
    print(f"\n[STARTING] Server: http://{host}:{port}")
    print(f"          Docs: http://{host}:{port}/docs")
    print(f"          ReDoc: http://{host}:{port}/redoc")
    print("\n[INFO] Press Ctrl+C to stop the server")
    print("=" * 70 + "\n")
    
    # Get project root (same as python run start does)
    project_root = Path(__file__).parent.parent.parent
    
    # Use poetry run to ensure we're in Poetry's environment with correct dependencies
    # This matches how other Poetry commands work
    import shutil
    poetry_cmd = shutil.which("poetry")
    
    if poetry_cmd:
        # Use poetry run to execute in Poetry's environment
        cmd = [
            poetry_cmd, "run", "uvicorn",
            "src.api.main:app",
            "--host", host,
            "--port", str(port)
        ]
    else:
        # Fallback to sys.executable if poetry not found
        cmd = [
            sys.executable, "-m", "uvicorn",
            "src.api.main:app",
            "--host", host,
            "--port", str(port)
        ]
    
    if reload:
        cmd.append("--reload")
    
    try:
        # Run uvicorn
        subprocess.run(cmd, cwd=project_root)
    except KeyboardInterrupt:
        print("\n\n[STOPPED] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Failed to start server: {e}")
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Start FastAPI server - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(start, host="127.0.0.1", port=8000, reload=True)


