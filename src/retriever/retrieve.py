#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
RAG server (MCP) – semantic + BM25 search with optional re‑ranking.
Now supports PDFs **and** Word / PowerPoint / Excel documents.
"""

# ─────────────────────────────────────────────────────────────────────────────
#   Imports
# ─────────────────────────────────────────────────────────────────────────────
import logging
import re
import pickle
from pathlib import Path
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Tuple

import chromadb
from fastmcp import FastMCP
from fastmcp.server.http import StarletteWithLifespan
from mcp_ui_server import create_ui_resource
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, CrossEncoder
from starlette.responses import FileResponse, JSONResponse
from urllib.parse import quote
# ─────────────────────────────────────────────────────────────────────────────
#   Configuration & constants
# ─────────────────────────────────────────────────────────────────────────────
import config

# ─────────────────────────────────────────────────────────────────────────────
#   Logging configuration
# ─────────────────────────────────────────────────────────────────────────────
# Import comprehensive logging utilities
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from logging_config import (
    setup_logger,
    log_exception,
    PerformanceLogger,
    log_system_info,
)

# Create module logger with comprehensive configuration
_logger = setup_logger(__name__)

_logger.info("Retriever module loaded")
_logger.debug("Configuration paths:")
_logger.debug(f"  Vector DB: {config.PATH_VECTOR_DB_STORAGE}")
_logger.debug(f"  BM25 Index: {config.PATH_BM25_INDEX_FILE}")
_logger.debug(f"  Embedder Model: {config.PATH_MODEL_EMBEDDER}")
_logger.debug(f"  Reranker Model: {config.PATH_MODEL_RERANKER}")
_logger.debug(f"  Documents Root: {config.PATH_DOCUMENTS}")

# ─────────────────────────────────────────────────────────────────────────────
#   Paths / flags
# ─────────────────────────────────────────────────────────────────────────────
VECTOR_DB = Path(config.PATH_VECTOR_DB_STORAGE)
BM25_IDX = Path(config.PATH_BM25_INDEX_FILE)
EMBED_MODEL = Path(config.PATH_MODEL_EMBEDDER)
RERANK_MODEL = Path(config.PATH_MODEL_RERANKER)
DOCS_ROOT = Path(config.PATH_DOCUMENTS)  # folder that holds the original files
PUBLIC_ROOT = Path(__file__).parent.parent.parent / "public"

# MIME type mappings for file serving
_MIME_TYPES = {
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
}

# runtime flags
SEM_WEIGHT = 0.7
ENABLE_BM25 = True
ENABLE_SEM = True

# Configure offline mode for HuggingFace models
config.configure_offline_mode()

# ─────────────────────────────────────────────────────────────────────────────
#   Global objects (lazy‑loaded)
# ─────────────────────────────────────────────────────────────────────────────
_mcp = FastMCP(name=config.MCP_SERVER_NAME, instructions=config.MCP_SERVER_INSTRUCTION)

_model: "SentenceTransformer | None" = None
_client: "chromadb.PersistentClient | None" = None
_collection: "chromadb.Collection | None" = None
_bm25: "Dict[str, Any] | None" = None
_reranker: "CrossEncoder | None" = None
_mcp_app: "StarletteWithLifespan | None" = None



# ─────────────────────────────────────────────────────────────────────────────
#   Helper / lifecycle utilities
# ─────────────────────────────────────────────────────────────────────────────
def _load_resources() -> Tuple[
    SentenceTransformer,
    chromadb.PersistentClient,
    chromadb.Collection,
    Dict[str, Any],
    CrossEncoder,
]:
    """Initialise everything that is required for a search request."""
    global _model, _client, _collection, _bm25, _reranker

    try:
        if _model is None:
            _logger.info("Loading SentenceTransformer model...")
            _logger.debug(f"Model path: {EMBED_MODEL}")
            with PerformanceLogger(_logger, "Loading SentenceTransformer model"):
                _model = SentenceTransformer(
                    str(EMBED_MODEL),
                    device="cpu",
                    local_files_only=True,
                    tokenizer_kwargs={"clean_up_tokenization_spaces": True, "fix_mistral_regex": True},
                )
            _logger.info("SentenceTransformer loaded successfully")

        if _client is None:
            _logger.info("Opening ChromaDB client...")
            _logger.debug(f"ChromaDB path: {VECTOR_DB}")
            with PerformanceLogger(_logger, "Initializing ChromaDB client"):
                _client = chromadb.PersistentClient(path=str(VECTOR_DB))
            _logger.info("ChromaDB client opened successfully")

        if _collection is None:
            _logger.info(f"Fetching collection: {config.VECTOR_DB_COLLECTION_NAME}")
            with PerformanceLogger(_logger, f"Fetching collection {config.VECTOR_DB_COLLECTION_NAME}"):
                _collection = _client.get_collection(config.VECTOR_DB_COLLECTION_NAME)
            collection_count = _collection.count()
            _logger.info(f"Collection loaded successfully with {collection_count} items")

        if _bm25 is None:
            _logger.info("Loading BM25 index...")
            _logger.debug(f"BM25 index path: {BM25_IDX}")
            with PerformanceLogger(_logger, "Loading BM25 index"):
                _bm25 = pickle.load(open(BM25_IDX, "rb"))
            bm25_chunks = len(_bm25.get("chunks", []))
            _logger.info(f"BM25 index loaded successfully with {bm25_chunks} chunks")

        if _reranker is None:
            _logger.info("Loading CrossEncoder reranker...")
            _logger.debug(f"Reranker model path: {RERANK_MODEL}")
            with PerformanceLogger(_logger, "Loading CrossEncoder reranker"):
                _reranker = CrossEncoder(str(RERANK_MODEL), max_length=512, device="cpu")
            _logger.info("CrossEncoder reranker loaded successfully")

        _logger.debug("All resources loaded and ready")
        return _model, _client, _collection, _bm25, _reranker

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, "loading resources")
        _logger.critical("Failed to load required resources - service cannot start")
        raise

_load_resources()

async def _cleanup() -> None:
    """Release lazily‑created globals."""
    _logger.info("=" * 80)
    _logger.info("Starting cleanup of loaded resources...")
    _logger.info("=" * 80)

    globals_to_clear = ["_client", "_model", "_reranker", "_collection", "_bm25"]
    cleared_count = 0
    failed_count = 0

    for name in globals_to_clear:
        if (obj := globals().get(name)) is not None:
            try:
                del globals()[name]
                _logger.info(f"Successfully cleared: {name}")
                cleared_count += 1
            except Exception as exc:  # pragma: no cover
                log_exception(_logger, exc, f"clearing {name}")
                _logger.error(f"Failed to clear: {name}")
                failed_count += 1
        else:
            _logger.debug(f"Resource already cleared or not loaded: {name}")

    _logger.info("=" * 80)
    _logger.info(f"Cleanup complete: {cleared_count} cleared, {failed_count} failed")
    _logger.info("=" * 80)


@asynccontextmanager
async def _my_lifespan(app):
    """Wrap the built‑in MCP lifespan so we can run our cleanup."""
    async with _mcp_app.lifespan(app):
        yield
        await _cleanup()


# ─────────────────────────────────────────────────────────────────────────────
#   Pydantic models
# ─────────────────────────────────────────────────────────────────────────────
class SearchDocumentsParams(BaseModel):
    query: str = Field(description="Query string")
    max_results: int = Field(default=10, description="Maximum number of results to return")


class ChunkMetadata(BaseModel):
    """Metadata that lives on every stored chunk."""
    filename: str
    page: int | str
    chunk: int
    total_pages: int
    lang: str
    jac_reg: str | None = None
    jac_sgl: str | None = None
    sop: str | None = None

    # ---- NEW OPTIONAL FIELDS -------------------------------------------------
    sheet_title: str | None = None
    total_cells: int | None = None
    file_type: str | None = None
    # -------------------------------------------------------------------------

    created_at: str | None = None
    modified_at: str | None = None


class SearchResult(BaseModel):
    text: str
    metadata: ChunkMetadata
    score: float
    rerank_score: float | None = None
    highlighted_terms: List[str] | None = None


class SearchDocumentsResult(BaseModel):
    results: List[SearchResult]
    total_found: int = Field(default=0, description="Total number of results")
    query: str | None = Field(default=None, description="Query string")
    error: str | None = Field(default=None, description="Error string")


class ListDocumentsResults(BaseModel):
    documents: List[Dict[str, Any]] = Field(default_factory=list, description="List of documents")
    summary: Dict[str, int] = Field(default_factory=dict, description="Summary of the documents")
    error: str | None = Field(default=None, description="Error string")


# ─────────────────────────────────────────────────────────────────────────────
#   Core search logic
# ─────────────────────────────────────────────────────────────────────────────
def _semantic_search(
        model: SentenceTransformer,
        collection: chromadb.Collection,
        query: str,
        top_k: int,
) -> List[SearchResult]:
    """Perform semantic search using embeddings."""
    try:
        _logger.debug(f"Starting semantic search for query: '{query[:100]}...' (top_k={top_k})")

        with PerformanceLogger(_logger, "Semantic search encoding"):
            emb = model.encode([f"query: {query}"], normalize_embeddings=True)[0]

        with PerformanceLogger(_logger, "Semantic search query"):
            raw = collection.query(query_embeddings=[emb.tolist()], n_results=top_k * 2)

        results = [
            SearchResult(metadata=ChunkMetadata(**md), text=txt, score=(1 - dist) * SEM_WEIGHT)
            for txt, md, dist in zip(raw["documents"][0], raw["metadatas"][0], raw["distances"][0])
        ]

        _logger.info(f"Semantic search returned {len(results)} results (requested {top_k * 2})")
        if results:
            _logger.debug(f"Top semantic result score: {results[0].score:.4f}")

        return results

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, f"semantic search for '{query[:50]}'")
        raise


def _bm25_search(bm25: Dict[str, Any], query: str, top_k: int) -> List[SearchResult]:
    """Perform BM25 keyword search."""
    try:
        _logger.debug(f"Starting BM25 search for query: '{query[:100]}...' (top_k={top_k})")

        with PerformanceLogger(_logger, "BM25 tokenization and scoring"):
            tokens = re.findall(r"\w+", query.lower())
            _logger.debug(f"Query tokenized into {len(tokens)} tokens")
            scores = bm25["bm25"].get_scores(tokens)

        if scores.size == 0:
            _logger.warning("BM25 search returned empty scores")
            return []

        # top‑k*2 indices, descending
        top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[: top_k * 2]
        max_score = max(scores[i] for i in top_idx) or 1

        results: List[SearchResult] = []
        for i in top_idx:
            if scores[i] <= 0:
                continue
            meta = bm25.get("metadatas", [{}])[i] or {}
            results.append(
                SearchResult(
                    text=bm25["chunks"][i],
                    metadata=ChunkMetadata(**meta) if meta else ChunkMetadata(**{}),  # type: ignore[arg-type]
                    score=(scores[i] / max_score) * (1 - SEM_WEIGHT),
                )
            )

        _logger.info(f"BM25 search returned {len(results)} results (requested {top_k * 2})")
        if results:
            _logger.debug(f"Top BM25 result score: {results[0].score:.4f}")

        return results

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, f"BM25 search for '{query[:50]}'")
        raise


def _deduplicate_and_sort(results: List[SearchResult]) -> List[SearchResult]:
    """Remove duplicate results and sort by score."""
    _logger.debug(f"Deduplicating {len(results)} results...")

    seen, uniq = set(), []
    for r in sorted(results, key=lambda x: x.score, reverse=True):
        snippet = r.text[:100]
        if snippet not in seen:
            seen.add(snippet)
            uniq.append(r)

    removed_count = len(results) - len(uniq)
    _logger.info(f"Deduplicated {len(results)} → {len(uniq)} results ({removed_count} duplicates removed)")

    return uniq


def _rerank(reranker: CrossEncoder, query: str, candidates: List[SearchResult]) -> List[SearchResult]:
    """Rerank search results using CrossEncoder."""
    if len(candidates) <= 1:
        _logger.debug("Skipping reranking - only 1 or fewer candidates")
        return candidates

    try:
        _logger.info(f"Reranking {len(candidates)} candidates...")

        with PerformanceLogger(_logger, f"Reranking {len(candidates)} candidates"):
            pairs = [[query, c.text[:512]] for c in candidates]
            scores = reranker.predict(pairs)

        for c, s in zip(candidates, scores):
            c.rerank_score = float(s)

        reranked = sorted(candidates, key=lambda x: x.rerank_score, reverse=True)

        if reranked:
            _logger.debug(f"Top rerank score: {reranked[0].rerank_score:.4f}")
            _logger.debug(f"Bottom rerank score: {reranked[-1].rerank_score:.4f}")

        _logger.info(f"Reranking completed for {len(candidates)} candidates")
        return reranked

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, f"reranking for query '{query[:50]}'")
        raise


def search(query: str, top_k: int = 10) -> List[SearchResult]:
    """
    Main search function combining semantic and BM25 search with reranking.

    Parameters
    ----------
    query : str
        The search query
    top_k : int
        Number of results to return

    Returns
    -------
    List[SearchResult]
        Ranked search results
    """
    _logger.info("=" * 80)
    _logger.info(f"Search Request: '{query[:100]}...'")
    _logger.info(f"Requested results: {top_k}")
    _logger.info("=" * 80)

    with PerformanceLogger(_logger, "Complete search operation"):
        # Load all required resources
        _logger.debug("Loading search resources...")
        model, _, collection, bm25, reranker = _load_resources()

        results: List[SearchResult] = []

        # Perform semantic search if enabled
        if ENABLE_SEM:
            _logger.info("Semantic search: ENABLED")
            sem_results = _semantic_search(model, collection, query, top_k)
            results.extend(sem_results)
        else:
            _logger.info("Semantic search: DISABLED")

        # Perform BM25 search if enabled
        if ENABLE_BM25:
            _logger.info("BM25 search: ENABLED")
            bm25_results = _bm25_search(bm25, query, top_k)
            results.extend(bm25_results)
        else:
            _logger.info("BM25 search: DISABLED")

        _logger.info(f"Combined results before deduplication: {len(results)}")

        # Deduplicate and sort
        uniq = _deduplicate_and_sort(results)

        # Rerank if we have more results than requested
        if len(uniq) > top_k:
            _logger.info(f"Reranking {len(uniq)} results to select top {top_k}")
            uniq = _rerank(reranker, query, uniq)[:top_k]
        else:
            _logger.info(f"Skipping reranking - have {len(uniq)} results (<= {top_k})")

        final_results = uniq[:top_k]

    _logger.info("=" * 80)
    _logger.info(f"Search Complete: Returning {len(final_results)} results")
    if final_results:
        _logger.debug(f"Top result score: {final_results[0].score:.4f}")
        _logger.debug(f"Top result from: {final_results[0].metadata.filename}")
    _logger.info("=" * 80)

    return final_results


# ─────────────────────────────────────────────────────────────────────────────
#   MCP tool wrappers
# ─────────────────────────────────────────────────────────────────────────────
@_mcp.tool(description=config.SEARCH_DOCUMENT_TOOL_DESCRIPTION, name="search_documents")
def search_documents(query: str, max_results: int = 10) -> SearchDocumentsResult:
    """
    MCP tool: Search documents using hybrid semantic + BM25 search.

    Parameters
    ----------
    query : str
        The search query
    max_results : int
        Maximum number of results (clamped to 1-25)

    Returns
    -------
    SearchDocumentsResult
        Search results with metadata
    """
    _logger.info("=" * 80)
    _logger.info("MCP Tool Called: search_documents")
    _logger.info(f"Query: '{query[:100]}...'")
    _logger.info(f"Max results requested: {max_results}")
    _logger.info("=" * 80)

    try:
        # Validate query
        if not query.strip():
            _logger.warning("Empty query provided")
            return SearchDocumentsResult(
                error="Query is required",
                results=[],
                total_found=0,
                query=query
            )

        # Clamp max_results to valid range
        original_max = max_results
        max_results = max(1, min(25, max_results))
        if max_results != original_max:
            _logger.info(f"Clamped max_results from {original_max} to {max_results}")

        # Perform search
        with PerformanceLogger(_logger, "search_documents MCP tool"):
            results = search(query, top_k=max_results)

        _logger.info(f"search_documents succeeded: {len(results)} results returned")
        return SearchDocumentsResult(
            results=results,
            total_found=len(results),
            query=query
        )

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, f"search_documents for query '{query[:50]}'")
        _logger.error("search_documents failed - returning error response")
        return SearchDocumentsResult(
            error=str(exc),
            results=[],
            total_found=0,
            query=query
        )


@_mcp.tool(name="list_documents", description=config.LIST_DOCUMENTS_TOOL_DESCRIPTION)
def list_documents() -> ListDocumentsResults:
    """
    MCP tool: List all indexed documents with metadata.

    Returns
    -------
    ListDocumentsResults
        List of documents with summary statistics
    """
    _logger.info("=" * 80)
    _logger.info("MCP Tool Called: list_documents")
    _logger.info("=" * 80)

    try:
        with PerformanceLogger(_logger, "list_documents MCP tool"):
            # Load resources
            _logger.debug("Loading collection for document listing...")
            _, _, collection, _, _ = _load_resources()

            # Get all data from collection
            _logger.debug("Fetching all documents from collection...")
            data = collection.get()

            if not data or not data["metadatas"]:
                _logger.warning("Collection is empty - no documents to list")
                return ListDocumentsResults()

            total_items = len(data["metadatas"])
            _logger.info(f"Processing {total_items} metadata items...")

            # aggregate per file
            agg: Dict[str, Dict[str, Any]] = defaultdict(
                lambda: {
                    "chunks": 0,
                    "pages": set(),
                    "meta": {},
                    "sheet_titles": set(),
                    "file_type": None
                }
            )

            for meta in data["metadatas"]:
                fn = meta.get("filename", "unknown")
                cur = agg[fn]
                cur["chunks"] += 1
                cur["pages"].add(meta.get("page"))  # page may be int or str – set works fine
                if not cur["meta"]:
                    cur["meta"] = {
                        "filename": fn,
                        "total_pages": meta.get("total_pages", 0),
                        "lang": meta.get("lang", "unknown"),
                        "created_at": meta.get("created_at"),
                        "modified_at": meta.get("modified_at"),
                    }
                # collect sheet titles and file type during first pass
                if st := meta.get("sheet_title"):
                    cur["sheet_titles"].add(st)
                if not cur["file_type"] and (ft := meta.get("file_type")):
                    cur["file_type"] = ft

            _logger.debug(f"Aggregated into {len(agg)} unique documents")

            documents = [
                {
                    "filename": fn,
                    "total_pages": d["meta"]["total_pages"],
                    "indexed_pages": len(d["pages"]),
                    "chunks": d["chunks"],
                    "language": d["meta"]["lang"],
                    "created_at": d["meta"].get("created_at"),
                    "modified_at": d["meta"].get("modified_at"),
                    # optional sheet info (only present for Excel files)
                    "sheet_titles": sorted(d["sheet_titles"]),
                    # expose the file type if you want to show it in a UI
                    "file_type": d["file_type"],
                }
                for fn, d in agg.items()
            ]

            summary = {
                "total_documents": len(documents),
                "total_chunks": sum(d["chunks"] for d in documents),
                "total_pages": sum(d["total_pages"] for d in documents),
            }

            _logger.info("=" * 80)
            _logger.info("list_documents succeeded")
            _logger.info(f"  Documents: {summary['total_documents']}")
            _logger.info(f"  Total chunks: {summary['total_chunks']}")
            _logger.info(f"  Total pages: {summary['total_pages']}")
            _logger.info("=" * 80)

            return ListDocumentsResults(
                documents=sorted(documents, key=lambda x: x["filename"]),
                summary=summary
            )

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, "list_documents")
        _logger.error("list_documents failed - returning error response")
        return ListDocumentsResults(error=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
#   UI helper (PDF / generic document viewer)
# ─────────────────────────────────────────────────────────────────────────────
def _resize_script() -> str:
    """JavaScript that notifies the parent window about the iframe size."""
    return """
<script>
(function(){
    const send = () => {
        const h = Math.max(900, document.documentElement.scrollHeight);
        const w = document.documentElement.scrollWidth;
        window.parent.postMessage({type:'ui-size-change',payload:{height:h,width:w}}, '*');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', send);
    else send();
    if (typeof ResizeObserver !== 'undefined')
        new ResizeObserver(send).observe(document.documentElement);
})();
</script>
"""


@_mcp.tool(
    name="open_document",
    description="""
Render a document (PDF, Excel, PowerPoint, …) inside a full‑screen HTML iframe.

Parameters
----------
file_name: str
    Exact filename (or relative path) of the document to display.
page: int, optional (default=0)
    Zero‑based page number (only used for PDFs). For other formats the whole
    document is shown.

Returns
-------
list[dict]
    1️⃣ short text message
    2️⃣ UI‑resource dict with an ``uri`` and the raw HTML.
""",
)
def open_document(file_name: str, page: int = 0):
    """
    Render a document (PDF, Excel, PowerPoint, …) inside a full‑screen iframe.

    * `file_name` may contain non‑ASCII characters – we percent‑encode it
      so the generated URL is safe.
    * PDFs still use the dedicated viewer; every other format is streamed
      as a raw file.
    """
    _logger.info("open_document called – file_name=%s page=%d", file_name, page)

    # --------------------------------------------------------------
    # 1️⃣  Ensure we have a plain string (never bytes)
    # --------------------------------------------------------------
    if isinstance(file_name, (bytes, bytearray)):
        file_name = file_name.decode("utf-8", errors="replace")
        _logger.debug("decoded bytes file_name to str")

    # --------------------------------------------------------------
    # 2️⃣  Percent‑encode the name for the URL
    # --------------------------------------------------------------
    safe_name = quote(file_name)  # e.g. "ملف.xlsx" → "%D9%85%D9%84%D9%81.xlsx"
    _logger.debug("percent‑encoded filename: %s → %s", file_name, safe_name)

    # --------------------------------------------------------------
    # 3️⃣  Choose viewer based on extension
    # --------------------------------------------------------------
    ext = Path(file_name).suffix.lower()
    if ext == ".pdf":
        viewer_path = f"/pdf/index.html?file={safe_name}&page={page}"
    else:
        viewer_path = f"/file/view/{safe_name}"
    _logger.debug("viewer_path resolved to %s", viewer_path)

    html = f"""
<!DOCTYPE html>
<html lang="en">
  <body>
    <iframe src="http://{config.MCP_SERVER_HOST}:{config.MCP_SERVER_PORT}{viewer_path}"
            style="border:none;width:100%;height:1000px"></iframe>
  </body>
  {_resize_script()}
</html>
"""
    uri_hash = abs(hash(file_name)) % 100_000
    _logger.info("open_document prepared UI resource (uri hash %d)", uri_hash)

    return [
        {"type": "text", "text": f"{ext.upper()} Viewer opened for"},
        create_ui_resource(
            {
                "uri": f"ui://doc-viewer/{uri_hash}",
                "content": {"type": "rawHtml", "htmlString": html},
                "encoding": "text",
            }
        ),
    ]


# ─────────────────────────────────────────────────────────────────────────────
#   Helper functions
# ─────────────────────────────────────────────────────────────────────────────
def _validate_path_safety(file_path: Path, operation: str):
    """Ensure file path is within DOCS_ROOT. Returns error response if unsafe."""
    if not str(file_path.resolve()).startswith(str(DOCS_ROOT.resolve())):
        _logger.warning("%s – access denied (outside DOCS_ROOT): %s", operation, file_path)
        return JSONResponse({"error": "Access denied"}, status_code=403)
    return None


# ─────────────────────────────────────────────────────────────────────────────
#   PDF static serving
# ─────────────────────────────────────────────────────────────────────────────
async def serve_pdf(request):
    filename = request.path_params["filename"]
    pdf_path = DOCS_ROOT / filename

    if not pdf_path.is_file():
        _logger.warning("serve_pdf – file not found: %s", filename)
        return JSONResponse({"error": "PDF not found"}, status_code=404)

    # safety – make sure the resolved path stays under DOCS_ROOT
    if error := _validate_path_safety(pdf_path, "serve_pdf"):
        return error

    enc_name = quote(filename)
    _logger.info("serve_pdf – streaming %s", pdf_path)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{enc_name}"},
    )


# ─────────────────────────────────────────────────────────────────────────────
#   Generic file serving (Excel, PPTX, …)
# ─────────────────────────────────────────────────────────────────────────────
async def serve_file(request):
    """Stream a raw document (xlsx, xls, pptx, docx, txt, …)."""
    filename = request.path_params["filename"]
    file_path = DOCS_ROOT / filename

    if not file_path.is_file():
        _logger.warning("serve_file – not found: %s", filename)
        return JSONResponse({"error": "File not found"}, status_code=404)

    # safety – stay under DOCS_ROOT
    if error := _validate_path_safety(file_path, "serve_file"):
        return error

    # Guess a sensible MIME type (fallback to octet‑stream)
    mime = _MIME_TYPES.get(Path(filename).suffix.lower(), 'application/octet-stream')

    enc_name = quote(filename)
    _logger.info("serve_file – streaming %s as %s", file_path, mime)
    return FileResponse(
        file_path,
        media_type=mime,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{enc_name}"},
    )


# ─────────────────────────────────────────────────────────────────────────────
#   Application bootstrap
# ─────────────────────────────────────────────────────────────────────────────
def main():
    """Start the MCP server with HTTP transport."""
    global _mcp_app
    import uvicorn
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware
    from starlette.routing import Mount, Route
    from starlette.staticfiles import StaticFiles
    from starlette.applications import Starlette

    _logger.info("=" * 80)
    _logger.info("MCP HTTP Server Starting")
    _logger.info("=" * 80)
    log_system_info(_logger)

    try:
        _logger.info("Configuring server components...")

        # CORS (allow everything – the UI is served from the same host)
        _logger.debug("Setting up CORS middleware")
        cors = Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
        )

        # The MCP HTTP app (with our custom lifespan)
        _logger.info("Creating MCP HTTP application")
        _mcp_app = _mcp.http_app(middleware=[cors], transport="streamable-http")

        # Static files for the PDF viewer UI
        _logger.info(f"Setting up static files from: {PUBLIC_ROOT}")
        if not PUBLIC_ROOT.exists():
            _logger.warning(f"Static files directory does not exist: {PUBLIC_ROOT}")
        static = StaticFiles(directory=PUBLIC_ROOT, html=True)

        # Assemble the final Starlette app
        _logger.info("Assembling Starlette application with routes")
        app = Starlette(
            routes=[
                Route("/pdf/get/{filename:path}", endpoint=serve_pdf),
                Route("/file/view/{filename:path}", endpoint=serve_file),
                Mount("/pdf", app=static),
                Mount("/", app=_mcp_app),
            ],
            middleware=[cors],
            lifespan=_my_lifespan,
        )

        _logger.info("=" * 80)
        _logger.info(f"Starting server on 0.0.0.0:{config.MCP_SERVER_PORT}")
        _logger.info(f"Server name: {config.MCP_SERVER_NAME}")
        _logger.info("Available routes:")
        _logger.info("  - GET  /pdf/get/{filename}")
        _logger.info("  - GET  /file/view/{filename}")
        _logger.info("  - GET  /pdf/*")
        _logger.info("  - POST / (MCP endpoints)")
        _logger.info("=" * 80)

        # Start the server
        uvicorn.run(app, host="0.0.0.0", port=config.MCP_SERVER_PORT, log_level="info")

    except KeyboardInterrupt:
        _logger.info("=" * 80)
        _logger.info("Received keyboard interrupt (Ctrl+C)")
        _logger.info("MCP server stopped by user")
        _logger.info("=" * 80)

    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, "running MCP server")
        _logger.critical("=" * 80)
        _logger.critical("MCP server failed to start or stopped with error")
        _logger.critical("=" * 80)

    finally:
        _logger.info("Server shutdown complete")

def mcp_io():
    """Start the MCP server with STDIO transport."""
    _logger.info("=" * 80)
    _logger.info("MCP STDIO Server Starting")
    _logger.info("=" * 80)
    _logger.info(f"Server name: {config.MCP_SERVER_NAME}")
    _logger.info("Transport: STDIO")
    _logger.info("=" * 80)

    try:
        _mcp.run(transport="stdio", log_level="info")
    except KeyboardInterrupt:
        _logger.info("MCP STDIO server stopped by user")
    except Exception as exc:  # pragma: no cover
        log_exception(_logger, exc, "running MCP STDIO server")
        _logger.critical("MCP STDIO server failed")
    finally:
        _logger.info("MCP STDIO server shutdown complete")
