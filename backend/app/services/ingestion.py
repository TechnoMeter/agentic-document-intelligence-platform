# ingestion.py (Optimized)
import logging
import uuid
import io
import os
import asyncio
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.vector_store import get_vector_store
from app.database import get_db_connection
import pypdf

logger = logging.getLogger(__name__)
USE_POSTGRES = os.getenv("USE_POSTGRES", "false").lower() == "true"

class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        self.vector_store = get_vector_store()

    # Isolate CPU-bound sync tasks
    def _extract_pdf_text(self, content: bytes) -> str:
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        return "".join(page.extract_text() + "\n" for page in pdf_reader.pages)
        
    def _split_and_embed(self, text_content: str, filename: str) -> int:
        chunks = self.splitter.split_text(text_content)
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]
        ids = [str(uuid.uuid4()) for _ in range(len(chunks))]
        # CPU-bound embedding generation happens here
        self.vector_store.add_texts(texts=chunks, metadatas=metadatas, ids=ids)
        return len(chunks)

    async def process_and_store(self, filename: str, content: bytes) -> None:
        logger.info(f"Starting async ingestion for {filename}")
        try:
            if filename.lower().endswith('.pdf'):
                # Offload to thread to prevent blocking the async event loop
                text_content = await asyncio.to_thread(self._extract_pdf_text, content)
            else:
                text_content = content.decode("utf-8")

            # Offload chunking and vector storage
            chunk_count = await asyncio.to_thread(self._split_and_embed, text_content, filename)

            # Insert metadata
            file_type = filename.split('.')[-1]
            await asyncio.to_thread(self._insert_metadata, filename, file_type, chunk_count)
            logger.info(f"Ingestion complete for {filename}.")

        except Exception as e:
            logger.error(f"Ingestion failed for {filename}: {str(e)}", exc_info=True)
            raise

    def _insert_metadata(self, filename: str, file_type: str, chunk_count: int):
        with get_db_connection() as conn:
            if USE_POSTGRES:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO documents (filename, file_type, chunk_count) VALUES (%s, %s, %s)",
                        (filename, file_type, chunk_count)
                    )
            else:
                conn.execute(
                    "INSERT INTO documents (filename, file_type, chunk_count) VALUES (?, ?, ?)",
                    (filename, file_type, chunk_count)
                )
            conn.commit()