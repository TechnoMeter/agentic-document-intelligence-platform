import { useEffect } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { DocumentLibrary } from '@/components/DocumentLibrary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/store/chatStore';
import { Database, MessageSquare, BookOpen, Menu, X, LogOut, Activity, Shield, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Login } from '@/components/Login';
import { api } from '@/lib/api';

function App() {
  const {
    currentView, setView, isMobileMenuOpen, setMobileMenuOpen,
    sessionId, username, setSession, logout, setMessages, addMessage,
    setHasDocuments
  } = useChatStore();

  useEffect(() => {
    const stored = localStorage.getItem('current_session');
    if (stored) {
      try {
        const { username, sessionId } = JSON.parse(stored);
        if (username && sessionId) {
          setSession(username, sessionId);
        }
      } catch (e) {
        console.warn('Invalid stored session, ignoring.');
      }
    }
  }, [setSession]);

  useEffect(() => {
    if (sessionId) {
      api.getChatHistory(sessionId)
        .then(history => {
          setMessages([]);
          history.forEach(msg => {
            addMessage({ role: msg.role as 'user' | 'assistant', content: msg.content });
          });
        })
        .catch(err => console.error('Failed to load chat history:', err));

      api.getDocuments(sessionId)
        .then(data => {
          setHasDocuments(data.documents && data.documents.length > 0);
        })
        .catch(err => console.error('Failed to load docs:', err));
    }
  }, [sessionId, setMessages, addMessage, setHasDocuments]);

  if (!sessionId) {
    return <Login />;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden font-sans text-slate-100 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#003B5C] via-[#051B2C] to-[#000000]">      
      
      <header className="md:hidden flex items-center justify-between p-3 bg-black/20 backdrop-blur-md border-b border-white/10 z-30 relative shrink-0">
<div className="flex items-center gap-3 min-w-0">
          {/* Glassmorphic Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.15)] shrink-0">
            <Database className="w-5 h-5 text-blue-50 drop-shadow-sm" />
          </div>
          
          {/* Aligned Typography */}
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="font-['Caveat',_cursive] font-medium text-[28px] leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 pb-0.5">
              ShriRAGx
            </h1>
            {/* Aero Username Pill */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-black/20 border border-white/10 backdrop-blur-md w-fit shadow-inner mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
              <span className="text-[12px] font-medium text-emerald-100/90 tracking-wider truncate max-w-[90px] leading-none">
                {username}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          
          <button 
            onClick={logout}
            className="flex items-center justify-center w-auto px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),_0_0_15px_rgba(239,68,68,0.4)] transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="ml-1 text-xs font-medium">Logout</span>
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} 
            className="text-white p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#051B2C]/95 md:bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),_5px_0_30px_rgba(0,0,0,0.5)] flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex",
        isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden"
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 pointer-events-none" />
        
        <div className="hidden md:flex items-center justify-between p-4 border-b border-white/10 relative z-10">
<div className="flex items-center gap-3 min-w-0">
            {/* Glassmorphic Icon */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.15)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <Database className="w-5 h-5 text-blue-50 drop-shadow-md relative z-10" />
            </div>
            
            {/* Aligned Typography */}
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="font-['Caveat',_cursive] font-medium text-[26px] leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 pb-0.5">
                ShriRAGx
              </h1>
              {/* Aero Username Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/20 border border-white/10 backdrop-blur-md w-fit shadow-inner mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="text-[12px] font-medium text-emerald-100/90 tracking-wider truncate max-w-[120px] leading-none">
                  {username}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),_0_0_15px_rgba(239,68,68,0.4)] transition-all shrink-0 ml-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4 relative z-10">
          <div className="space-y-6">
            <DocumentSidebar />
            
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest mb-3 px-3 drop-shadow-sm">
                Navigation
              </div>
              <button 
                onClick={() => { setView('chat'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'chat' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Context Agent Chat
              </button>
              <button 
                onClick={() => { setView('documents'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'documents' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <Database className="w-4 h-4" />
                Document Library
              </button>
              <button 
                onClick={() => { setView('instructions'); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium border ${currentView === 'instructions' ? 'bg-white/20 border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_15px_rgba(0,0,0,0.3)]' : 'border-transparent hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white'}`}
              >
                <BookOpen className="w-4 h-4" />
                Architecture Manual
              </button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 overflow-hidden">
        {currentView === 'chat' && <ChatWindow />}
        {currentView === 'documents' && <DocumentLibrary />}
        
        {/* REBUILT HYBRID ARCHITECTURE MANUAL - MOBILE OPTIMIZED */}
        {currentView === 'instructions' && (
          <div className="flex-1 w-full h-full overflow-y-auto">
            <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full flex flex-col space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-20 min-w-0">
              
{/* HERO SECTION */}
              <div className="bg-black/20 p-5 sm:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/10 shadow-lg relative overflow-hidden w-full break-words">
                
{/* Luminous Aero Mobile Return Button */}
                <button 
                  onClick={() => setView('chat')}
                  className="md:hidden relative z-20 mb-6 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/10 backdrop-blur-xl border border-blue-400/30 shadow-[0_4px_20px_rgba(59,130,246,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] text-sm font-semibold text-blue-50 hover:from-blue-400/30 hover:to-blue-500/20 transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
                  Return to Chat
                </button>

                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden sm:block">
                  <BookOpen className="w-48 h-48" />
                </div>
                <h2 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3 drop-shadow-md relative z-10 flex-wrap">
                  <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)] shrink-0" />
                  <span>Platform Architecture Manual</span>
                </h2>
                <p className="text-blue-100/70 mt-3 font-medium max-w-2xl relative z-10 text-sm sm:text-base leading-relaxed">
                  ShriRAGx is a secure, multi‑tenant, production‑grade RAG architecture with autonomous agentic orchestration. 
                  This manual outlines the core engineering principles powering your secure session.
                </p>
              </div>

              {/* HIGH-LEVEL GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl shadow-inner backdrop-blur-sm hover:bg-white/10 transition-colors w-full min-w-0 flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 sm:mb-4 border border-purple-500/30 shrink-0">
                    <Activity className="w-5 h-5 text-purple-400 drop-shadow-md" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 break-words">Agentic Orchestration</h3>
                  <p className="text-xs sm:text-sm text-blue-100/70 leading-relaxed">
                    Powered by LangGraph, the AI dynamically evaluates queries to execute SQL for metadata, perform semantic search in ChromaDB, or respond conversationally—drastically reducing hallucinations.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl shadow-inner backdrop-blur-sm hover:bg-white/10 transition-colors w-full min-w-0 flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3 sm:mb-4 border border-emerald-500/30 shrink-0">
                    <Shield className="w-5 h-5 text-emerald-400 drop-shadow-md" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 break-words">Zero-Trust Security</h3>
                  <p className="text-xs sm:text-sm text-blue-100/70 leading-relaxed">
                    Passwords are never sent to the backend. The React UI computes a SHA-256 hash locally. This hash becomes your strict environment key for isolated Postgres queries and ChromaDB vector filters.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl shadow-inner backdrop-blur-sm hover:bg-white/10 transition-colors w-full min-w-0 flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 sm:mb-4 border border-blue-500/30 shrink-0">
                    <Database className="w-5 h-5 text-blue-400 drop-shadow-md" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 break-words">Dual-Layer Storage</h3>
                  <p className="text-xs sm:text-sm text-blue-100/70 leading-relaxed">
                    The architecture splits responsibilities: ChromaDB natively handles high-dimensional semantic chunks, while PostgreSQL tracks absolute file metadata, upload timestamps, and active toggle states.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl shadow-inner backdrop-blur-sm hover:bg-white/10 transition-colors w-full min-w-0 flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-3 sm:mb-4 border border-amber-500/30 shrink-0">
                    <Trash2 className="w-5 h-5 text-amber-400 drop-shadow-md" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 break-words">Resource Protection</h3>
                  <p className="text-xs sm:text-sm text-blue-100/70 leading-relaxed">
                    Running on constrained Azure nodes, the system prevents Out of Memory (OOM) errors via an APScheduler worker that garbage-collects data older than 24 hours.
                  </p>
                </div>
              </div>

              {/* TECHNICAL DEEP DIVE */}
              <div className="bg-black/30 p-5 sm:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] space-y-8 w-full min-w-0 overflow-hidden">
                
                <div className="w-full min-w-0 flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 drop-shadow-sm flex items-start sm:items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400 mt-0.5 sm:mt-0 shrink-0" />
                    <span className="break-words">1. Separation of Concerns</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-50/80 leading-relaxed mb-4 break-words">
                    The system enforces strict decoupling between data ingestion (Write Path) and agentic reasoning (Read Path) to ensure high concurrency and zero UI blocking.
                  </p>
                  <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch border border-white/10 bg-white/5 rounded-lg backdrop-blur-sm">
                    <table className="w-full text-[11px] sm:text-xs text-left min-w-[500px]">
                      <thead>
                        <tr className="bg-black/40 border-b border-white/10">
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">System Path</th>
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">Execution Context</th>
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">Primary Objective</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-white whitespace-nowrap">Write Path</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 whitespace-nowrap">Asynchronous</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 min-w-[200px]">Isolate CPU-heavy extraction and vectorization.</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-white whitespace-nowrap">Read Path</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 whitespace-nowrap">Real-time Stream</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 min-w-[200px]">Autonomous ReAct evaluation and SSE streaming.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <hr className="border-white/10 w-full" />

                <div className="w-full min-w-0 flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 drop-shadow-sm flex items-start sm:items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400 mt-0.5 sm:mt-0 shrink-0" />
                    <span className="break-words">2. Document Pipeline</span>
                  </h3>
                  <ol className="list-decimal list-outside ml-4 space-y-2 text-xs sm:text-sm text-blue-50/80 marker:text-blue-400 font-medium w-full pr-2">
                    <li className="pl-1 break-words"><strong className="text-white">Extraction & Chunking:</strong> Content is split using a boundary of 200 elements.</li>
                    <li className="pl-1 break-words"><strong className="text-white">Local Edge Vectorization:</strong> Chunks are vectorized bypassing external API costs.</li>
                    <li className="pl-1 break-words"><strong className="text-white">Dual Commit:</strong> Vectors go to ChromaDB while ACID metadata commits to PostgreSQL.</li>
                  </ol>
                </div>

                <hr className="border-white/10 w-full" />

                <div className="w-full min-w-0 flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 drop-shadow-sm flex items-start sm:items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400 mt-0.5 sm:mt-0 shrink-0" />
                    <span className="break-words">3. Agentic Routing Logic</span>
                  </h3>
                  <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch border border-white/10 bg-white/5 rounded-lg backdrop-blur-sm">
                    <table className="w-full text-[11px] sm:text-xs text-left min-w-[500px]">
                      <thead>
                        <tr className="bg-black/40 border-b border-white/10">
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">Classification</th>
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">Trigger Conditions</th>
                          <th className="p-2 sm:p-3 font-semibold text-white/90 whitespace-nowrap">Assigned Path</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-2 sm:p-3 font-mono text-blue-300 whitespace-nowrap">Metadata</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 min-w-[200px]">count, how many, recent</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 whitespace-nowrap">System Meta Node</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-2 sm:p-3 font-mono text-emerald-300 whitespace-nowrap">RAG</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 min-w-[200px]">summarize, what does the file say</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 whitespace-nowrap">Vector Search Node</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-2 sm:p-3 font-mono text-purple-300 whitespace-nowrap">Conversation</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 min-w-[200px]">hello, who are you</td>
                          <td className="p-2 sm:p-3 text-blue-50/80 whitespace-nowrap">LLM Generation</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <hr className="border-white/10 w-full" />

                <div className="w-full min-w-0 flex flex-col">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 drop-shadow-sm flex items-start sm:items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 sm:mt-0 shrink-0" />
                    <span className="break-words">4. Operations Reference</span>
                  </h3>
                  <div className="w-full max-w-full bg-black/40 border border-white/10 p-3 sm:p-5 rounded-xl text-[10px] sm:text-xs font-mono text-blue-200/80 space-y-3 shadow-inner overflow-x-auto">
                    <div className="whitespace-nowrap"><span className="text-slate-400"># Direct Metadata Execution</span><br />&gt; How many files are uploaded right now?<br />&gt; Show a list of all recent documents.</div>
                    <div className="whitespace-nowrap mt-4"><span className="text-slate-400"># Semantic Generation</span><br />&gt; Summarize the engineering requirements.<br />&gt; Compare the architecture paradigms.</div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
        
      </main>
      
    </div>
  );
}

export default App;