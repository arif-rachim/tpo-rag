# TPO RAG: JAC RAG for Safety

TPO RAG is the JAC retrieval-augmented generation (RAG) system for safety documents. It lets an LLM assistant answer questions from an organisation's library of safety regulations and technical documents in English and Arabic, citing the original text, instead of relying on the model's own knowledge. It has two halves. Ingestion reads PDF, Word, PowerPoint and Excel files, splits them into overlapping chunks, tags each chunk with metadata and named entities, and stores them in a ChromaDB vector database and a BM25 keyword index. Retrieval is a FastMCP server that runs hybrid semantic plus keyword search, reranks the results with a multilingual cross-encoder and exposes `search_documents`, `list_documents` and `open_document` as MCP tools, so it can be plugged into an MCP-capable assistant (AskMai) or exposed through mcpo. The same Python server also hosts a React web app for uploading documents, managing folders, running ingestion and searching by hand. It runs fully offline on Windows or in a Windows container.

> Status: working prototype; the launch scripts and container images target Windows (`.bat` launchers, `.venv\Scripts`).

## Features

- Multi-format ingestion: PDF (PyMuPDF, including tables), DOCX (python-docx), PPTX (python-pptx), XLSX/XLS/XLSM (converted to JSON first)
- Paragraph-based chunking into chunks of about 800 characters with a 100-character overlap cut at word boundaries
- Per-chunk metadata: file name, page, total pages, chunk index, language, file type, size and timestamps
- Named-entity recognition (people and organisations) as lightweight graph-like metadata
- Hybrid search: 70% semantic score + 30% BM25 score, deduplicated, then reranked with `bge-reranker-v2-m3` (English and Arabic)
- MCP tools over streamable HTTP or stdio, with tool descriptions and server instructions loaded from text files in `config/instructions/`
- Optional SharePoint downloader (NTLM) that pulls a document library into the documents folder
- Web app: login, document upload and deletion, folder tree, in-browser document viewer, search with highlighting, ingestion start/stop with live logs
- Offline operation: Hugging Face offline mode and telemetry opt-outs are set in code; models are loaded from local folders
- Rotating application, error and ingestion logs in `logs/`

## Tech stack

Python 3.12 · FastMCP · Starlette/uvicorn · ChromaDB · sentence-transformers · rank_bm25 · Hugging Face Transformers · PyMuPDF · React 19 · Vite · Tailwind CSS · Axios · mcpo · Docker (Windows containers)

## How it works

### Ingestion

The approach follows two suggestions from the project's domain experts: use a reranker and knowledge-graph information, and use hybrid search that combines semantic and keyword search. `bge-reranker-v2-m3` was chosen for reranking because it supports Arabic and English. Building a full knowledge graph was out of scope, so named-entity recognition (NER) is used as a simple way to get graph-like information, and BM25 provides the keyword side of the hybrid search.

In summary:

1. A multilingual embedding model (`multilingual-e5-large`)
2. An NER model (`bert-base-multilingual-cased-ner-hrl`) to pull out people and organisation names
3. BM25 for keyword matching

Steps:

1. Walk the documents folder (recursively) for every supported file type.
2. Extract pages (and tables for PDFs, sheets for Excel) from each file.
3. Split each page's text into paragraphs.
4. Combine paragraphs into chunks of about 800 characters, overlapping 100 characters so the chunks flow together. A chunk can contain several paragraphs separated by a blank line.
5. Create metadata for every chunk: file name, page number, total pages, chunk index, language and file details.
6. Run NER on the first chunk of each page and add any person or organisation names to the metadata.
7. Create embeddings for all chunks with the embedding model.
8. Build a unique ID for each chunk using `{file_name}_{page}_{index}` and insert the chunks, embeddings, metadata and IDs into a Chroma collection in batches of 100.
9. Tokenize every chunk into words, build a BM25 index from the tokens, and save it (together with the chunks and metadata) with `pickle.dump`.

### Retrieval

1. The LLM calls the MCP tool `search_documents` with the user's query.
2. The tool encodes the query with the same embedding model and runs a semantic search in the vector database.
3. It also runs a keyword search with the BM25 index.
4. The two result sets are merged and duplicate chunks are removed.
5. The top candidates are reranked with the cross-encoder to score how well they match the query.
6. The chunks are sorted by score and only the top `max_results` (1–25, default 10) are kept.
7. The chunks go back to the LLM, which writes the answer from them.

`list_documents` returns the indexed documents, and `open_document` renders a document (optionally at a given PDF page) in an HTML iframe.

## Getting started

Prerequisites: Python 3.12, [uv](https://github.com/astral-sh/uv), Node.js and npm, and the three models downloaded into the folders set by the `PATH_MODEL_*` variables.

```bash
# Install Python dependencies (CPU build of PyTorch)
uv pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match

# Configure
cp .env.example .env    # then edit the values

# Optional: download documents from SharePoint
python src/download.py

# Build the vector and BM25 indexes
python src/ingest.py

# Start the MCP server + web API (HTTP)
python src/main.py

# Or run the MCP server over stdio behind mcpo
mcpo -- python src/main.py --transport stdio
```

On Windows the same steps are wrapped in `install_requirements.bat`, `start-download.bat`, `start-ingestion.bat`, `start-server.bat` and `start-mcpo.bat`.

Web app (development):

```bash
cd frontend
npm install
npm run dev       # runs sync-env first, which writes frontend/.env from the root .env
npm run build     # production build into frontend/dist, served by the backend under /app
npm run lint
```

### Environment variables

Defined in `.env.example` and read by `src/config.py` (names only):

- Paths: `PATH_DOCUMENTS`, `PATH_MODEL_EMBEDDER`, `PATH_MODEL_RERANKER`, `PATH_MODEL_NER`, `PATH_VECTOR_DB_STORAGE`, `PATH_BM25_INDEX_FILE`, `VECTOR_DB_COLLECTION_NAME`
- SharePoint: `PORTAL_URL`, `PORTAL_LDAP_USER`, `PORTAL_LDAP_PASSWORD`, `PORTAL_LDAP_DOMAIN`, `PORTAL_LIBRARY_NAME`
- Server: `MCP_SERVER_PROTOCOL`, `MCP_SERVER_HOST`, `MCP_SERVER_PORT`, `MCP_SERVER_NAME`
- MCP instructions: `MCP_SERVER_INSTRUCTION_FILE`, `SEARCH_DOCUMENT_TOOL_DESCRIPTION_FILE`, `LIST_DOCUMENTS_TOOL_DESCRIPTION_FILE`
- Web app: `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD_HASH` (SHA-256), `SESSION_TIMEOUT_HOURS`, `MAX_UPLOAD_SIZE_MB`, `ALLOWED_FILE_TYPES`, `CORS_ORIGINS`

The built-in default admin account must be changed before the server is exposed to anyone; see [README_WEB_APP.md](README_WEB_APP.md#security) for how to generate a new password hash.

## Web API

The server listens on `0.0.0.0:<MCP_SERVER_PORT>` (default 3222) and serves:

| Route | Purpose |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Session authentication |
| `GET /api/documents`, `POST /api/documents/upload`, `DELETE /api/documents/{filename}` | Document management |
| `POST /api/folders`, `GET /api/folders/tree`, `DELETE /api/folders/{path}` | Folder management |
| `POST /api/search` | Search (same pipeline as the MCP tool) |
| `POST /api/ingestion/start`, `GET /api/ingestion/status`, `POST /api/ingestion/stop`, `GET /api/logs/recent` | Ingestion control and logs |
| `GET /pdf/get/{filename}`, `GET /file/view/{filename}` | Document viewing |
| `/app` | Built React app (`frontend/dist`) |
| `/` | MCP endpoint |

## Project structure

```text
src/
  main.py               entry point: HTTP server, or --transport stdio
  config.py             .env loading, paths, instruction files, offline mode
  auth.py               session auth (stdlib hashlib/secrets)
  ingestion_manager.py  starts/stops ingestion as a subprocess for the web app
  logging_config.py     rotating log files
  download.py, downloader/   SharePoint downloader
  ingest.py, ingestor/       extraction, chunking, NER, embeddings, Chroma + BM25
  retriever/retrieve.py      hybrid search, MCP tools, REST API, static hosting
config/instructions/    MCP server instructions and tool descriptions
frontend/               React + Vite web app
public/                 standalone PDF viewer page
scripts/sync-env.js     writes frontend/.env from the root .env
Dockerfile.base, Dockerfile  Windows container images
```

## Further documentation

- [README_WEB_APP.md](README_WEB_APP.md): the web application in detail
- [DEPLOYMENT.md](DEPLOYMENT.md): deployment guide
- [LOGGING_GUIDE.md](LOGGING_GUIDE.md): logging setup
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md): implementation notes and design decisions
