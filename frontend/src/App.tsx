import { ChatWindow } from '@/components/ChatWindow';
import { ThoughtStream } from '@/components/ThoughtStream';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { DocumentLibrary } from '@/components/DocumentLibrary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/store/chatStore';
import { Database, MessageSquare, BookOpen, Layers } from 'lucide-react';

function App() {
  const { currentView, setView } = useChatStore();

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      <aside className="w-[280px] bg-slate-950 text-slate-300 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-900">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-base tracking-tight">Agentic Gateway</h1>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            <DocumentSidebar />
            
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3">
                Navigation
              </div>
              <button 
                onClick={() => setView('chat')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${currentView === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Context Agent Chat
              </button>
              <button 
                onClick={() => setView('documents')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${currentView === 'documents' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                <Database className="w-4 h-4" />
                Document Library
              </button>
              <button 
                onClick={() => setView('instructions')}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${currentView === 'instructions' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                <BookOpen className="w-4 h-4" />
                Architecture Manual
              </button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
        {currentView === 'chat' && <ChatWindow />}
        {currentView === 'documents' && <DocumentLibrary />}
{currentView === 'instructions' && (
          <ScrollArea className="flex-1 p-8 max-w-3xl mx-auto w-full prose prose-slate animate-in fade-in duration-200">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Layers className="w-6 h-6 text-blue-600" /> Platform Architecture Manual
            </h2>
            <p className="text-sm text-slate-500 mb-6">Execution logic and usage paradigms for the Agentic Document Engine.</p>
            <hr className="border-slate-200 my-4" />
            
            <h3 className="text-base font-bold text-slate-800 mt-6">1. Document Processing System</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              When documents are uploaded via the Ingestion Panel, the background file stream chunks target content using a <code>RecursiveCharacterTextSplitter</code> configured with an overlap boundary of 200 elements. Text items are automatically vectorized inside a multi-threaded execution loop through an <code>all-MiniLM-L6-v2</code> HuggingFace embedder before persistent allocation to ChromaDB vector layers.
            </p>

            <h3 className="text-base font-bold text-slate-800 mt-6">2. Zero-Latency Routing Paradigm</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Input user requests hit a heuristic structural classifier node that splits execution tasks based on token content without initial model costs:
            </p>
            <table className="min-w-full text-xs text-left border border-slate-100 my-4">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 border-b font-semibold text-slate-700">Classification</th>
                  <th className="p-2 border-b font-semibold text-slate-700">Trigger Regex Keywords</th>
                  <th className="p-2 border-b font-semibold text-slate-700">Assigned Node Path</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b font-mono text-blue-600">Metadata Queries</td>
                  <td className="p-2 border-b">count, how many, recent, list, document info</td>
                  <td className="p-2 border-b">System Metadata Tool Node</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-mono text-emerald-600">Context RAG Queries</td>
                  <td className="p-2 border-b">General inquiries, semantic search keywords</td>
                  <td className="p-2 border-b">Vector Search and Generation</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-base font-bold text-slate-800 mt-6">3. System Operations Reference Examples</h3>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs font-mono text-slate-700 space-y-2">
              <div><span className="text-slate-400"># Check document count tool</span><br />&gt; How many files are uploaded right now?</div>
              <div><span className="text-slate-400"># Verify active file indexes</span><br />&gt; Show a list of all recent documents.</div>
              <div><span className="text-slate-400"># Semantic document lookup</span><br />&gt; Summarize the engineering requirements from the roadmap file.</div>
            </div>
          </ScrollArea>
        )}
      </main>

      <aside className="w-[320px] bg-slate-50 hidden lg:flex flex-col border-l border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Agent Orchestration
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time LangGraph routing trace</p>
        </div>
        <ScrollArea className="flex-1">
          <ThoughtStream />
        </ScrollArea>
      </aside>
      
    </div>
  );
}

export default App;