# RAG Document Manager - Deployment Guide

Complete guide for deploying the RAG Document Manager web application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher
- **uv**: Python package installer (recommended)
- **Git**: For version control

### Hardware Requirements (Minimum)
- **RAM**: 8GB (16GB recommended for large document sets)
- **Storage**: 10GB free space
- **CPU**: 4 cores recommended

---

## Backend Setup

### 1. Install Dependencies

Using `uv` (recommended):
```bash
uv pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match
```

Or using pip:
```bash
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
```

### 2. Configure Environment Variables

Create or update `.env` file in the project root:

```bash
# Server Configuration
MCP_SERVER_HOST=0.0.0.0
MCP_SERVER_PORT=3223

# Authentication (stdlib-only, no JWT/bcrypt!)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
SESSION_TIMEOUT_HOURS=8

# File Upload
MAX_UPLOAD_SIZE_MB=50
ALLOWED_FILE_TYPES=.pdf,.docx,.pptx,.xlsx,.xls

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://155.121.16.193:5173,http://your-production-domain.com

# ChromaDB Configuration
CHROMA_PERSIST_DIR=data/tpo/chroma-store
DOCUMENTS_DIR=data/tpo/documents

# Model Configuration
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
RERANKER_MODEL_NAME=BAAI/bge-reranker-base

# Logging
LOG_LEVEL=INFO
LOG_DIR=logs
```

### 3. Generate Password Hash

To create a new admin password hash:

```python
import hashlib
password = "your_secure_password"
hash_value = hashlib.sha256(password.encode('utf-8')).hexdigest()
print(f"Password hash: {hash_value}")
```

Add the hash to `.env` as `DEFAULT_ADMIN_PASSWORD_HASH`.

### 4. Initialize Data Directories

```bash
mkdir -p data/tpo/documents
mkdir -p data/tpo/chroma-store
mkdir -p logs
```

### 5. Run Initial Ingestion (Optional)

If you have documents to index:

```bash
python src/ingestor/ingest.py
```

### 6. Start Backend Server

For development:
```bash
python src/main.py
```

For production (see [Production Deployment](#production-deployment)).

---

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `frontend/.env`:

```bash
# Development
VITE_API_BASE_URL=http://localhost:3223

# Production (update with your server IP/domain)
# VITE_API_BASE_URL=http://your-server-ip:3223
```

### 4. Development Mode

```bash
npm run dev
```

Access at: `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

This creates optimized files in `frontend/dist/`.

---

## Production Deployment

### Option 1: Serve Frontend from FastAPI (Recommended)

This serves both frontend and backend from a single server.

#### Step 1: Build Frontend

```bash
cd frontend
npm run build
cd ..
```

#### Step 2: Update Backend to Serve Static Files

Add to `src/retriever/retrieve.py`:

```python
from starlette.staticfiles import StaticFiles
from pathlib import Path

# Add static file serving
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    routes.append(Mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets"))

    # Serve index.html for all non-API routes (SPA routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve index.html for all routes except API and file routes
        if not full_path.startswith("api/") and not full_path.startswith("file/"):
            index_file = FRONTEND_DIST / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
        return JSONResponse({"error": "Not found"}, status_code=404)
```

#### Step 3: Update CORS Origins

In `.env`, update CORS to allow your production domain:

```bash
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

#### Step 4: Run Production Server

Using systemd (Linux):

Create `/etc/systemd/system/rag-manager.service`:

```ini
[Unit]
Description=RAG Document Manager
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/tpo-rag
Environment="PATH=/path/to/tpo-rag/.venv/bin"
ExecStart=/path/to/tpo-rag/.venv/bin/python src/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable rag-manager
sudo systemctl start rag-manager
sudo systemctl status rag-manager
```

View logs:

```bash
sudo journalctl -u rag-manager -f
```

### Option 2: Separate Frontend and Backend Servers

#### Backend

Run backend on port 3223 (see systemd service above).

#### Frontend

Use nginx to serve static files:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/tpo-rag/frontend/dist;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Update `frontend/.env` to point to backend:

```bash
VITE_API_BASE_URL=http://your-backend-server:3223
```

Rebuild frontend after changing `.env`:

```bash
cd frontend
npm run build
```

### Option 3: Using Docker (Future Enhancement)

Docker configuration can be added in a future sprint.

---

## Configuration

### Backend Configuration (`src/config.py`)

All configuration is loaded from environment variables (`.env` file).

**Key Settings:**
- `MCP_SERVER_PORT`: Server port (default: 3223)
- `DEFAULT_ADMIN_USERNAME`: Admin username
- `DEFAULT_ADMIN_PASSWORD_HASH`: SHA-256 hash of admin password
- `SESSION_TIMEOUT_HOURS`: Session expiration (default: 8 hours)
- `MAX_UPLOAD_SIZE_MB`: Maximum file upload size
- `CORS_ORIGINS`: Comma-separated list of allowed origins

### Frontend Configuration (`frontend/.env`)

- `VITE_API_BASE_URL`: Backend API URL

---

## Security Considerations

### Authentication

1. **Change Default Password**: Always change the default admin password before deployment
2. **Use HTTPS**: In production, always use HTTPS (configure reverse proxy with SSL)
3. **Session Security**: Sessions expire after 8 hours (configurable)

### Network Security

1. **Firewall**: Only expose necessary ports (80/443 for web, 3223 for backend if separate)
2. **CORS**: Restrict `CORS_ORIGINS` to your actual domain(s)
3. **Internal Network**: Consider deploying on internal network only if not internet-facing

### File Security

1. **Validate Uploads**: File type and size validation is enforced
2. **Storage**: Documents stored in `data/tpo/documents/` directory
3. **Permissions**: Ensure proper file system permissions

---

## Monitoring and Logs

### Backend Logs

Logs are written to:
- `logs/app.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/ingestion.log` - Ingestion process logs

Logs rotate automatically (10MB max size, 5 backups).

### View Logs

```bash
# Tail application log
tail -f logs/app.log

# View errors
tail -f logs/error.log

# Monitor ingestion
tail -f logs/ingestion.log
```

### Health Check

Check if server is running:

```bash
curl http://localhost:3223/api/ingestion/status
```

---

## Troubleshooting

### Backend Issues

**Server won't start:**
1. Check if port 3223 is already in use: `netstat -ano | findstr :3223` (Windows) or `lsof -i :3223` (Linux)
2. Verify Python dependencies are installed
3. Check `.env` file exists and is configured correctly
4. Review `logs/error.log`

**Authentication fails:**
1. Verify password hash in `.env` matches your password
2. Check `DEFAULT_ADMIN_USERNAME` is correct
3. Clear browser cookies and try again

**File upload fails:**
1. Check file size is under `MAX_UPLOAD_SIZE_MB`
2. Verify file type is in `ALLOWED_FILE_TYPES`
3. Ensure `data/tpo/documents/` directory exists and is writable
4. Check if ingestion is running (file operations locked during ingestion)

### Frontend Issues

**Build fails:**
1. Ensure Node.js 18+ is installed: `node --version`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript/JSX errors in console

**API requests fail:**
1. Verify `VITE_API_BASE_URL` in frontend `.env` is correct
2. Check CORS configuration in backend `.env`
3. Ensure backend server is running
4. Check browser console for errors

**Login doesn't work:**
1. Verify backend is accessible
2. Check username/password are correct
3. Clear browser localStorage: `localStorage.clear()`
4. Check browser console for 401 errors

### Ingestion Issues

**Ingestion stuck:**
1. Check `logs/ingestion.log` for errors
2. Stop and restart ingestion from UI
3. Check if ChromaDB directory is writable
4. Verify documents exist in `data/tpo/documents/`

**Documents not searchable:**
1. Ensure ingestion completed successfully
2. Check ChromaDB data in `data/tpo/chroma-store/`
3. Re-run ingestion

---

## Performance Optimization

### Backend

1. **Use CPU-optimized PyTorch**: Already configured in `requirements.txt`
2. **Increase Workers**: For production, consider using gunicorn with multiple workers
3. **Caching**: Consider adding Redis for session storage (future enhancement)

### Frontend

1. **Enable Gzip**: Configure nginx/Apache to enable gzip compression
2. **CDN**: Serve static assets from CDN (production)
3. **Lazy Loading**: Already implemented for components

### Database

1. **ChromaDB Performance**:
   - Increase available RAM
   - Use SSD storage for `chroma-store`
   - Limit document size

---

## Backup and Restore

### What to Backup

1. **Documents**: `data/tpo/documents/`
2. **ChromaDB**: `data/tpo/chroma-store/`
3. **Logs**: `logs/` (optional)
4. **Configuration**: `.env` file

### Backup Script

```bash
#!/bin/bash
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup documents and database
cp -r data/tpo/documents "$BACKUP_DIR/"
cp -r data/tpo/chroma-store "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/"

echo "Backup completed: $BACKUP_DIR"
```

### Restore

```bash
#!/bin/bash
BACKUP_DIR=$1

cp -r "$BACKUP_DIR/documents" data/tpo/
cp -r "$BACKUP_DIR/chroma-store" data/tpo/
cp "$BACKUP_DIR/.env" .

echo "Restore completed from: $BACKUP_DIR"
```

---

## Upgrading

### Backend Upgrade

1. Pull latest code: `git pull`
2. Update dependencies: `uv pip install -r requirements.txt`
3. Run database migrations (if any)
4. Restart service: `sudo systemctl restart rag-manager`

### Frontend Upgrade

1. Pull latest code: `git pull`
2. Update dependencies: `cd frontend && npm install`
3. Rebuild: `npm run build`
4. Restart web server (if using separate nginx)

---

## Support and Contact

For issues or questions:
- Check logs in `logs/` directory
- Review this deployment guide
- Check project README.md

---

## Appendix: Quick Start Checklist

### Development Setup

- [ ] Install Python 3.10+
- [ ] Install Node.js 18+
- [ ] Install dependencies: `uv pip install -r requirements.txt`
- [ ] Configure `.env` file
- [ ] Create data directories
- [ ] Start backend: `python src/main.py`
- [ ] Install frontend deps: `cd frontend && npm install`
- [ ] Start frontend: `npm run dev`
- [ ] Access at `http://localhost:5173`
- [ ] Login with admin/admin (or your configured credentials)

### Production Setup

- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Configure production `.env` (update CORS, password, etc.)
- [ ] Setup systemd service (or equivalent)
- [ ] Configure reverse proxy (nginx) with SSL
- [ ] Update DNS records
- [ ] Test authentication
- [ ] Test file upload/delete
- [ ] Test search
- [ ] Test ingestion
- [ ] Setup backup script
- [ ] Configure monitoring/alerts
- [ ] Document admin procedures

---

**Last Updated**: 2026-01-07
**Version**: 1.0
