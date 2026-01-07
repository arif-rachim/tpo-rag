#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ingestion process manager with status tracking and file operation locking.

NO EXTERNAL DEPENDENCIES - Uses only Python stdlib:
- subprocess (process management)
- threading (locking)
- datetime (timestamps)
- pathlib (file paths)
"""

import subprocess
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import sys
import logging

# Get logger
_logger = logging.getLogger("ingestion_manager")


# --------------------------------------------------------------------------- #
#  Global State
# --------------------------------------------------------------------------- #

# Status tracking
_status = "idle"  # idle, running, completed, error
_process: Optional[subprocess.Popen] = None
_start_time: Optional[datetime] = None
_end_time: Optional[datetime] = None
_error_message: Optional[str] = None

# File operation locking
_file_operations_locked = False
_lock = threading.RLock()  # Use RLock (reentrant) to allow nested lock acquisition


# --------------------------------------------------------------------------- #
#  Status Management
# --------------------------------------------------------------------------- #

def get_status() -> Dict[str, Any]:
    """
    Get current ingestion status.

    Returns
    -------
    dict
        Status information including:
        - status: str (idle, running, completed, error)
        - start_time: str (ISO format) or None
        - end_time: str (ISO format) or None
        - duration: float (seconds) or None
        - error_message: str or None
        - file_operations_locked: bool
        - process_id: int or None
    """
    with _lock:
        duration = None
        if _start_time:
            end = _end_time or datetime.now()
            duration = (end - _start_time).total_seconds()

        return {
            "status": _status,
            "start_time": _start_time.isoformat() if _start_time else None,
            "end_time": _end_time.isoformat() if _end_time else None,
            "duration": duration,
            "error_message": _error_message,
            "file_operations_locked": _file_operations_locked,
            "process_id": _process.pid if _process else None,
        }


def is_running() -> bool:
    """
    Check if ingestion is currently running.

    Returns
    -------
    bool
        True if ingestion is running, False otherwise
    """
    with _lock:
        return _status == "running"


def are_file_operations_locked() -> bool:
    """
    Check if file operations are locked.

    Returns
    -------
    bool
        True if file operations are locked, False otherwise
    """
    with _lock:
        return _file_operations_locked


# --------------------------------------------------------------------------- #
#  Ingestion Process Management
# --------------------------------------------------------------------------- #

def start_ingestion() -> Dict[str, Any]:
    """
    Start the ingestion process.

    Returns
    -------
    dict
        Result with:
        - success: bool
        - message: str
        - process_id: int (if success)
        - status: dict (if success)
    """
    global _status, _process, _start_time, _end_time, _error_message, _file_operations_locked

    _logger.info("start_ingestion() called")

    with _lock:
        _logger.debug("Acquired lock")

        # Check if already running
        if _status == "running":
            _logger.warning("Ingestion already running")
            return {
                "success": False,
                "message": "Ingestion is already running",
                "status": get_status()
            }

        # Reset state
        _logger.debug("Resetting state")
        _status = "running"
        _start_time = datetime.now()
        _end_time = None
        _error_message = None
        _file_operations_locked = True

        try:
            # Get Python executable and project root
            _logger.debug("Getting Python executable and project root")
            python_exe = sys.executable
            project_root = Path(__file__).parent.parent  # Go up from src/ to project root
            script_path = Path(__file__).parent / "ingestor" / "ingest.py"

            _logger.debug(f"Python exe: {python_exe}")
            _logger.debug(f"Script path: {script_path}")
            _logger.debug(f"Project root: {project_root}")

            if not script_path.exists():
                _logger.error(f"Script not found: {script_path}")
                raise FileNotFoundError(f"Ingestion script not found: {script_path}")

            # Start subprocess - run as module to support relative imports
            # Don't capture stdout/stderr - let subprocess write directly to its log file
            # Capturing causes the process to hang when the pipe buffer fills up
            _logger.info("Starting ingestion subprocess as module")
            _process = subprocess.Popen(
                [python_exe, "-m", "ingestor.ingest"],
                stdout=None,  # Inherit parent's stdout (or redirect to console)
                stderr=None,  # Inherit parent's stderr
                cwd=project_root / "src",  # Run from src/ directory so module path works
            )
            _logger.info(f"Subprocess started with PID: {_process.pid}")

            _logger.debug("Preparing return dict")
            result = {
                "success": True,
                "message": "Ingestion started successfully",
                "process_id": _process.pid,
                "status": get_status()
            }
            _logger.info("Returning success from start_ingestion()")
            return result

        except Exception as exc:
            _logger.error(f"Exception in start_ingestion(): {exc}", exc_info=True)
            # Revert state on error
            _status = "error"
            _error_message = str(exc)
            _file_operations_locked = False
            _end_time = datetime.now()

            return {
                "success": False,
                "message": f"Failed to start ingestion: {exc}",
                "error": str(exc),
                "status": get_status()
            }


def stop_ingestion() -> Dict[str, Any]:
    """
    Stop the ingestion process.

    Returns
    -------
    dict
        Result with:
        - success: bool
        - message: str
        - status: dict
    """
    global _status, _process, _end_time, _file_operations_locked

    with _lock:
        if _status != "running":
            return {
                "success": False,
                "message": f"Cannot stop ingestion - current status: {_status}",
                "status": get_status()
            }

        if not _process:
            return {
                "success": False,
                "message": "No ingestion process found",
                "status": get_status()
            }

        try:
            # Try to terminate gracefully
            _process.terminate()

            # Wait up to 5 seconds for graceful termination
            try:
                _process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if graceful termination fails
                _process.kill()
                _process.wait()

            # Update state
            _status = "completed"
            _end_time = datetime.now()
            _file_operations_locked = False
            _process = None

            return {
                "success": True,
                "message": "Ingestion stopped successfully",
                "status": get_status()
            }

        except Exception as exc:
            return {
                "success": False,
                "message": f"Failed to stop ingestion: {exc}",
                "error": str(exc),
                "status": get_status()
            }


def check_process_status():
    """
    Check if the ingestion process is still running and update status.

    This should be called periodically to detect when the process completes.
    """
    global _status, _process, _end_time, _error_message, _file_operations_locked

    with _lock:
        if _status != "running" or not _process:
            return

        # Check if process has finished
        returncode = _process.poll()
        if returncode is not None:
            # Process finished
            _end_time = datetime.now()
            _file_operations_locked = False

            if returncode == 0:
                _status = "completed"
            else:
                _status = "error"
                # Try to read stderr for error message
                try:
                    _, stderr = _process.communicate(timeout=1)
                    if stderr:
                        _error_message = stderr[:500]  # Limit error message length
                except:
                    _error_message = f"Process exited with code {returncode}"

            _process = None


# --------------------------------------------------------------------------- #
#  File Operation Locking
# --------------------------------------------------------------------------- #

def lock_file_operations():
    """
    Lock file operations (prevents upload/delete during ingestion).
    """
    global _file_operations_locked
    with _lock:
        _file_operations_locked = True


def unlock_file_operations():
    """
    Unlock file operations.
    """
    global _file_operations_locked
    with _lock:
        _file_operations_locked = False


# --------------------------------------------------------------------------- #
#  Testing
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    print("=== Ingestion Manager Test ===")
    print()

    # Test status
    print("Initial status:")
    status = get_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    print()

    print(f"Is running: {is_running()}")
    print(f"File operations locked: {are_file_operations_locked()}")
    print()

    # Test locking
    print("Locking file operations...")
    lock_file_operations()
    print(f"File operations locked: {are_file_operations_locked()}")
    print()

    print("Unlocking file operations...")
    unlock_file_operations()
    print(f"File operations locked: {are_file_operations_locked()}")
