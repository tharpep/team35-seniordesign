"""
Main CLI application
GenAI command-line interface using Typer
"""

import typer
from typing import Optional

# Import all command modules
from cli.commands import chat, ingest, query, artifact, server, test, config, demo

# Create main Typer app
app = typer.Typer(
    name="genai",
    help="GenAI subsystem CLI - Artifact generation, RAG queries, and chat",
    add_completion=False
)

# Register all commands as subcommands
app.add_typer(chat.app, name="chat", help="Interactive chat with conversation context")
app.add_typer(ingest.app, name="ingest", help="Ingest documents into RAG system")
app.add_typer(query.app, name="query", help="Interactive RAG query REPL")
app.add_typer(artifact.app, name="artifact", help="Generate educational artifacts")
app.add_typer(server.app, name="server", help="Start FastAPI server")
app.add_typer(test.app, name="test", help="Run tests")
app.add_typer(config.app, name="config", help="Show current configuration")
app.add_typer(demo.app, name="demo", help="Run comprehensive subsystem demo")


@app.callback()
def main(
    ctx: typer.Context,
    base_url: Optional[str] = typer.Option(
        "http://127.0.0.1:8000",
        "--base-url",
        help="Base URL for API server"
    )
):
    """
    GenAI Subsystem CLI
    
    Commands for artifact generation, RAG queries, and interactive chat.
    Most commands require the API server to be running (use 'genai server').
    """
    # Store base_url in context for commands to access
    ctx.ensure_object(dict)
    ctx.obj["base_url"] = base_url


if __name__ == "__main__":
    app()

