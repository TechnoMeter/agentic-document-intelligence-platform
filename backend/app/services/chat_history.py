import uuid
import logging
from app.database import get_db_connection

logger = logging.getLogger(__name__)
USE_POSTGRES = __import__('os').getenv("USE_POSTGRES", "false").lower() == "true"

def save_message(session_id: str, role: str, content: str, msg_id: str = None) -> None:
    """Insert a single chat message into the history table."""
    if not content:
        return
    msg_id = msg_id or str(uuid.uuid4())
    try:
        with get_db_connection() as conn:
            if USE_POSTGRES:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO chat_history (id, session_id, role, content) VALUES (%s, %s, %s, %s)",
                    (msg_id, session_id, role, content)
                )
            else:
                conn.execute(
                    "INSERT INTO chat_history (id, session_id, role, content) VALUES (?, ?, ?, ?)",
                    (msg_id, session_id, role, content)
                )
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to save chat message: {e}")

def get_chat_history(session_id: str):
    """Retrieve all messages for a session, oldest first."""
    with get_db_connection() as conn:
        if USE_POSTGRES:
            cur = conn.cursor()
            cur.execute(
                "SELECT role, content, created_at FROM chat_history WHERE session_id = %s ORDER BY created_at ASC",
                (session_id,)
            )
            rows = cur.fetchall()
        else:
            cur = conn.execute(
                "SELECT role, content, created_at FROM chat_history WHERE session_id = ? ORDER BY created_at ASC",
                (session_id,)
            )
            rows = cur.fetchall()
    return [{"role": r[0], "content": r[1], "timestamp": str(r[2])} for r in rows]

def cleanup_expired_chat_history(cutoff):
    """Delete chat messages older than cutoff."""
    with get_db_connection() as conn:
        if USE_POSTGRES:
            cur = conn.cursor()
            cur.execute("DELETE FROM chat_history WHERE created_at < %s", (cutoff,))
        else:
            conn.execute("DELETE FROM chat_history WHERE created_at < ?", (cutoff,))
        conn.commit()