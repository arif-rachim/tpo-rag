#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Centralized logging configuration with rotating file handlers.

This module provides a comprehensive logging setup with:
- Rotating file handlers to prevent log files from growing indefinitely
- Separate log files for different purposes (app, errors, ingestion)
- Console output for immediate feedback
- Structured formatting with timestamps and context
- Automatic error detection and tracking
"""

import logging
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional


# --------------------------------------------------------------------------- #
#  Configuration Constants
# --------------------------------------------------------------------------- #
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Log file paths
APP_LOG_FILE = LOG_DIR / "app.log"
ERROR_LOG_FILE = LOG_DIR / "error.log"
INGESTION_LOG_FILE = LOG_DIR / "ingestion.log"

# Rotating file handler settings
MAX_BYTES = 10 * 1024 * 1024  # 10 MB per file
BACKUP_COUNT = 5  # Keep 5 backup files

# Log format with detailed context
DETAILED_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)-30s | "
    "%(filename)s:%(lineno)-4d | %(funcName)-25s | %(message)s"
)

SIMPLE_FORMAT = "%(asctime)s | %(levelname)-8s | %(message)s"

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# --------------------------------------------------------------------------- #
#  Logger Setup Functions
# --------------------------------------------------------------------------- #
def create_rotating_handler(
    filepath: Path,
    level: int = logging.DEBUG,
    max_bytes: int = MAX_BYTES,
    backup_count: int = BACKUP_COUNT,
    detailed: bool = True,
) -> RotatingFileHandler:
    """
    Create a rotating file handler.

    Parameters
    ----------
    filepath : Path
        Path to the log file
    level : int
        Logging level (e.g., logging.DEBUG, logging.INFO)
    max_bytes : int
        Maximum size of log file before rotation (default: 10MB)
    backup_count : int
        Number of backup files to keep (default: 5)
    detailed : bool
        If True, use detailed format; otherwise use simple format

    Returns
    -------
    RotatingFileHandler
        Configured rotating file handler
    """
    handler = RotatingFileHandler(
        filepath,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setLevel(level)

    fmt = DETAILED_FORMAT if detailed else SIMPLE_FORMAT
    formatter = logging.Formatter(fmt, datefmt=DATE_FORMAT)
    handler.setFormatter(formatter)

    return handler


def create_console_handler(
    level: int = logging.INFO,
    detailed: bool = False,
) -> logging.StreamHandler:
    """
    Create a console (stdout) handler.

    Parameters
    ----------
    level : int
        Logging level (e.g., logging.INFO, logging.WARNING)
    detailed : bool
        If True, use detailed format; otherwise use simple format

    Returns
    -------
    StreamHandler
        Configured console handler
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    fmt = DETAILED_FORMAT if detailed else SIMPLE_FORMAT
    formatter = logging.Formatter(fmt, datefmt=DATE_FORMAT)
    handler.setFormatter(formatter)

    return handler


def setup_logger(
    name: str,
    log_file: Optional[Path] = None,
    console_level: int = logging.INFO,
    file_level: int = logging.DEBUG,
    detailed_console: bool = False,
) -> logging.Logger:
    """
    Set up a logger with both file and console handlers.

    Parameters
    ----------
    name : str
        Logger name (typically __name__ of the module)
    log_file : Path, optional
        Path to log file. If None, uses APP_LOG_FILE
    console_level : int
        Logging level for console output (default: INFO)
    file_level : int
        Logging level for file output (default: DEBUG)
    detailed_console : bool
        If True, use detailed format for console; otherwise use simple format

    Returns
    -------
    Logger
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # Capture everything, handlers will filter
    logger.propagate = False  # Don't propagate to root logger to avoid duplicates

    # Remove ALL existing handlers to avoid duplicates
    # Force clear by creating a new empty list
    logger.handlers = []

    # File handler - rotating with detailed format
    if log_file is None:
        log_file = APP_LOG_FILE

    file_handler = create_rotating_handler(
        log_file,
        level=file_level,
        detailed=True,
    )
    logger.addHandler(file_handler)

    # Console handler - simple format by default
    console_handler = create_console_handler(
        level=console_level,
        detailed=detailed_console,
    )
    logger.addHandler(console_handler)

    # Error handler - separate file for errors and critical issues
    error_handler = create_rotating_handler(
        ERROR_LOG_FILE,
        level=logging.ERROR,
        detailed=True,
    )
    logger.addHandler(error_handler)

    return logger


def configure_root_logger(
    console_level: int = logging.WARNING,
    file_level: int = logging.INFO,
) -> None:
    """
    Configure the root logger with rotating file handlers.

    This affects all loggers in the application unless they explicitly
    propagate=False.

    Parameters
    ----------
    console_level : int
        Logging level for console output (default: WARNING)
    file_level : int
        Logging level for file output (default: INFO)
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Clear ALL existing handlers to avoid duplicates
    # Force clear by creating a new empty list
    root_logger.handlers = []

    # Add rotating file handler
    file_handler = create_rotating_handler(
        APP_LOG_FILE,
        level=file_level,
        detailed=True,
    )
    root_logger.addHandler(file_handler)

    # Add console handler
    console_handler = create_console_handler(
        level=console_level,
        detailed=False,
    )
    root_logger.addHandler(console_handler)

    # Add error file handler
    error_handler = create_rotating_handler(
        ERROR_LOG_FILE,
        level=logging.ERROR,
        detailed=True,
    )
    root_logger.addHandler(error_handler)


def get_ingestion_logger(name: str = "ingestion") -> logging.Logger:
    """
    Get a specialized logger for ingestion operations.

    This logger writes to both the main app log and a separate ingestion log.

    Parameters
    ----------
    name : str
        Logger name (default: "ingestion")

    Returns
    -------
    Logger
        Configured ingestion logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False  # Don't propagate to root logger

    # Remove ALL existing handlers to avoid duplicates
    # Force clear by creating a new empty list
    logger.handlers = []

    # Ingestion-specific file handler
    ingestion_handler = create_rotating_handler(
        INGESTION_LOG_FILE,
        level=logging.DEBUG,
        detailed=True,
    )
    logger.addHandler(ingestion_handler)

    # Also log to main app file
    app_handler = create_rotating_handler(
        APP_LOG_FILE,
        level=logging.INFO,
        detailed=True,
    )
    logger.addHandler(app_handler)

    # Console handler for immediate feedback
    console_handler = create_console_handler(
        level=logging.INFO,
        detailed=False,
    )
    logger.addHandler(console_handler)

    # Error handler
    error_handler = create_rotating_handler(
        ERROR_LOG_FILE,
        level=logging.ERROR,
        detailed=True,
    )
    logger.addHandler(error_handler)

    return logger


def log_system_info(logger: logging.Logger) -> None:
    """
    Log system and environment information.

    Parameters
    ----------
    logger : Logger
        Logger instance to use
    """
    import platform
    import sys

    logger.info("=" * 80)
    logger.info("System Information")
    logger.info("=" * 80)
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Platform: {platform.platform()}")
    logger.info(f"Architecture: {platform.machine()}")
    logger.info(f"Processor: {platform.processor()}")
    logger.info(f"Working directory: {Path.cwd()}")
    logger.info(f"Log directory: {LOG_DIR.absolute()}")
    logger.info("=" * 80)


def log_exception(logger: logging.Logger, exc: Exception, context: str = "") -> None:
    """
    Log an exception with full traceback and context.

    Parameters
    ----------
    logger : Logger
        Logger instance to use
    exc : Exception
        The exception to log
    context : str
        Additional context about where/why the exception occurred
    """
    if context:
        logger.error(f"Exception in {context}: {type(exc).__name__}: {exc}")
    else:
        logger.error(f"Exception: {type(exc).__name__}: {exc}")

    logger.exception("Full traceback:", exc_info=exc)


# --------------------------------------------------------------------------- #
#  Performance Tracking
# --------------------------------------------------------------------------- #
class PerformanceLogger:
    """
    Context manager for logging performance metrics.

    Usage:
        with PerformanceLogger(logger, "operation_name"):
            # ... do work ...
    """

    def __init__(self, logger: logging.Logger, operation: str):
        """
        Initialize performance logger.

        Parameters
        ----------
        logger : Logger
            Logger instance to use
        operation : str
            Name of the operation being timed
        """
        self.logger = logger
        self.operation = operation
        self.start_time = None

    def __enter__(self):
        """Start timing."""
        self.start_time = datetime.now()
        self.logger.debug(f"Starting: {self.operation}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Log completion time and any exceptions."""
        duration = (datetime.now() - self.start_time).total_seconds()

        if exc_type is None:
            self.logger.info(f"Completed: {self.operation} in {duration:.2f}s")
        else:
            self.logger.error(
                f"Failed: {self.operation} after {duration:.2f}s - "
                f"{exc_type.__name__}: {exc_val}"
            )

        # Don't suppress exceptions
        return False


# --------------------------------------------------------------------------- #
#  Initialization Message
# --------------------------------------------------------------------------- #
def _log_initialization():
    """Log that the logging system has been initialized."""
    init_logger = logging.getLogger(__name__)
    init_logger.info(f"Logging system initialized - logs directory: {LOG_DIR.absolute()}")
    init_logger.debug(f"Log files: app={APP_LOG_FILE.name}, error={ERROR_LOG_FILE.name}, "
                     f"ingestion={INGESTION_LOG_FILE.name}")


# Auto-initialize when module is imported
_log_initialization()
