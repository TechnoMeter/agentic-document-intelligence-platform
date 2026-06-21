import os
import asyncio
import logging
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END, add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from app.services.vector_store import get_vector_store
from app.database import get_db_connection, USE_POSTGRES
from app.tools.metadata_tools import get_document_count, list_recent_documents, get_document_info
from langchain_core.runnables import RunnableConfig
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

os.environ["GOOGLE_API_KEY"] = os.getenv("LLM_API_KEY", "")

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

llm = ChatGoogleGenerativeAI(
    model=os.getenv("LLM_MODEL", "gemini-3.1-flash-lite"),
    streaming=True,
    model_kwargs={
        "thinking_config": {"thinking_level": "HIGH"}
    }
)

@tool
async def search_active_documents(query: str, config: RunnableConfig) -> str:
    """Search through the semantic contents of active uploaded documents."""
    # Safe config extraction
    thread_id = config.get("configurable", {}).get("thread_id", "default_session") if config else "default_session"

    def get_active_filenames(owner_id):
        try:
            with get_db_connection() as conn:
                cur = conn.cursor()
                if USE_POSTGRES:
                    cur.execute(
                        "SELECT filename FROM documents WHERE is_active = true AND owner_id = %s",
                        (owner_id,)
                    )
                else:
                    cur.execute(
                        "SELECT filename FROM documents WHERE is_active = 1 AND owner_id = ?",
                        (owner_id,)
                    )
                return [row[0] for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"DB error in get_active_filenames: {e}")
            return []

    try:
        active_filenames = get_active_filenames(thread_id)

        # Retry logic: if count > 0 but filenames empty, wait and retry
        if not active_filenames:
            count = 0
            try:
                with get_db_connection() as conn:
                    cur = conn.cursor()
                    if USE_POSTGRES:
                        cur.execute(
                            "SELECT COUNT(*) FROM documents WHERE is_active = true AND owner_id = %s",
                            (thread_id,)
                        )
                    else:
                        cur.execute(
                            "SELECT COUNT(*) FROM documents WHERE is_active = 1 AND owner_id = ?",
                            (thread_id,)
                        )
                    count = cur.fetchone()[0]
            except Exception as e:
                logger.error(f"Count query error: {e}")

            if count > 0:
                logger.warning(
                    f"search_active_documents: count={count} but active_filenames empty. Retrying."
                )
                await asyncio.sleep(1.0)  # Increased from 0.2 to 1.0 for Azure
                active_filenames = get_active_filenames(thread_id)
                if active_filenames:
                    logger.info(f"Retry succeeded, found {len(active_filenames)} active filenames.")
                else:
                    logger.warning(f"Retry still empty, but count={count}.")

        if not active_filenames:
            return (
                "I cannot answer this because there are currently no active documents. "
                "Please upload a file or toggle an existing one to 'Active'."
            )

        # Check for processing and failed files
        processing_files = []
        failed_files = []
        try:
            with get_db_connection() as conn:
                cur = conn.cursor()
                placeholders = ','.join(['%s'] * len(active_filenames)) if USE_POSTGRES else ','.join(['?'] * len(active_filenames))
                query_str = f"SELECT filename, chunk_count FROM documents WHERE is_active = true AND owner_id = %s AND filename IN ({placeholders})"
                params = [thread_id] + active_filenames if USE_POSTGRES else [thread_id] + active_filenames
                cur.execute(query_str, params)
                rows = cur.fetchall()
                for filename, chunk_count in rows:
                    if chunk_count == 0:
                        processing_files.append(filename)
                    elif chunk_count < 0:
                        failed_files.append(filename)
        except Exception as e:
            logger.error(f"Processing check error: {e}")

        # Prioritise failed files (they cannot be fixed by waiting)
        if failed_files:
            file_list = ", ".join(failed_files)
            return (
                f"⚠️ **The following document(s) could not be processed:** {file_list}. "
                "They may be empty, contain only binary data, or use an unsupported format. "
                "Please try uploading a different file with extractable text."
            )

        if processing_files:
            file_list = ", ".join(processing_files)
            return (
                f"⏳ **Your document(s) are still being processed:** {file_list}. "
                "Embedding generation is running in the background. "
                "Please wait **5–10 seconds** and ask your question again. "
                "You can also check the Document Library for the final chunk count."
            )

        # Vector search
        vector_store = get_vector_store()
        retriever = vector_store.as_retriever(
            search_kwargs={
                "k": 4,
                "filter": {
                    "$and": [
                        {"source": {"$in": active_filenames}},
                        {"owner_id": thread_id}
                    ]
                }
            }
        )

        docs = await retriever.ainvoke(query)

        unique_content = set()
        context_parts = []
        for doc in docs:
            clean_text = doc.page_content.strip()
            if clean_text not in unique_content:
                unique_content.add(clean_text)
                context_parts.append(
                    f"--- Excerpt from {doc.metadata.get('source', 'Unknown')} ---\n{clean_text}"
                )

        if not context_parts:
            return "No relevant information found in the active documents."

        return "\n\n".join(context_parts)

    except Exception as e:
        logger.error(f"search_active_documents error: {e}", exc_info=True)
        return f"An error occurred while searching your documents. Please try again in a few moments."

tools = [search_active_documents, get_document_count, list_recent_documents, get_document_info]
llm_with_tools = llm.bind_tools(tools)

SYSTEM_PROMPT = """You are ShriRAGx, an expert AI assistant for the Agentic Document Intelligence Platform. You are not a generic AI; you are ShriRAGx, built by Shriram Govindarajan.

Your identity: You are a specialized assistant designed to help users explore and understand their uploaded documents. You do not have access to any information outside of the uploaded documents and the tools provided.

Handling Conversations:
1. For casual greetings (e.g., "hi", "hello", "hey"): Respond with a brief, natural greeting and ask how you can help them with their documents today. Do not trigger the full identity boilerplate for simple greetings.
2. When a user explicitly asks about who you are or who made you, you must respond exactly as follows:
"ShriRAGx is an AI assistant designed to help you search, understand, and gain insights from your documents. Simply upload your files and ask questions to uncover the information you need.

Built by Shriram Govindarajan, software engineer and AI enthusiast."


Do not say you are an AI model, an autonomous agent, or anything similar. Do not mention Google, or any other company unless context requires it. Always present yourself as a helpful assistant focused on providing insights from the user's documents.

You have access to tools to search document contents and retrieve system metadata. Always use the provided tools to answer questions about uploaded files. Synthesize the information cleanly using standard Markdown formatting. Do not hallucinate data."""

async def agent_node(state: AgentState) -> dict:
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(state["messages"])
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}

def clear_checkpoint(thread_id: str) -> None:
    """Delete all checkpoints for a given thread_id from the in-memory saver."""
    # MemorySaver stores checkpoints in a dict: {thread_id: {checkpoint_id: state}}
    # We remove the entire thread entry.
    if hasattr(memory, "storage") and thread_id in memory.storage:
        del memory.storage[thread_id]
        logger.info(f"Cleared checkpoint for thread {thread_id}")
    else:
        logger.warning(f"No checkpoint found for thread {thread_id}")

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
tool_node = ToolNode(tools)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", tools_condition)
workflow.add_edge("tools", "agent")

memory = MemorySaver()
app_agent = workflow.compile(checkpointer=memory)