<div align="center">
  <!-- Status & License Badges -->
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License">
  
  <br><br>

  <!-- Technology Badges -->
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/LangGraph-Agentic-9b59b6.svg?style=flat-square" alt="LangGraph">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  
  <br><br>
  
  <h1>🧠 Agentic Document Intelligence Platform</h1>
  <p><strong>A production-grade, asynchronous RAG architecture powered by LangGraph, Local Edge Embeddings, and the Model Context Protocol (MCP).</strong></p>
</div>

<br />

<!-- 📸 SCREENSHOT PLACEHOLDER: MAIN DASHBOARD -->
<div align="center">
  <img src="https://via.placeholder.com/1200x600?text=Main+Platform+Dashboard+-+Replace+with+Chat+UI+Screenshot" alt="Main Platform Dashboard">
  <br>
  <em>Figure 1: The main React workspace. Features a real-time Markdown chat interface (center) and the live Agent Orchestration telemetry feed (right).</em>
</div>

<br>

---

## 📖 The "What" and "Why" (ELI5)

### What is this?
Imagine a traditional AI chatbot as a student who has to read an entire library of books every time you ask a single question. It is slow, expensive, and prone to mixing up facts.

This project is an **Agentic RAG (Retrieval-Augmented Generation) Platform**. Instead of a student, imagine a highly trained **Librarian (The Agent)**. When you ask a question, the Librarian pauses and thinks:
1. *"Are they asking for a count of our books?"* -> (Checks the database index card).
2. *"Are they asking about a specific topic?"* -> (Goes straight to the exact paragraph in the vector database).
3. *"Are they just saying hello?"* -> (Answers directly without searching anything).

### Why did I build it this way?
Standard RAG applications simply stuff text into an LLM and hope for the best. This architecture solves three massive enterprise problems:
1. **Cost & Latency:** By generating text embeddings *locally* (using HuggingFace CPU models) instead of sending them to OpenAI/Cloud, we save money and remove network bottlenecks during file ingestion.
2. **Hallucinations:** LLMs are terrible at math and counting. By decoupling strictly structured data (PostgreSQL) from semantic data (ChromaDB), we guarantee 100% accuracy when asking metadata questions like *"How many files are uploaded?"*
3. **UX Freezing:** Large AI queries take time. We utilize **Server-Sent Events (SSE)** to stream the AI's response token-by-token back to the UI in real-time, completely eliminating loading screens.

---

## 🏗️ System Architecture

The application strictly separates the **Write Path** (heavy, asynchronous background ingestion) from the **Read Path** (autonomous LLM reasoning and execution).

```mermaid
graph TD
    %% Define Node Styles
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:#000;
    classDef backend fill:#389b82,stroke:#333,stroke-width:2px,color:#fff;
    classDef db fill:#f2a900,stroke:#333,stroke-width:2px,color:#000;
    classDef external fill:#ff9900,stroke:#333,stroke-width:2px,color:#000;
    classDef agent fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff;

    %% Nodes
    Client["React Frontend<br/>(Chat UI & Dashboard)"]:::frontend
    API["FastAPI Gateway<br/>(Async HTTP + SSE Stream)"]:::backend
    Worker["Ingestion Pipeline<br/>(Local HF Embeddings)"]:::backend
    LangGraph["LangGraph State Machine<br/>(Agent Orchestrator)"]:::agent
    MCPServer["MCP Server<br/>(Tool Provider)"]:::backend
    
    VectorDB[("ChromaDB<br/>(Semantic Vectors)")]:::db
    SQL[("PostgreSQL<br/>(Relational Metadata)")]:::db
    LLM["LLM Provider API<br/>(Google Gemini)"]:::external

    %% Edges - Ingestion Flow
    Client -- "1. Upload File (Multipart)" --> API
    API -- "2. Background Task Trigger" --> Worker
    Worker -- "3. Save ACID Metadata" ---> SQL
    Worker -- "4. Store Chunk Embeddings" ---> VectorDB

    %% Edges - Query Flow
    Client -- "A. Ask Question" --> API
    API -- "B. Invoke State Machine" --> LangGraph
    LangGraph <-->|C. Reasoning Loop| LLM
    
    %% Agent Tool Calls
    LangGraph <-->|D. RAG Similarity Search| VectorDB
    LangGraph <-->|E. Protocol Query| MCPServer
    MCPServer <-->|F. Secure DB Read/Write| SQL
    
    %% Streaming Response
    LangGraph -. "G. Yield LangChain Tokens" .-> API
    API -. "H. Server-Sent Events (SSE)" .-> Client
```

<!-- 📸 SCREENSHOT PLACEHOLDER: ARCHITECTURE DIAGRAM -->
<div align="center">
  <img src="https://via.placeholder.com/800x400?text=Architecture+Diagram+-+Replace+with+docs/image.png" alt="Architecture Diagram">
  <br>
  <em>Figure 2: The pipeline visualization detailing the separation of concerns between the relational metadata layer and the vector storage layer.</em>
</div>

---

## ✨ Core Engineering Features

### 1. True Agentic Orchestration (ReAct)
Unlike traditional endpoints that force queries linearly into a Vector DB, the LangGraph orchestrator dynamically invokes tools. Using native `langchain-google-genai` integration, the Agent securely passes `thought_signatures` and natively decides whether to run a semantic search, run an SQL query, or respond conversationally.

### 2. Dual-Layer Storage (ChromaDB + PostgreSQL)
Documents are not just vectorized; their lifecycle is actively managed.
* **ChromaDB:** Stores the dense vector representations of `RecursiveCharacterTextSplitter` chunks for cosine-similarity semantic searches.
* **PostgreSQL:** Tracks file state, upload timestamps, and a boolean `is_active` toggle. This allows users to "soft delete" documents from the AI's context window dynamically via the UI without destroying the underlying embeddings.

### 3. Decoupled Tool Endpoints & Reliability
A common failure pattern in AI engineering is coupling REST APIs to generic wrapper libraries, causing parameter ingestion crashes (like missing model-specific tokens). Our system isolates external APIs, utilizing native SDKs specifically tailored to Gemini 3.x payload requirements, preventing 400 Bad Request errors during tool loops.

<!-- 📸 SCREENSHOT PLACEHOLDER: DOCUMENT LIBRARY -->
<div align="center">
  <img src="https://via.placeholder.com/1000x500?text=Document+Library+Interface+-+Replace+with+Screenshot" alt="Document Library Interface">
  <br>
  <em>Figure 3: The Document Library. Demonstrates full CRUD capabilities, context toggling (soft-deletes), and real-time ChromeDB chunk introspection.</em>
</div>

---

## 📂 Repository Structure

The monorepo is strictly divided into frontend and backend workspaces to support independent horizontal scaling and deployment.

### Backend Pipeline (Python / FastAPI)
```text
backend/
├── app/
│   ├── agent/
│   │   ├── __init__.py
│   │   └── graph.py             # LangGraph ReAct node & routing logic
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ingestion.py         # Thread-isolated async text extraction & chunking
│   │   └── vector_store.py      # ChromaDB interface
│   ├── tools/
│   │   ├── __init__.py
│   │   └── metadata_tools.py    # SQL/LangChain Tool wrappers
│   ├── __init__.py
│   └── database.py              # Connection pooling & schemas (SQLite/Postgres)
├── tests/
│   ├── __init__.py
│   ├── run_tests.py             # Global test orchestrator & port validation
│   ├── test_ingestion.py        # Chunking & async error unit tests
│   └── test_integration.py      # SSE and End-to-End API tests
├── docs/
│   ├── architecture.md          # Internal system design docs
│   └── image.png                # Architecture visual asset
├── .env                         # Environment variables mapping
├── docker-compose.yml           # Multi-container orchestration (DB + API)
├── dockerfile                   # Backend image blueprint
├── main.py                      # FastAPI ASGI entrypoint
└── requirements.txt             # Pip dependencies
```

### Frontend Workspace (React / Vite)
```text
frontend/
├── src/
│   ├── assets/                  # Static assets
│   ├── components/
│   │   ├── ui/                  # shadcn accessible primitives
│   │   │   ├── button.tsx       
│   │   │   ├── input.tsx        
│   │   │   └── scroll-area.tsx  
│   │   ├── ChatWindow.tsx       # Live SSE markdown renderer
│   │   ├── DocumentLibrary.tsx  # CRUD UI for metadata & vector tables
│   │   ├── DocumentSidebar.tsx  # Multipart upload dropzone
│   │   └── ThoughtStream.tsx    # Real-time LangGraph node execution feed
│   ├── hooks/
│   │   └── useChatStream.ts     # Custom chunk-buffering SSE Parser
│   ├── lib/
│   │   ├── api.ts               # Centralized HTTP client layer
│   │   └── utils.ts             # Tailwind class merging (clsx)
│   ├── store/
│   │   └── chatStore.ts         # Zustand global state (Message & Prompt buffering)
│   ├── App.tsx                  # Root layout & view controller
│   ├── index.css                # Global Tailwind directives
│   └── main.tsx                 # React DOM attachment
├── public/                      # Public facing static assets
├── .gitignore                   # Git exclusions
├── components.json              # shadcn CLI config
├── eslint.config.js             # Linter rules
├── index.html                   # HTML entrypoint
├── package-lock.json            # Dependency tree lock
├── package.json                 # Node dependencies
├── postcss.config.js            # PostCSS config for Tailwind
├── tailwind.config.js           # Theme configuration
├── tsconfig.app.json            # TypeScript app config
├── tsconfig.json                # TypeScript base config
├── tsconfig.node.json           # TypeScript node config
└── vite.config.ts               # Vite bundler configuration
```

---

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env` file in the `/backend` directory. Map your Gemini API key and Postgres credentials.

```env
# AI Engine
LLM_API_KEY=AIzaSy...
LLM_MODEL=gemini-flash-lite-latest

# Disable telemetry for privacy
ANONYMIZED_TELEMETRY=False

# Database config
USE_POSTGRES=true
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rag_metadata
DB_USER=postgres
DB_PASSWORD=super_secure_password

# Gateway Settings
API_PORT=8000
```

### 2. Deployment (Docker / Production)
The fastest way to spin up the entire architecture (PostgreSQL, Vector Volumes, and FastAPI Gateway) is via Docker Compose. Ensure port `8000` and `5432` are available.

```bash
cd backend
docker compose up --build -d
```
*Note: Run `docker compose down -v` if you need to wipe the persistent database volumes to regenerate the schema.*

### 3. Local Development (Frontend)
Run the React Vite server locally. It is pre-configured to proxy requests to `http://localhost:8000`.

```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Suite & Reliability

The backend implements a comprehensive `pytest` suite simulating production edge cases.

* **Unit Tests (`test_ingestion.py`):** Validates the `RecursiveCharacterTextSplitter` boundaries ensuring no chunk exceeds the maximum token limit. Mocks the ChromaDB `add_texts` method to simulate thread-isolated write failures.
* **Integration Tests (`test_integration.py`):** An end-to-end suite that uploads a physical markdown file, polls the metadata tool to verify async ingestion completion, and tests both standard HTTP parsing and fragmented JSON stream (SSE) outputs from the LLM.

**Run the tests locally:**
```bash
cd backend
python tests/run_tests.py
```
*(The script includes an automatic pre-flight check to ensure Uvicorn is active on port 8000 before initiating the test runner).*

<!-- 📸 SCREENSHOT PLACEHOLDER: TESTING SUITE -->
<div align="center">
  <img src="https://via.placeholder.com/800x300?text=Test+Runner+Output+-+Replace+with+Terminal+Screenshot" alt="Test Runner Output">
  <br>
  <em>Figure 4: The automated test suite verifying ingestion chunking, LLM streaming, and SQL database tool invocation.</em>
</div>

---

## 💡 Future Scalability (Roadmap)
To transition this from a Portfolio Project to a fully Enterprise-ready cluster:
* Implement **Redis Caching** on the `/api/v1/tools/document_count` endpoint to prevent database thrashing under high concurrency.
* Implement **Distributed Locks (Pessimistic Locking)** in PostgreSQL when a user toggles the `is_active` state of a document, ensuring safety if multiple admins attempt to modify context simultaneously.
* Integrate **OpenTelemetry** for distributed tracing across the FastAPI gateway, LangGraph orchestrator, and external API calls to identify bottlenecks in the reasoning loop.
* Add **Role-Based Access Control (RBAC)** to the API, allowing for multi-tenant deployments with granular permissions on document visibility and agent tool usage.
* Expand the **Toolset** to include external APIs (e.g., Google Search, Wolfram Alpha) and internal microservices (e.g., User Profile Service) to demonstrate cross-service orchestration capabilities.