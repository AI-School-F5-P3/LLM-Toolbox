import os
import arxiv
from pathlib import Path
from PyPDF2 import PdfReader
import shutil

from llama_index.core import Document, StorageContext, load_index_from_storage
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.core.indices.vector_store.base import VectorStoreIndex

# Constants 
OPENAI_MODEL = "gpt-4o-mini"
BASE_DIR = Path("data")
DOWNLOAD_DIR = BASE_DIR / "papers"
STORAGE_DIR = BASE_DIR / "storage"
CHUNK_SIZE = 3072
CHUNK_OVERLAP = 64


# Helper functions
def init_directories():
    """Create necessary directories if they don't exist"""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text content from PDF file"""
    try:
        reader = PdfReader(str(pdf_path))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {str(e)}")
        return ""

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to remove invalid characters and ensure proper path handling"""
    # Replace slashes and backslashes with underscores
    filename = filename.replace('/', '_').replace('\\', '_')
    # Remove other invalid characters
    invalid_chars = '<>:"|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename
