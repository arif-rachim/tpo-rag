# RAG Document Manager - Web Application

A comprehensive web-based document management system with RAG (Retrieval-Augmented Generation) search capabilities.

## Features

### 🔐 Authentication
- Session-based authentication (Python stdlib only - no JWT dependencies)
- Secure password hashing with SHA-256
- 8-hour session timeout
- Auto-logout on token expiration

### 📄 Document Management
- Upload documents (PDF, DOCX, PPTX, XLSX)
- Drag-and-drop file upload
- View documents in browser
- Delete documents with confirmation
- File operation locking during ingestion
- Upload progress tracking

### 🔍 Search Interface
- Google-style search UI
- Query term highlighting in results
- Relevance scoring
- Click-to-view documents
- Fast semantic search with reranking

### ⚙️ Ingestion Control
- Manual ingestion triggering
- Real-time log viewing (terminal-style)
- Status monitoring with polling
- File operation locking during ingestion
- Process management (start/stop)

### 🎨 User Interface
- Clean, modern design with Tailwind CSS
- Responsive layout (mobile-friendly)
- Toast notifications
- Loading states and error handling
- Smooth transitions

## Tech Stack

### Backend
- **FastAPI**: Web framework
- **Starlette**: ASGI framework
- **ChromaDB**: Vector database
- **Sentence Transformers**: Embeddings
- **BGE Reranker**: Result reranking
- **Python stdlib**: Authentication (hashlib, secrets, datetime)
- **NO external auth libraries**: No JWT, no bcrypt, no OAuth

### Frontend
- **React**: UI framework
- **Vite**: Build tool
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **React Hot Toast**: Notifications

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### 1. Backend Setup

```bash
# Install Python dependencies
uv pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Configure environment (optional, has defaults)
cp .env.example .env  # Edit as needed

# Create data directories
mkdir -p data/tpo/documents data/tpo/chroma-store logs

# Start backend server
python src/main.py
```

Backend runs on `http://localhost:3223`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Access Application

1. Open browser to `http://localhost:5173`
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`
3. Change password after first login (see [Security](#security))

## Project Structure

```
tpo-rag/
├── src/
│   ├── auth.py                 # Authentication (stdlib only)
│   ├── config.py               # Configuration management
│   ├── logging_config.py       # Logging setup
│   ├── ingestion_manager.py    # Ingestion control
│   ├── main.py                 # FastAPI application entry
│   ├── retriever/
│   │   └── retrieve.py         # RAG server with REST API
│   └── ingestor/
│       └── ingest.py           # Document ingestion
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API service layer
│   │   ├── contexts/           # React contexts
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   ├── public/                 # Static assets
│   ├── .env                    # Frontend config
│   ├── package.json            # Dependencies
│   └── vite.config.js          # Vite configuration
├── data/
│   └── tpo/
│       ├── documents/          # Uploaded documents
│       └── chroma-store/       # Vector database
├── logs/                       # Application logs
├── .env                        # Backend config
├── requirements.txt            # Python dependencies
├── DEPLOYMENT.md               # Deployment guide
└── README_WEB_APP.md          # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents/upload` - Upload document
- `DELETE /api/documents/{filename}` - Delete document
- `GET /file/view/{filename}` - View document

### Search
- `POST /api/search` - Search documents

### Ingestion
- `POST /api/ingestion/start` - Start ingestion
- `GET /api/ingestion/status` - Get status
- `POST /api/ingestion/stop` - Stop ingestion
- `GET /api/logs/recent` - Get recent logs

## Configuration

### Backend (.env)

```bash
# Server
MCP_SERVER_PORT=3223

# Authentication (stdlib only!)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD_HASH=8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
SESSION_TIMEOUT_HOURS=8

# File Upload
MAX_UPLOAD_SIZE_MB=50
ALLOWED_FILE_TYPES=.pdf,.docx,.pptx,.xlsx,.xls

# CORS
CORS_ORIGINS=http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:3223
```

## Security

### Change Default Password

1. Generate password hash:

```python
import hashlib
password = "your_new_password"
hash_value = hashlib.sha256(password.encode('utf-8')).hexdigest()
print(hash_value)
```

2. Update `.env`:

```bash
DEFAULT_ADMIN_PASSWORD_HASH=<your_hash_here>
```

3. Restart backend server

### Production Security Checklist

- [ ] Change default admin password
- [ ] Use HTTPS (configure reverse proxy)
- [ ] Restrict CORS origins to your domain
- [ ] Use firewall to limit port access
- [ ] Set strong session timeout
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity

## Development

### Frontend Development

```bash
cd frontend

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```bash
# Run with auto-reload
python src/main.py

# View logs
tail -f logs/app.log
```

## Testing

### Manual Testing Checklist

- [ ] Login/Logout
- [ ] Upload document
- [ ] View document
- [ ] Delete document
- [ ] Search documents
- [ ] Start ingestion
- [ ] Monitor logs
- [ ] Stop ingestion
- [ ] File operations blocked during ingestion

## Troubleshooting

### Frontend not connecting to backend

Check:
1. Backend is running on port 3223
2. `VITE_API_BASE_URL` in `frontend/.env` is correct
3. CORS is configured correctly in backend `.env`
4. No firewall blocking port 3223

### Login fails

Check:
1. Username matches `DEFAULT_ADMIN_USERNAME`
2. Password hash matches `DEFAULT_ADMIN_PASSWORD_HASH`
3. Backend logs in `logs/error.log`
4. Clear browser localStorage

### File upload fails

Check:
1. File size under 50MB
2. File type is allowed (.pdf, .docx, etc.)
3. Ingestion is not running
4. `data/tpo/documents/` directory exists

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Production Deployment

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Update .env for production
# - Change admin password
# - Update CORS_ORIGINS
# - Set production domain

# Run backend (use systemd service in production)
python src/main.py
```

## Contributing

### Development Workflow

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Update documentation
5. Submit pull request

### Code Style

- **Python**: Follow PEP 8
- **JavaScript**: ESLint configuration
- **Commits**: Conventional commits format

## License

[Your License Here]

## Support

For issues or questions, check:
- Logs in `logs/` directory
- [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Project documentation

---

**Built with React + FastAPI + ChromaDB**
