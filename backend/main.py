import logging
import asyncio
import sys
import json
import os
import uuid
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Query, Form
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.services.ingestion import DocumentProcessor
from app.agent.graph import app_agent
from app.database import get_db_connection, USE_POSTGRES
from app.services.vector_store import get_vector_store
from app.services.chat_history import save_message, get_chat_history, cleanup_expired_chat_history

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ---- Lifespan for scheduler ----
scheduler = AsyncIOScheduler()

async def cleanup_expired_documents():
    """Delete documents older than 24 hours and their vectors."""
    cutoff = datetime.datetime.now() - datetime.timedelta(hours=24)
    logger.info(f"Running cleanup for documents older than {cutoff}")
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute(
                    "SELECT id, filename, owner_id FROM documents WHERE upload_date < %s",
                    (cutoff,)
                )
            else:
                cur.execute(
                    "SELECT id, filename, owner_id FROM documents WHERE upload_date < ?",
                    (cutoff,)
                )
            expired = cur.fetchall()
            if not expired:
                logger.info("No expired documents found.")
                return

            vector_store = get_vector_store()
            for doc_id, filename, owner_id in expired:
                try:
                    vector_store._collection.delete(
                        where={"$and": [{"source": filename}, {"owner_id": owner_id}]}
                    )
                except Exception as e:
                    logger.error(f"Failed to delete vectors for {filename} (owner {owner_id}): {e}")
                if USE_POSTGRES:
                    cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
                else:
                    cur.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()
            logger.info(f"Deleted {len(expired)} expired documents and their vectors.")
    except Exception as e:
        logger.error(f"Cleanup error: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(cleanup_expired_documents, trigger=IntervalTrigger(hours=1))
    # Add chat history cleanup as well (same schedule)
    scheduler.add_job(
        lambda: cleanup_expired_chat_history(datetime.datetime.now() - datetime.timedelta(hours=24)),
        trigger=IntervalTrigger(hours=1)
    )
    scheduler.start()
    logger.info("Scheduler started for hourly cleanup (documents & chat history).")
    yield
    scheduler.shutdown()
    logger.info("Scheduler shut down.")

app = FastAPI(title="Agentic RAG Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = DocumentProcessor()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

# ----- SSE Streaming Generator with History Saving -----
async def stream_agent_response(message: str, session_id: str):
    # Save user message immediately (with a unique id to avoid duplicates on retry)
    user_msg_id = str(uuid.uuid4())
    save_message(session_id, "user", message, user_msg_id)

    initial_state = {"messages": [HumanMessage(content=message)]}
    config = {"configurable": {"thread_id": session_id}}
    
    full_response = ""
    try:
        has_streamed = False

        async for event in app_agent.astream_events(initial_state, config=config, version="v2"):
            kind = event["event"]
            
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    content_data = chunk.content
                    token_text = ""
                    
                    if isinstance(content_data, list):
                        for block in content_data:
                            if isinstance(block, str):
                                token_text += block
                            elif isinstance(block, dict) and "text" in block:
                                token_text += block["text"]
                    else:
                        token_text = str(content_data)

                    if token_text:
                        full_response += token_text
                        has_streamed = True
                        yield f"data: {json.dumps({'token': token_text})}\n\n"
            
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown_tool")
                yield f"data: {json.dumps({'thought': f'Agent reasoning: Invoking {tool_name} tool...'})}\n\n"
                
            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown_tool")
                yield f"data: {json.dumps({'thought': f'Tool {tool_name} execution complete. Synthesizing data...'})}\n\n"

        # Save assistant response after streaming finished
        if full_response:
            assistant_msg_id = str(uuid.uuid4())
            save_message(session_id, "assistant", full_response, assistant_msg_id)

        yield f"data: {json.dumps({'done': True})}\n\n"
        
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}", exc_info=True)
        # Still save whatever we got so far
        if full_response:
            save_message(session_id, "assistant", full_response + f"\n[Error: {str(e)}]")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

# ----- Core Endpoints -----
@app.get("/ping")
async def ping():
    return {"status": "ok"}

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    logger.info(f"Received chat: {request.message[:50]}... Thread: {request.session_id}")
    try:
        initial_state = {"messages": [HumanMessage(content=request.message)]}
        config = {"configurable": {"thread_id": request.session_id}}
        
        final_state = await app_agent.ainvoke(initial_state, config=config)
        agent_response = final_state["messages"][-1].content
        
        # Save chat (catch errors but don't fail)
        try:
            save_message(request.session_id, "user", request.message)
            save_message(request.session_id, "assistant", agent_response)
        except Exception as e:
            logger.error(f"Failed to save chat history: {e}", exc_info=True)
        
        return {"reply": agent_response}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        # Return detailed error (for debugging; you may want to hide in production)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    async def safe_stream():
        try:
            async for chunk in stream_agent_response(request.message, request.session_id):
                yield chunk
        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        safe_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

# ---- New endpoint: get chat history ----
@app.get("/api/v1/chat/history")
async def get_history(session_id: str = Query(...)):
    try:
        history = get_chat_history(session_id)
        return {"history": history}
    except Exception as e:
        logger.error(f"History fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history.")

# ... (all other endpoints unchanged: upload, documents, chunks, toggle, delete, tools, static serving)
# The rest of main.py stays exactly as it is.
# I include it here for completeness, but you can keep your existing code for these.

@app.post("/api/v1/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    allowed_extensions = ('.txt', '.pdf', '.md', '.docx', '.xlsx', '.pptx', '.csv', '.json', '.html', '.xml', '.epub', '.odt', '.rtf')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file format.")
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File read error: {str(e)}")

    background_tasks.add_task(processor.process_and_store, file.filename, content, session_id)
    return JSONResponse(status_code=202, content={"message": "Accepted", "filename": file.filename})

@app.get("/api/v1/documents")
async def get_all_documents(session_id: str = Query(...)):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute(
                    "SELECT id, filename, file_type, upload_date, chunk_count, is_active FROM documents WHERE owner_id = %s ORDER BY upload_date DESC",
                    (session_id,)
                )
            else:
                cur.execute(
                    "SELECT id, filename, file_type, upload_date, chunk_count, is_active FROM documents WHERE owner_id = ? ORDER BY upload_date DESC",
                    (session_id,)
                )
            rows = cur.fetchall()
            
            docs = [{
                "id": r[0], "filename": r[1], "file_type": r[2], 
                "upload_date": str(r[3]), "chunk_count": r[4], "is_active": bool(r[5])
            } for r in rows]
        return {"documents": docs}
    except Exception as e:
        logger.error(f"DB Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database query failed.")

@app.get("/api/v1/documents/{filename}/chunks")
async def get_document_chunks(filename: str, session_id: str = Query(...)):
    try:
        vector_store = get_vector_store()
        results = vector_store.similarity_search(
            "", k=3, filter={"$and": [{"source": filename}, {"owner_id": session_id}]}
        )
        chunks = [doc.page_content for doc in results]
        return {"chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/documents/{doc_id}/toggle")
async def toggle_document(doc_id: int, session_id: str = Query(...), is_active: bool = Query(...)):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute("SELECT id FROM documents WHERE id = %s AND owner_id = %s", (doc_id, session_id))
            else:
                cur.execute("SELECT id FROM documents WHERE id = ? AND owner_id = ?", (doc_id, session_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Document not found for this session.")
            
            if USE_POSTGRES:
                cur.execute("UPDATE documents SET is_active = %s WHERE id = %s", (is_active, doc_id))
            else:
                cur.execute("UPDATE documents SET is_active = ? WHERE id = ?", (is_active, doc_id))
            conn.commit()
        return {"status": "success", "is_active": is_active}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/documents/{doc_id}")
async def delete_document(doc_id: int, session_id: str = Query(...)):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute("SELECT filename, owner_id FROM documents WHERE id = %s", (doc_id,))
            else:
                cur.execute("SELECT filename, owner_id FROM documents WHERE id = ?", (doc_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Document not found.")
            filename, owner_id = row
            if owner_id != session_id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this document.")
        
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
            else:
                cur.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()
        
        vector_store = get_vector_store()
        vector_store._collection.delete(
            where={"$and": [{"source": filename}, {"owner_id": owner_id}]}
        )
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/tools/document_count")
async def tool_document_count(session_id: str = Query(...)):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute("SELECT COUNT(*) FROM documents WHERE is_active = true AND owner_id = %s", (session_id,))
            else:
                cur.execute("SELECT COUNT(*) FROM documents WHERE is_active = 1 AND owner_id = ?", (session_id,))
            count = cur.fetchone()[0]
        return {"result": f"There are {count} active documents in your system."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/tools/recent_documents")
async def tool_recent_documents(session_id: str = Query(...), limit: int = 5):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute(
                    "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE owner_id = %s ORDER BY upload_date DESC LIMIT %s",
                    (session_id, limit)
                )
            else:
                cur.execute(
                    "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE owner_id = ? ORDER BY upload_date DESC LIMIT ?",
                    (session_id, limit)
                )
            rows = cur.fetchall()
            
        if not rows:
            return {"result": "No documents uploaded yet."}
        
        result = "Recent documents:\n"
        for row in rows:
            status = "Active" if row[3] else "Inactive (Cannot search contents)"
            result += f"- {row[0]} (uploaded {row[1]}, {row[2]} chunks) - Status: {status}\n"
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/tools/document_info")
async def tool_document_info(filename: str, session_id: str = Query(...)):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            if USE_POSTGRES:
                cur.execute(
                    "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = %s AND owner_id = %s",
                    (filename, session_id)
                )
            else:
                cur.execute(
                    "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = ? AND owner_id = ?",
                    (filename, session_id)
                )
            row = cur.fetchone()
            
        if row:
            status = "Active" if row[3] else "Inactive (Cannot search contents)"
            return {"result": f"Document '{row[0]}' uploaded on {row[1]}, {row[2]} chunks. Status: {status}."}
        return {"result": f"No document named '{filename}' found."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if os.path.exists(f"dist/{full_path}") and full_path != "":
        return FileResponse(f"dist/{full_path}")
    return FileResponse("dist/index.html")

@app.delete("/api/v1/chat/history")
async def clear_chat_history(session_id: str = Query(...)):
    """Delete all chat messages for the given session."""
    try:
        with get_db_connection() as conn:
            if USE_POSTGRES:
                cur = conn.cursor()
                cur.execute("DELETE FROM chat_history WHERE session_id = %s", (session_id,))
            else:
                conn.execute("DELETE FROM chat_history WHERE session_id = ?", (session_id,))
            conn.commit()
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Failed to clear chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat history.")