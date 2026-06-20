import os
from langchain.tools import tool
from langchain_core.runnables import RunnableConfig
from app.database import get_db_connection

USE_POSTGRES = os.getenv("USE_POSTGRES", "false").lower() == "true"

@tool
def get_document_count(config: RunnableConfig) -> str:
    """Return the total number of active uploaded documents for the current user."""
    thread_id = config.get("configurable", {}).get("thread_id", "default_session")
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT COUNT(*) FROM documents WHERE is_active = true AND owner_id = %s" if USE_POSTGRES else "SELECT COUNT(*) FROM documents WHERE is_active = 1 AND owner_id = ?"
        cur.execute(query, (thread_id,))
        count = cur.fetchone()[0]
    return f"There are {count} active documents in your system."

@tool
def list_recent_documents(limit: int = 5, config: RunnableConfig = None) -> str:
    """Return a list of the most recently uploaded documents and their statuses for the current user."""
    thread_id = config.get("configurable", {}).get("thread_id", "default_session") if config else "default_session"
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE owner_id = %s ORDER BY upload_date DESC LIMIT %s" if USE_POSTGRES else "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE owner_id = ? ORDER BY upload_date DESC LIMIT ?"
        cur.execute(query, (thread_id, limit))
        rows = cur.fetchall()
    
    if not rows:
        return "No documents uploaded yet."
    
    result = "Recent documents:\n"
    for row in rows:
        status = "Active" if row[3] else "Inactive (Cannot search contents)"
        result += f"- {row[0]} (uploaded {row[1]}, {row[2]} chunks) - Status: {status}\n"
    return result

@tool
def get_document_info(filename: str, config: RunnableConfig) -> str:
    """Get details about a specific document by filename and whether it is active, for the current user."""
    thread_id = config.get("configurable", {}).get("thread_id", "default_session")
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = %s AND owner_id = %s" if USE_POSTGRES else "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = ? AND owner_id = ?"
        cur.execute(query, (filename, thread_id))
        row = cur.fetchone()
    
    if row:
        status = "Active" if row[3] else "Inactive (Cannot search contents)"
        return f"Document '{row[0]}' uploaded on {row[1]}, {row[2]} chunks. Status: {status}."
    
    return f"No document named '{filename}' found."