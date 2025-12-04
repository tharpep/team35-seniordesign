"""
Utility for loading prompts from files
Centralized prompt management for better long-term development
"""

from pathlib import Path
from typing import Optional
from logging_config import get_logger

logger = get_logger(__name__)


def get_prompts_dir() -> Path:
    """Get the prompts directory path"""
    # Prompts directory is at gen-ai/prompts/
    # This file is at gen-ai/src/utils/prompt_loader.py
    current_file = Path(__file__)
    # Go up: src/utils -> src -> gen-ai -> prompts
    prompts_dir = current_file.parent.parent.parent / "prompts"
    return prompts_dir


def load_prompt(filename: str, fallback: Optional[str] = None) -> str:
    """
    Load a prompt from a file in the prompts directory
    
    Args:
        filename: Name of the prompt file (e.g., "chat_system_prompt.md")
        fallback: Fallback text if file not found
        
    Returns:
        Prompt content as string, or fallback if file not found
    """
    prompts_dir = get_prompts_dir()
    prompt_path = prompts_dir / filename
    
    try:
        if prompt_path.exists():
            with open(prompt_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                logger.debug(f"Loaded prompt from {prompt_path}")
                return content
        else:
            logger.warning(f"Prompt file not found: {prompt_path}")
            if fallback:
                logger.info(f"Using fallback prompt for {filename}")
                return fallback
            return ""
    except Exception as e:
        logger.error(f"Failed to load prompt from {prompt_path}: {e}")
        if fallback:
            logger.info(f"Using fallback prompt for {filename}")
            return fallback
        return ""


def load_prompt_template(filename: str, fallback: Optional[str] = None, **kwargs) -> str:
    """
    Load a prompt template and fill in placeholders
    
    Args:
        filename: Name of the prompt template file
        fallback: Fallback template if file not found (optional)
        **kwargs: Values to fill in template placeholders
        
    Returns:
        Filled template as string, or fallback if file not found
    """
    template = load_prompt(filename, fallback=fallback)
    if not template:
        return fallback or ""
    
    if kwargs:
        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.warning(f"Missing placeholder in template {filename}: {e}")
            return template
    return template

