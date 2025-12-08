"""
Logging utilities for facial processing subsystem
"""

import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any


class MetricsLogger:
    """Logger for performance metrics and results"""

    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Setup file handlers
        self.metrics_file = self.log_dir / f"metrics_{datetime.now():%Y%m%d_%H%M%S}.jsonl"
        self.errors_file = self.log_dir / f"errors_{datetime.now():%Y%m%d_%H%M%S}.log"

        # Setup logging
        self.logger = logging.getLogger("facial_processing")
        self.logger.setLevel(logging.INFO)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_format)
        self.logger.addHandler(console_handler)

        # Error file handler
        file_handler = logging.FileHandler(self.errors_file)
        file_handler.setLevel(logging.ERROR)
        file_handler.setFormatter(console_format)
        self.logger.addHandler(file_handler)

    def log_metrics(self, metrics: Dict[str, Any]):
        """Log processing metrics to JSONL file"""
        with open(self.metrics_file, 'a') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                **metrics
            }, f)
            f.write('\n')

    def log_error(self, error: str, context: Dict[str, Any] = None):
        """Log error with context"""
        self.logger.error(f"{error} | Context: {context}")

    def log_info(self, message: str):
        """Log info message"""
        self.logger.info(message)
