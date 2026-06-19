import { ChatWindow } from '@/components/ChatWindow';
import { ThoughtStream } from '@/components/ThoughtStream';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { DocumentLibrary } from '@/components/DocumentLibrary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/store/chatStore';
import { Database, MessageSquare, BookOpen, Layers, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function App() {
  const { currentView, setView, isMobileMenuOpen, setMobileMenuOpen } = useChatStore();

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden font-sans text-slate-100 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#003B5C] via-[#051B2C] to-[#000000]">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/10 z-30 relative shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_0_15px_rgba(59,130,246,0.6)] border border-white/40">
            <Database className="w-4 h-4 text-white drop-shadow-md" />
          </div>
          <h1 className="font-bold text-base tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white/95">ShriRAGx</h1>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-white p-2 hover:bg-white/10 rounded-md transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
      
      {/* Sidebar: Frosted Aero Glass */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#051B2C]/95 md:bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),_5px_0_30px_rgba(0,0,0,0.5)] flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex",
        isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden"
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 pointer-events-none" />
        
        <div className="hidden md:flex p-6 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_0_15px_rgba(59,130,246,0.6)] border border-white/40">
              <Database className="w-4 h-4 text-white drop-shadow-md" />
            </div>
            <h1 className="font-bold text-base tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white/95">ShriRAGx</h1>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3 py-4 relative z-10">
          <div className="space-y-6">
            <DocumentSidebar />
            
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-3 px-3 drop-shadow-sm">
                Navigation
              </div>
              <button 
                onClick={() => setView('chat')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'chat' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Context Agent Chat
              </button>
              <button 
                onClick={() => setView('documents')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'documents' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <Database className="w-4 h-4" />
                Document Library
              </button>
              <button 
                onClick={() => setView('instructions')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'instructions' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <BookOpen className="w-4 h-4" />
                Architecture Manual
              </button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Added `overflow-hidden` to explicitly prevent main view flex-blowout */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 overflow-hidden">
        {currentView === 'chat' && <ChatWindow />}
        {currentView === 'documents' && <DocumentLibrary />}
        {currentView === 'instructions' && (
          <ScrollArea className="flex-1 w-full h-full relative z-10 animate-in fade-in duration-200">
            {/* CSS Grid acts as a layout firewall against children trying to stretch the width */}
            <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full grid grid-cols-1">
              <div className="p-4 sm:p-6 md:p-8 bg-black/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] grid grid-cols-1 w-full min-w-0 break-words">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2 drop-shadow-md">
                  <Layers className="w-6 h-6 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)] shrink-0" /> Platform Architecture Manual
                </h2>
                <p className="text-sm text-blue-100/70 mb-6">Execution logic, storage paradigms, and orchestration pathways for the Agentic Document Intelligence Platform.</p>
                <hr className="border-white/10 my-4 w-full" />
                
                <h3 className="text-base font-bold text-white mt-6 drop-shadow-sm">1. Architectural Paradigm: Separation of Concerns</h3>
                <p className="text-sm text-blue-50/80 leading-relaxed mb-3">
                  The system enforces strict decoupling between data ingestion (Write Path) and agentic reasoning (Read Path) to ensure high concurrency and zero UI blocking.
                </p>
                
                {/* max-w-full added to explicitly bind to the grid border */}
                <div className="w-full max-w-full overflow-x-auto my-4 border border-white/10 bg-white/5 rounded-lg backdrop-blur-sm">
                  <table className="w-full text-xs text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-black/40 border-b border-white/10">
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">System Path</th>
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Execution Context</th>
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Core Technologies</th>
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Primary Objective</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white whitespace-nowrap">Write Path</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">Asynchronous / Background</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">FastAPI, pypdf, HuggingFace</td>
                        <td className="p-3 text-blue-50/80 min-w-[200px]">Isolate CPU-heavy document extraction, chunking, and vectorization from the event loop.</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white whitespace-nowrap">Read Path</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">Real-time / Sync Stream</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">LangGraph, Gemini API, SSE</td>
                        <td className="p-3 text-blue-50/80 min-w-[200px]">Autonomous ReAct evaluation, tool execution, and token streaming via Server-Sent Events.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-base font-bold text-white mt-8 drop-shadow-sm">2. Dual-Layer Storage Model</h3>
                <p className="text-sm text-blue-50/80 leading-relaxed mb-3">
                  Document context is managed across two distinct database layers to provide both semantic depth and deterministic control.
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-blue-50/80 marker:text-blue-400">
                  <li><strong className="text-white">Relational Metadata (PostgreSQL):</strong> Tracks absolute file state, ingestion timestamps, and visibility. Enables deterministic administrative queries and zero-cost "soft deletes" via an <code className="bg-black/40 px-1 py-0.5 rounded border border-white/10 text-blue-300 break-all">is_active</code> toggle.</li>
                  <li><strong className="text-white">Vector Storage (ChromaDB):</strong> Stores dense vector representations of textual chunks for cosine-similarity RAG lookups.</li>
                </ul>

                <h3 className="text-base font-bold text-white mt-8 drop-shadow-sm">3. Document Ingestion Pipeline</h3>
                <p className="text-sm text-blue-50/80 leading-relaxed mb-3">
                  When files are transmitted via the ingestion channel, the background worker executes a strict pipeline:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-50/80 marker:text-blue-400 font-medium">
                  <li><span className="text-white">Extraction & Chunking:</span> Content is split using a RecursiveCharacterTextSplitter configured with a boundary of 200 elements.</li>
                  <li><span className="text-white">Local Edge Vectorization:</span> Chunks are vectorized using the all-MiniLM-L6-v2 embedder, completely bypassing external API costs.</li>
                  <li><span className="text-white">Commit:</span> Vectors are allocated to ChromaDB while parallel ACID-compliant metadata is committed to PostgreSQL.</li>
                </ol>

                <h3 className="text-base font-bold text-white mt-8 drop-shadow-sm">4. Agentic Orchestration & Routing</h3>
                <p className="text-sm text-blue-50/80 leading-relaxed mb-3">
                  Input requests hit a LangGraph orchestrator (ReAct architecture) that dynamically evaluates required tools before committing to costly LLM generations. 
                </p>
                
                <div className="w-full max-w-full overflow-x-auto my-4 border border-white/10 bg-white/5 rounded-lg backdrop-blur-sm">
                  <table className="w-full text-xs text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-black/40 border-b border-white/10">
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Classification</th>
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Trigger Conditions</th>
                        <th className="p-3 font-semibold text-white/90 whitespace-nowrap">Assigned Node Path</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-blue-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.5)] whitespace-nowrap">Metadata Queries</td>
                        <td className="p-3 text-blue-50/80 min-w-[200px]">count, how many, recent, list, document info</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">System Metadata Tool Node</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-emerald-300 drop-shadow-[0_0_5px_rgba(110,231,183,0.5)] whitespace-nowrap">Contextual RAG</td>
                        <td className="p-3 text-blue-50/80 min-w-[200px]">summarize, explain, what does the file say</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">Vector Search Node</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-purple-300 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)] whitespace-nowrap">Conversational</td>
                        <td className="p-3 text-blue-50/80 min-w-[200px]">hello, who are you, general non-data chat</td>
                        <td className="p-3 text-blue-50/80 whitespace-nowrap">Direct LLM Generation</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="text-base font-bold text-white mt-8 drop-shadow-sm">5. System Operations Reference Examples</h3>
                <div className="w-full max-w-full bg-black/40 border border-white/10 p-4 sm:p-5 rounded-xl text-xs font-mono text-blue-200/80 space-y-3 shadow-inner overflow-x-auto">
                  <div className="whitespace-nowrap"><span className="text-slate-400"># Direct Metadata Execution (Bypasses Vector Search)</span><br />&gt; How many files are uploaded right now?<br />&gt; Show a list of all recent documents.</div>
                  <div className="whitespace-nowrap mt-4"><span className="text-slate-400"># Semantic Generation Execution (Triggers Vector Search)</span><br />&gt; Summarize the engineering requirements from the roadmap file.<br />&gt; Compare the architecture paradigms mentioned in the uploaded files.</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </main>

      <aside className="w-[320px] bg-black/20 backdrop-blur-2xl hidden lg:flex flex-col border-l border-white/10 relative z-20 shadow-[inset_1px_0_0_rgba(255,255,255,0.05),_-5px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-white/10 relative z-10 bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="font-semibold text-sm text-white/95 flex items-center gap-2 drop-shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse border border-white/40"></span>
            Agent Orchestration
          </h2>
          <p className="text-xs text-blue-200/60 mt-1">Real-time LangGraph routing trace</p>
        </div>
        <ScrollArea className="flex-1 relative z-10">
          <ThoughtStream />
        </ScrollArea>
      </aside>
      
    </div>
  );
}

export default App;