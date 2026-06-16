import os
from langchain.tools import tool
from app.database import get_db_connection

USE_POSTGRES = os.getenv("USE_POSTGRES", "false").lower() == "true"

@tool
def get_document_count() -> str:
    """Return the total number of active uploaded documents."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT COUNT(*) FROM documents WHERE is_active = true" if USE_POSTGRES else "SELECT COUNT(*) FROM documents WHERE is_active = 1"
        cur.execute(query)
        count = cur.fetchone()[0]
    return f"There are {count} active documents in the system."

@tool
def list_recent_documents(limit: int = 5) -> str:
    """Return a list of the most recently uploaded documents and their statuses."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT filename, upload_date, chunk_count, is_active FROM documents ORDER BY upload_date DESC LIMIT %s" if USE_POSTGRES else "SELECT filename, upload_date, chunk_count, is_active FROM documents ORDER BY upload_date DESC LIMIT ?"
        cur.execute(query, (limit,))
        rows = cur.fetchall()
    
    if not rows:
        return "No documents uploaded yet."
    
    result = "Recent documents:\n"
    for row in rows:
        status = "Active" if row[3] else "Inactive (Cannot search contents)"
        result += f"- {row[0]} (uploaded {row[1]}, {row[2]} chunks) - Status: {status}\n"
    return result

@tool
def get_document_info(filename: str) -> str:
    """Get details about a specific document by filename and whether it is active."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = %s" if USE_POSTGRES else "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = ?"
        cur.execute(query, (filename,))
        row = cur.fetchone()
    
    if row:
        status = "Active" if row[3] else "Inactive (Cannot search contents)"
        return f"Document '{row[0]}' uploaded on {row[1]}, {row[2]} chunks. Status: {status}."
    
    return f"No document named '{filename}' found."