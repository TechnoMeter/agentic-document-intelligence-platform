import logging
import asyncio
import sys
import json
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from app.services.ingestion import DocumentProcessor
from app.agent.graph import app_agent
from app.database import get_db_connection, USE_POSTGRES
from app.services.vector_store import get_vector_store

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agentic RAG Gateway")

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

# ----- SSE Streaming Generator -----
async def stream_agent_response(message: str):
    initial_state = {"messages": [HumanMessage(content=message)]}
    try:
        final_content = ""
        has_streamed = False

        # Stream all events from the LangGraph execution
        async for event in app_agent.astream_events(initial_state, version="v2"):
            kind = event["event"]
            
            # 1. Surface Token Generation
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    # Normalize LangChain 1.x / Gemini 3.x content blocks to a string
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
                        has_streamed = True
                        yield f"data: {json.dumps({'token': token_text})}\n\n"
            
            # 2. Surface AI "Thoughts" (Tool Execution Tracking)
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown_tool")
                yield f"data: {json.dumps({'thought': f'Agent reasoning: Invoking {tool_name} tool...'})}\n\n"
                
            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown_tool")
                yield f"data: {json.dumps({'thought': f'Tool {tool_name} execution complete. Synthesizing data...'})}\n\n"

        # Fallback if non-streaming response occurred
        if not has_streamed and final_content:
            yield f"data: {json.dumps({'token': final_content})}\n\n"
            
        yield f"data: {json.dumps({'done': True})}\n\n"
        
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}", exc_info=True)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

# ----- Core Endpoints -----
@app.get("/ping")
async def ping():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"status": "Agentic RAG API is running"}

@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest):
    logger.info(f"Received chat: {request.message[:50]}...")
    try:
        initial_state = {"messages": [HumanMessage(content=request.message)]}
        final_state = await app_agent.ainvoke(initial_state)
        # LangGraph appends to the messages list; the final response is the last item
        agent_response = final_state["messages"][-1].content
        return {"reply": agent_response}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process agent request.")

@app.post("/api/v1/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_agent_response(request.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@app.post("/api/v1/upload")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    allowed_extensions = ('.txt', '.pdf', '.md')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file format.")
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File read error: {str(e)}")

    background_tasks.add_task(processor.process_and_store, file.filename, content)
    return JSONResponse(status_code=202, content={"message": "Accepted", "filename": file.filename})

# ----- Document Library CRUD Endpoints -----

@app.get("/api/v1/documents")
async def get_all_documents():
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, filename, file_type, upload_date, chunk_count, is_active FROM documents ORDER BY upload_date DESC")
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
async def get_document_chunks(filename: str):
    try:
        vector_store = get_vector_store()
        results = vector_store._collection.get(where={"source": filename}, limit=3)
        return {"chunks": results.get("documents", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/documents/{doc_id}/toggle")
async def toggle_document(doc_id: int, request: dict):
    # Support both snake_case and camelCase to prevent silent failure if frontend uses camelCase
    is_active = request.get("is_active")
    if is_active is None:
        is_active = request.get("isActive", True)

    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            query = "UPDATE documents SET is_active = %s WHERE id = %s" if USE_POSTGRES else "UPDATE documents SET is_active = ? WHERE id = ?"
            cur.execute(query, (is_active, doc_id))
            conn.commit()
        return {"status": "success", "is_active": is_active}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/documents/{doc_id}")
async def delete_document(doc_id: int, filename: str):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            query = "DELETE FROM documents WHERE id = %s" if USE_POSTGRES else "DELETE FROM documents WHERE id = ?"
            cur.execute(query, (doc_id,))
            conn.commit()
            
        vector_store = get_vector_store()
        vector_store._collection.delete(where={"source": filename})
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Tool Endpoints -----
# Kept for backward compatibility if the React UI calls them directly, 
# but the Agent now accesses these internally via LangChain tools.
@app.get("/api/v1/tools/document_count")
async def tool_document_count():
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            query = "SELECT COUNT(*) FROM documents WHERE is_active = true" if USE_POSTGRES else "SELECT COUNT(*) FROM documents WHERE is_active = 1"
            cur.execute(query)
            count = cur.fetchone()[0]
        return {"result": f"There are {count} active documents in the system."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/tools/recent_documents")
async def tool_recent_documents(limit: int = 5):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            query = "SELECT filename, upload_date, chunk_count, is_active FROM documents ORDER BY upload_date DESC LIMIT "
            query += "%s" if USE_POSTGRES else "?"
            cur.execute(query, (limit,))
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
async def tool_document_info(filename: str):
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            query = "SELECT filename, upload_date, chunk_count, is_active FROM documents WHERE filename = "
            query += "%s" if USE_POSTGRES else "?"
            cur.execute(query, (filename,))
            row = cur.fetchone()
            
        if row:
            status = "Active" if row[3] else "Inactive (Cannot search contents)"
            return {"result": f"Document '{row[0]}' uploaded on {row[1]}, {row[2]} chunks. Status: {status}."}
        return {"result": f"No document named '{filename}' found."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))