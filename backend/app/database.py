import os
from contextlib import contextmanager

USE_POSTGRES = os.getenv("USE_POSTGRES", "false").lower() == "true"

if USE_POSTGRES:
    import psycopg2
    from psycopg2 import pool

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "rag_metadata")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

    connection_pool = psycopg2.pool.SimpleConnectionPool(
        1, 10,
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    @contextmanager
    def get_db_connection():
        conn = connection_pool.getconn()
        try:
            yield conn
        finally:
            connection_pool.putconn(conn)

    def init_db():
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS documents (
                        id SERIAL PRIMARY KEY,
                        filename TEXT NOT NULL,
                        file_type TEXT NOT NULL,
                        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        chunk_count INTEGER,
                        is_active BOOLEAN DEFAULT TRUE,
                        owner_id TEXT NOT NULL DEFAULT 'default_session'
                    )
                """)
                # Check if owner_id column exists, if not add it
                cur.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='documents' AND column_name='owner_id'
                """)
                if not cur.fetchone():
                    cur.execute("""
                        ALTER TABLE documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'default_session'
                    """)
                # Create index for performance
                cur.execute("CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id)")
            conn.commit()

else:
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "metadata.db")

    @contextmanager
    def get_db_connection():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def init_db():
        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    chunk_count INTEGER,
                    is_active BOOLEAN DEFAULT 1,
                    owner_id TEXT NOT NULL DEFAULT 'default_session'
                )
            """)
            # Try to add owner_id column if it doesn't exist
            try:
                conn.execute("ALTER TABLE documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'default_session'")
            except sqlite3.OperationalError:
                pass  # Column already exists
            conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id)")
            conn.commit()

# Initialize on import
init_db()