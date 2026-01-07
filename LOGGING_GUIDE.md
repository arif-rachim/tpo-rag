# Logging System Guide

## Overview

This project uses a comprehensive logging system with rotating file handlers to track all operations, detect issues, and provide detailed debugging information.

## Log Files Location

All log files are stored in the `logs/` directory at the project root:

```
logs/
├── app.log           # General application logs (all components)
├── error.log         # Errors and critical issues only
└── ingestion.log     # Document ingestion specific logs
```

## Log Rotation

Each log file uses **rotating file handlers** to prevent unlimited growth:

- **Maximum file size**: 10 MB
- **Backup files kept**: 5 (e.g., `app.log.1`, `app.log.2`, etc.)
- **Encoding**: UTF-8 (supports multilingual content)

When a log file reaches 10 MB, it's automatically rotated and a new file is created.

## Log Format

### Detailed Format (in files)
```
2026-01-07 15:30:45 | INFO     | __main__                       | main.py:75   | _run                      | RAG Retriever Service Starting
```

Components:
- **Timestamp**: Date and time of the log entry
- **Level**: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- **Logger Name**: Module/component that generated the log
- **File:Line**: Source file and line number
- **Function**: Function name where log was generated
- **Message**: The actual log message

### Simple Format (console output)
```
2026-01-07 15:30:45 | INFO     | RAG Retriever Service Starting
```

## Log Levels

The logging system uses the following levels:

1. **DEBUG** (10): Detailed diagnostic information
   - File-level operations
   - Individual chunk processing
   - Model loading details

2. **INFO** (20): General informational messages
   - Service startup/shutdown
   - Configuration loaded
   - Processing progress
   - Success summaries

3. **WARNING** (30): Warning messages (potential issues)
   - No documents found
   - Empty collections
   - Deprecated features

4. **ERROR** (40): Error messages (operation failures)
   - File processing failures
   - Database errors
   - Model loading issues

5. **CRITICAL** (50): Critical failures (service shutdown)
   - Service failed to start
   - Unrecoverable errors

## Configuration

### For Main Application (main.py)

The main application logs to:
- **Console**: INFO level and above
- **app.log**: DEBUG level and above
- **error.log**: ERROR level and above

### For Ingestion (ingestor/ingest.py)

The ingestion process logs to:
- **Console**: INFO level and above
- **ingestion.log**: DEBUG level and above
- **app.log**: INFO level and above
- **error.log**: ERROR level and above

### For Retrieval (retriever/retrieve.py)

The retrieval/search service logs to:
- **Console**: INFO level and above
- **app.log**: DEBUG level and above
- **error.log**: ERROR level and above

Logs include:
- Model loading and initialization
- Search requests and results
- MCP tool invocations
- Server startup/shutdown
- Performance metrics for all operations

## Using the Logging System

### In New Modules

To add logging to a new module:

```python
from logging_config import setup_logger

# Create logger for your module
logger = setup_logger(__name__)

# Use it
logger.info("Starting operation")
logger.debug("Processing item: %s", item_name)
logger.warning("Potential issue detected")
logger.error("Operation failed: %s", error_message)
```

### For Ingestion Operations

```python
from logging_config import get_ingestion_logger

logger = get_ingestion_logger("my_ingestion_module")
logger.info("Ingestion started")
```

### Performance Tracking

Use the `PerformanceLogger` context manager to track execution time:

```python
from logging_config import PerformanceLogger

logger = setup_logger(__name__)

with PerformanceLogger(logger, "Database query"):
    # ... perform operation ...
    result = db.query()
```

This automatically logs:
- Start: "Starting: Database query"
- Success: "Completed: Database query in 1.23s"
- Failure: "Failed: Database query after 1.23s - ErrorType: message"

### Exception Logging

Use `log_exception` for comprehensive exception logging:

```python
from logging_config import log_exception

try:
    # ... risky operation ...
except Exception as exc:
    log_exception(logger, exc, "processing file XYZ")
    # Optionally re-raise
    raise
```

This logs:
- Error message with context
- Exception type and message
- Full stack trace

### System Information

Log system and environment details:

```python
from logging_config import log_system_info

log_system_info(logger)
```

This logs:
- Python version
- Platform information
- Working directory
- Log directory location

## Monitoring Logs

### View Real-time Logs (Linux/Mac)

```bash
# Watch all logs
tail -f logs/app.log

# Watch errors only
tail -f logs/error.log

# Watch ingestion
tail -f logs/ingestion.log
```

### View Real-time Logs (Windows)

```powershell
# PowerShell
Get-Content logs\app.log -Wait

# Or use a text editor that auto-refreshes
notepad logs\app.log
```

### Search Logs

```bash
# Find all errors in app.log
grep "ERROR" logs/app.log

# Find logs from specific module
grep "ingestor.ingest" logs/app.log

# Find logs in the last hour (Linux/Mac)
find logs/ -name "*.log" -mmin -60 -exec tail {} \;
```

## Common Log Messages

### Successful Startup
```
===============================================================================
RAG Retriever Service Starting
===============================================================================
MCP HTTP Server Starting
===============================================================================
Starting server on 0.0.0.0:3223
Server name: jacrag_tpo
Available routes:
  - GET  /pdf/get/{filename}
  - GET  /file/view/{filename}
  - GET  /pdf/*
  - POST / (MCP endpoints)
```

### Configuration Loaded
```
Retriever module loaded
Configuration paths:
  Vector DB: data/tpo/chroma-store
  BM25 Index: data/tpo/bm25_index.pkl
  Embedder Model: models/multilingual-e5-large
  ...

Ingestion module loaded with configuration:
  Input folder: data/tpo/documents
  Vector DB path: data/tpo/chroma-store
  ...
```

### Model Loading
```
Loading SentenceTransformer model...
Model path: models/multilingual-e5-large
Completed: Loading SentenceTransformer model in 5.23s
SentenceTransformer loaded successfully

Loading BM25 index...
BM25 index loaded successfully with 1250 chunks
```

### Search Operations
```
================================================================================
Search Request: 'safety procedures for aircraft maintenance'
Requested results: 10
================================================================================
Semantic search: ENABLED
Semantic search returned 15 results (requested 20)
BM25 search: ENABLED
BM25 search returned 18 results (requested 20)
Combined results before deduplication: 33
Deduplicated 33 → 25 results (8 duplicates removed)
Reranking 25 candidates...
Completed: Reranking 25 candidates in 0.85s
================================================================================
Search Complete: Returning 10 results
Top result score: 0.8542
Top result from: JAC-SGL-001.pdf
```

### MCP Tool Calls
```
================================================================================
MCP Tool Called: search_documents
Query: 'emergency landing procedures'
Max results requested: 5
================================================================================
Completed: search_documents MCP tool in 2.34s
search_documents succeeded: 5 results returned
```

### File Processing (Ingestion)
```
Starting parallel processing with 7 workers
Successfully processed: document.pdf (25 chunks)
Stored 25 chunks for document.pdf
```

### Errors
```
ERROR | Exception in extract_pdf(document.pdf): FileNotFoundError: ...
Full traceback:
  ...

ERROR | Exception in semantic search for 'query text': ChromaDBError: ...
Full traceback:
  ...
```

### Performance Metrics
```
Completed: Loading embedder model in 5.23s
Completed: Initializing ChromaDB in 0.12s
Completed: Semantic search encoding in 0.08s
Completed: Semantic search query in 0.23s
Completed: BM25 tokenization and scoring in 0.05s
Completed: Reranking 25 candidates in 0.85s
Completed: Complete search operation in 1.45s
Completed: Parallel file processing in 45.67s
```

## Troubleshooting

### Log Files Not Created

Check that:
1. The `logs/` directory exists (created automatically by logging_config.py)
2. You have write permissions to the project directory
3. The logging_config module is imported correctly

### Too Much Disk Space Used

The rotating file handler automatically manages disk space by:
- Limiting each file to 10 MB
- Keeping only 5 backup files
- Maximum ~60 MB per log file type

To reduce further:
- Delete old `.log.N` backup files
- Adjust `MAX_BYTES` or `BACKUP_COUNT` in `src/logging_config.py`

### Missing Log Entries

Check log levels:
- Console shows INFO and above by default
- Files show DEBUG and above by default
- Use `logger.debug()` for detailed diagnostics

### Performance Impact

The logging system is optimized for minimal performance impact:
- Asynchronous writes
- Buffered I/O
- Conditional DEBUG logging (only written to file, not console)

## Best Practices

1. **Use appropriate log levels**
   - DEBUG: Detailed diagnostics
   - INFO: Normal operations
   - WARNING: Potential issues
   - ERROR: Failures
   - CRITICAL: Service-level failures

2. **Include context in messages**
   ```python
   # Good
   logger.error(f"Failed to process file: {filename}")

   # Less helpful
   logger.error("File processing failed")
   ```

3. **Use structured logging**
   ```python
   logger.info(f"Processed {count} files in {duration:.2f}s")
   ```

4. **Don't log sensitive data**
   - Avoid passwords, tokens, personal data
   - Sanitize user input before logging

5. **Use performance tracking for slow operations**
   ```python
   with PerformanceLogger(logger, "Slow operation"):
       # ... expensive operation ...
   ```

## Maintenance

### Clean Old Logs

Manually clean logs older than 30 days:

```bash
# Linux/Mac
find logs/ -name "*.log*" -mtime +30 -delete

# Windows PowerShell
Get-ChildItem logs\ -Filter *.log* | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

### Archive Logs

Archive important logs before they rotate:

```bash
# Create archive
tar -czf logs_archive_$(date +%Y%m%d).tar.gz logs/

# Or zip on Windows
Compress-Archive -Path logs\* -DestinationPath logs_archive_$(Get-Date -Format 'yyyyMMdd').zip
```

## Support

For issues or questions about the logging system:
1. Check this guide
2. Review log configuration in `src/logging_config.py`
3. Check for errors in `logs/error.log`
