"""
Test runner command
Runs pytest tests
"""

import typer
import subprocess
import sys
from pathlib import Path

app = typer.Typer(name="test", help="Run tests")


@app.command()
def run(
    all: bool = typer.Option(False, "--all", help="Run all tests"),
    verbose: bool = typer.Option(True, "--verbose/--quiet", help="Verbose output")
):
    """
    Run pytest tests
    
    By default runs tests interactively. Use --all to run all tests.
    """
    print("\n" + "=" * 70)
    print("GENAI TEST RUNNER")
    print("=" * 70)
    
    # Get project root
    project_root = Path(__file__).parent.parent.parent
    
    # Build pytest command
    cmd = [sys.executable, "-m", "pytest", "src/tests/"]
    
    if verbose:
        cmd.append("-v")
    
    if all:
        print("\n[RUNNING] All tests...")
    else:
        print("\n[RUNNING] Tests (interactive mode)")
        print("   Use --all to run all tests without interaction")
        cmd.extend(["-s"])  # Don't capture output for interactive
    
    print("=" * 70 + "\n")
    
    try:
        result = subprocess.run(cmd, cwd=project_root)
        if result.returncode == 0:
            print("\n[SUCCESS] All tests passed!")
        else:
            print(f"\n[FAILED] Tests failed with exit code {result.returncode}")
            raise typer.Exit(result.returncode)
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Tests interrupted by user")
        raise typer.Exit(130)
    except Exception as e:
        print(f"\n[ERROR] Failed to run tests: {e}")
        raise typer.Exit(1)


# Default command
@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Run tests - default command"""
    if ctx.invoked_subcommand is None:
        ctx.invoke(run, all=False, verbose=True)


