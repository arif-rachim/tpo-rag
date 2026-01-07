import os
from pathlib import Path

from dotenv import load_dotenv
from pymupdf.mupdf import PATH_MAX

load_dotenv()

MCP_SERVER_HOST = os.getenv("MCP_SERVER_HOST")  # The MCP Server address
MCP_SERVER_PORT = int(os.getenv("MCP_SERVER_PORT") or "3222") # The MCP Server port
MCP_SERVER_NAME = os.getenv("MCP_SERVER_NAME")  # The server name in FastMCP
VECTOR_DB_COLLECTION_NAME = os.getenv("VECTOR_DB_COLLECTION_NAME")  # The collection name that will be used when storing in ChromaDB

# Authentication configuration (stdlib-only, no JWT/bcrypt)
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD_HASH = os.getenv(
    "DEFAULT_ADMIN_PASSWORD_HASH",
    "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"  # sha256("admin")
)
SESSION_TIMEOUT_HOURS = int(os.getenv("SESSION_TIMEOUT_HOURS", "8"))

# File upload configuration
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
ALLOWED_FILE_TYPES = os.getenv("ALLOWED_FILE_TYPES", ".pdf,.docx,.pptx,.xlsx,.xls").split(",")

# CORS configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

PORTAL_URL = os.getenv("PORTAL_URL")  # The address of portal server
PORTAL_LDAP_USER = os.getenv("PORTAL_LDAP_USER")  # The user name of jac portal
PORTAL_LDAP_PASSWORD = os.getenv("PORTAL_LDAP_PASSWORD")  # The password for the JAC PORTAL
PORTAL_LDAP_DOMAIN = os.getenv("PORTAL_LDAP_DOMAIN")  # The domain for the LDAP
PORTAL_LIBRARY_NAME = os.getenv("PORTAL_LIBRARY_NAME")  # ExtranetSafetyFileLibrary

_BASE_PATH = Path(__file__).parent.parent

def _resolve_path(env_var: str, default_path: Path) -> Path:
    """Resolve path from env var, converting relative paths to absolute."""
    path_str = os.getenv(env_var)
    if path_str:
        path = Path(path_str)
        return path if path.is_absolute() else (_BASE_PATH / path).resolve()
    return default_path

PATH_DOCUMENTS = _resolve_path("PATH_DOCUMENTS", _BASE_PATH / "docs")
PATH_MODEL_EMBEDDER = _resolve_path("PATH_MODEL_EMBEDDER", _BASE_PATH / "models" / "multilingual-e5-large")
PATH_MODEL_RERANKER = _resolve_path("PATH_MODEL_RERANKER", _BASE_PATH / "models" / "bge-reranker-v2-m3")
PATH_MODEL_NER = _resolve_path("PATH_MODEL_NER", _BASE_PATH / "models" / "bert-base-multilingual-cased-ner-hrl")
PATH_VECTOR_DB_STORAGE = _resolve_path("PATH_VECTOR_DB_STORAGE", _BASE_PATH / "chroma_store")
PATH_BM25_INDEX_FILE = _resolve_path("PATH_BM25_INDEX_FILE", _BASE_PATH / "chroma_store" / "bm25_index.pkl")

folders_to_ensure = [
    PATH_DOCUMENTS,
    PATH_MODEL_EMBEDDER,
    PATH_MODEL_RERANKER,
    PATH_MODEL_NER,
    PATH_VECTOR_DB_STORAGE,
]

def _ensure_dir(path: Path) -> None:
    if path.is_file():
        raise NotADirectoryError(f"{path!s} exists and is a file, not a directory.")
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {path}")

for folder in folders_to_ensure:
    _ensure_dir(Path(folder))

def configure_offline_mode():
    """Configure HuggingFace and related libraries for offline operation."""
    os.environ.update({
        "HF_DATASETS_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_HUB_OFFLINE": "1",
        "HF_HUB_DISABLE_TELEMETRY": "1",
        "PYTHONWARNINGS": "ignore",
        "POSTHOG_DISABLED": "1",
    })

def _load_instruction_file(env_var_name: str, default_filename: str = None) -> str:
    """
    Load instruction text from external file.

    Args:
        env_var_name: Environment variable name containing file path
        default_filename: Default file to use if env var not set

    Returns:
        Instruction text content
    """
    file_path = os.getenv(env_var_name)

    # If no env var, use default
    if not file_path and default_filename:
        file_path = Path(__file__).parent.parent / default_filename
    elif not file_path:
        return ""

    # Convert to Path and resolve
    file_path = Path(file_path)
    if not file_path.is_absolute():
        file_path = Path(__file__).parent.parent / file_path

    # Read file content
    try:
        if file_path.exists():
            return file_path.read_text(encoding='utf-8').strip()
        else:
            print(f"Warning: Instruction file not found: {file_path}")
            return ""
    except Exception as e:
        print(f"Error loading instruction file {file_path}: {e}")
        return ""

# Load instruction texts from external files (with fallback to env vars)
MCP_SERVER_INSTRUCTION = _load_instruction_file(
    "MCP_SERVER_INSTRUCTION_FILE",
    "config/instructions/mcp_server_instruction.txt"
) or os.getenv("MCP_SERVER_INSTRUCTION", "")

SEARCH_DOCUMENT_TOOL_DESCRIPTION = _load_instruction_file(
    "SEARCH_DOCUMENT_TOOL_DESCRIPTION_FILE",
    "config/instructions/search_document_tool_description.txt"
) or os.getenv("SEARCH_DOCUMENT_TOOL_DESCRIPTION", "")

LIST_DOCUMENTS_TOOL_DESCRIPTION = _load_instruction_file(
    "LIST_DOCUMENTS_TOOL_DESCRIPTION_FILE",
    "config/instructions/list_documents_instruction.txt"
) or os.getenv("LIST_DOCUMENTS_TOOL_DESCRIPTION", "")