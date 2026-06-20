import { useEffect } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { ThoughtStream } from '@/components/ThoughtStream';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { DocumentLibrary } from '@/components/DocumentLibrary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/store/chatStore';
import { Database, MessageSquare, BookOpen, Menu, X, LogOut, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Login } from '@/components/Login';
import { api } from '@/lib/api';

function App() {
  const {
    currentView, setView, isMobileMenuOpen, setMobileMenuOpen,
    isMobileThoughtsOpen, setMobileThoughtsOpen, thoughts,
    sessionId, username, setSession, logout, setMessages, addMessage,
    setHasDocuments // Pulled new state setter
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
      // 1. Fetch Chat History
      api.getChatHistory(sessionId)
        .then(history => {
          setMessages([]);
          history.forEach(msg => {
            addMessage({ role: msg.role as 'user' | 'assistant', content: msg.content });
          });
        })
        .catch(err => console.error('Failed to load chat history:', err));

      // 2. Fetch Document Count for UI Onboarding State
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
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_0_15px_rgba(59,130,246,0.6)] border border-white/40 shrink-0">
            <Database className="w-4 h-4 text-white drop-shadow-md" />
          </div>
          <div className="truncate">
            <h1 className="font-bold text-sm tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white/95">ShriRAGx</h1>
            <p className="text-sm font-bold text-green-400 truncate drop-shadow-[0_0_10px_rgba(74,222,128,0.9)] tracking-wide">
              {username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => setMobileThoughtsOpen(!isMobileThoughtsOpen)}
            className="text-white p-2 hover:bg-white/10 rounded-md transition-colors relative"
            title="Agent Trace"
          >
            <Activity className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
            {thoughts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse border border-black" />
            )}
          </button>
          
          <button 
            onClick={logout}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),_0_0_15px_rgba(239,68,68,0.4)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
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

      {isMobileThoughtsOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileThoughtsOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-[65vh] bg-[#051B2C] border-t border-white/10 rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 rounded-t-3xl">
              <h2 className="font-semibold text-sm text-white/95 flex items-center gap-2 drop-shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse border border-white/40"></span>
                Agent Orchestration Trace
              </h2>
              <button onClick={() => setMobileThoughtsOpen(false)} className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <ScrollArea className="flex-1 bg-gradient-to-b from-transparent to-black/20">
              <ThoughtStream />
            </ScrollArea>
          </div>
        </div>
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#051B2C]/95 md:bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05),_5px_0_30px_rgba(0,0,0,0.5)] flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex",
        isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden"
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50 pointer-events-none" />
        
        <div className="hidden md:flex items-center justify-between p-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3 text-white min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_0_15px_rgba(59,130,246,0.6)] border border-white/40 shrink-0">
              <Database className="w-4 h-4 text-white drop-shadow-md" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-base tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white/95">ShriRAGx</h1>
              <p className="text-sm font-bold text-green-400 truncate drop-shadow-[0_0_12px_rgba(74,222,128,1)] tracking-wide">
                {username}
              </p>
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
        
        <div className="md:hidden p-4 border-b border-white/10 relative z-10 bg-black/20">
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Session
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

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 overflow-hidden">
        {currentView === 'chat' && <ChatWindow />}
        {currentView === 'documents' && <DocumentLibrary />}
        {/* Omitting instructions manual static HTML block to save character space... Leave it exactly as it was */}
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