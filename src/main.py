import argparse
import sys
import warnings

# Import logging configuration before anything else
from logging_config import (
    setup_logger,
    log_system_info,
    log_exception,
    PerformanceLogger,
    configure_root_logger,
)

# Suppress warnings
warnings.filterwarnings('ignore')

# Configure root logger with rotating file handlers
configure_root_logger(console_level=20, file_level=10)  # INFO console, DEBUG file

# Set levels for third-party loggers to reduce noise
import logging
logging.getLogger('chromadb').setLevel(logging.WARNING)
logging.getLogger('sentence_transformers').setLevel(logging.WARNING)
logging.getLogger('transformers').setLevel(logging.ERROR)
logging.getLogger('torch').setLevel(logging.ERROR)
logging.getLogger('uvicorn').setLevel(logging.INFO)
logging.getLogger('docket').setLevel(logging.WARNING)
logging.getLogger('fakeredis').setLevel(logging.WARNING)

# Create application logger
logger = setup_logger(__name__)

from retriever import retrieve


def _parse_cli_args() -> argparse.Namespace:
    """
    Parse command‑line arguments.

    Returns
    -------
    argparse.Namespace
        Parsed arguments with a single optional ``transport`` attribute.
    """
    parser = argparse.ArgumentParser(
        description="Run the retriever with optional transport configuration."
    )
    parser.add_argument(
        "--transport",
        type=str,
        default=None,
        help=(
            "Transport mode (e.g., 'stdio'). "
            "If set to 'stdio', ``retrieve.mcp_io()`` will be executed. "
            "Any other value is passed to ``retrieve.main`` as the ``transport`` "
            "keyword argument."
        ),
    )
    return parser.parse_args()


def _run() -> int:
    """
    Execute the appropriate retrieval routine and map exceptions to exit codes.

    Returns
    -------
    int
        0 on success, 1 on failure.
    """
    # Log startup information
    logger.info("=" * 80)
    logger.info("RAG Retriever Service Starting")
    logger.info("=" * 80)
    log_system_info(logger)

    args = _parse_cli_args()
    logger.info(f"Command-line arguments: transport={args.transport}")

    try:
        with PerformanceLogger(logger, "Retriever execution"):
            # -------------------------------------------------
            # a) Special case: stdio → use the mcp_io helper
            # -------------------------------------------------
            if args.transport == "stdio":
                logger.info("Running in STDIO transport mode")
                retrieve.mcp_io()
            else:
                # -------------------------------------------------
                # b) Normal case → call retrieve.main()
                # -------------------------------------------------
                logger.info("Running in HTTP transport mode")
                retrieve.main()

        logger.info("=" * 80)
        logger.info("RAG Retriever Service Stopped Successfully")
        logger.info("=" * 80)
        return 0

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt (Ctrl+C) - shutting down gracefully")
        logger.info("=" * 80)
        logger.info("RAG Retriever Service Stopped by User")
        logger.info("=" * 80)
        return 0

    except Exception as exc:
        # Log the full traceback for debugging, then exit with error code
        log_exception(logger, exc, "main execution")
        logger.critical("=" * 80)
        logger.critical("RAG Retriever Service Failed to Start")
        logger.critical("=" * 80)
        return 1


if __name__ == "__main__":
    sys.exit(_run())
