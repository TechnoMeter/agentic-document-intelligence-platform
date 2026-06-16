
import os
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END, add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from app.services.vector_store import get_vector_store
from app.database import get_db_connection, USE_POSTGRES
from app.tools.metadata_tools import get_document_count, list_recent_documents, get_document_info
from dotenv import load_dotenv

load_dotenv()

# Map the generic LLM_API_KEY to the Google-specific environment variable
os.environ["GOOGLE_API_KEY"] = os.getenv("LLM_API_KEY", "")

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

# Use native Gemini client to support thought_signatures required by 3.x models
llm = ChatGoogleGenerativeAI(
    model=os.getenv("LLM_MODEL", "gemini-3.1-flash-lite"),
    streaming=True
)

@tool
async def search_active_documents(query: str) -> str:
    """Search through the semantic contents of active uploaded documents to answer user queries."""
    
    active_filenames = []
    with get_db_connection() as conn:
        cur = conn.cursor()
        query_str = "SELECT filename FROM documents WHERE is_active = true" if USE_POSTGRES else "SELECT filename FROM documents WHERE is_active = 1"
        cur.execute(query_str)
        active_filenames = [row[0] for row in cur.fetchall()]
        
    if not active_filenames:
        return "I cannot answer this because there are currently no active documents. Instruct the user to upload a file or toggle an existing one to 'Active'."

    vector_store = get_vector_store()
    retriever = vector_store.as_retriever(
        search_kwargs={
            "k": 4,
            "filter": {"source": {"$in": active_filenames}}
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

SYSTEM_PROMPT = """You are an expert AI assistant for an Agentic Document Intelligence Platform. 
You have access to tools to search document contents and retrieve system metadata. 
Always use the provided tools to answer questions about uploaded files. 
Synthesize the information cleanly using standard Markdown formatting. Do not hallucinate data."""

async def agent_node(state: AgentState) -> dict:
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)

tool_node = ToolNode(tools)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", tools_condition)
workflow.add_edge("tools", "agent")

app_agent = workflow.compile()