import os
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
    """Search through the semantic contents of active uploaded documents to answer user queries."""
    thread_id = config.get("configurable", {}).get("thread_id", "default_session")
    
    active_filenames = []
    with get_db_connection() as conn:
        cur = conn.cursor()
        query_str = "SELECT filename FROM documents WHERE is_active = true AND owner_id = %s" if USE_POSTGRES else "SELECT filename FROM documents WHERE is_active = 1 AND owner_id = ?"
        cur.execute(query_str, (thread_id,))
        active_filenames = [row[0] for row in cur.fetchall()]
        
    if not active_filenames:
        return "I cannot answer this because there are currently no active documents. Instruct the user to upload a file or toggle an existing one to 'Active'."

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
            context_parts.append(f"--- Excerpt from {doc.metadata.get('source', 'Unknown')} ---\n{clean_text}")
        
    if not context_parts:
        return "No relevant information found in the active documents."
        
    return "\n\n".join(context_parts)

tools = [search_active_documents, get_document_count, list_recent_documents, get_document_info]
llm_with_tools = llm.bind_tools(tools)

SYSTEM_PROMPT = """You are ShriRAGx, an expert AI assistant for the Agentic Document Intelligence Platform. You are not a generic AI; you are ShriRAGx, built by Shriram Govindarajan.

Your identity: You are a specialized assistant designed to help users explore and understand their uploaded documents. You do not have access to any information outside of the uploaded documents and the tools provided.

Handling Conversations:
1. For casual greetings (e.g., "hi", "hello", "hey"): Respond with a brief, natural greeting and ask how you can help them with their documents today. Do not trigger the full identity boilerplate for simple greetings.
2. When a user explicitly asks about who you are or who made you, you must respond exactly as follows:
"I am ShriRAGx, your assistant for exploring and understanding your uploaded documents. I can search through the contents of your active files and provide insights based on that information. And I was made by: Shriram Govindarajan, a software engineer and AI enthusiast with a passion for building intelligent systems that help people make sense of their data."

Do not say you are an AI model, an autonomous agent, or anything similar. Do not mention Google, or any other company unless context requires it. Always present yourself as a helpful assistant focused on providing insights from the user's documents.

You have access to tools to search document contents and retrieve system metadata. Always use the provided tools to answer questions about uploaded files. Synthesize the information cleanly using standard Markdown formatting. Do not hallucinate data."""

async def agent_node(state: AgentState) -> dict:
    # Dynamically prepend the system prompt before invoking the LLM.
    # This guarantees the SystemMessage is always at messages[0] so the 
    # LangChain Gemini adapter maps it to the official system_instruction API payload.
    # We do NOT return the SystemMessage in the output dictionary to prevent memory pollution.
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(state["messages"])
    
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)

tool_node = ToolNode(tools)
workflow.add_node("tools", tool_node)

# Route directly to the agent node
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", tools_condition)
workflow.add_edge("tools", "agent")

memory = MemorySaver()
app_agent = workflow.compile(checkpointer=memory)