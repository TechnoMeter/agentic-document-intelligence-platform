import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { FileText, Calendar, Layers, RefreshCw, Loader2, MessageSquare, Trash2, ChevronDown, ChevronUp, FolderOpen } from 'lucide-react';
import clsx from 'clsx';

interface DocumentRecord {
  id: number;
  filename: string;
  file_type: string;
  upload_date: string;
  chunk_count: number;
  is_active: boolean;
}

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  
  const setView = useChatStore((state) => state.setView);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);
  const sessionId = useChatStore((state) => state.sessionId);
  const setHasDocuments = useChatStore((state) => state.setHasDocuments);

  const fetchDocs = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const data = await api.getDocuments(sessionId);
      setDocuments(data.documents);
      setHasDocuments(data.documents.length > 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [sessionId]);

  const handleToggle = async (id: number, currentStatus: boolean) => {
    if (!sessionId) return;
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
    try {
      await api.toggleDocument(id, !currentStatus, sessionId);
    } catch (err) {
      setDocuments(docs => docs.map(d => d.id === id ? { ...d, is_active: currentStatus } : d));
    }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (!sessionId) return;
    if (!confirm(`Are you sure you want to permanently delete "${filename}"?`)) return;
    
    setDocuments(docs => {
      const remaining = docs.filter(d => d.id !== id);
      setHasDocuments(remaining.length > 0);
      return remaining;
    });

    try {
      await api.deleteDocument(id, filename, sessionId);
    } catch (err) {
      fetchDocs();
    }
  };

  const handleQuickChat = (filename: string) => {
    setPendingPrompt(`Summarize the key information found in the document: ${filename}`);
    setView('chat');
  };

  const toggleExpand = async (doc: DocumentRecord) => {
    if (!sessionId) return;
    if (expandedId === doc.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(doc.id);
    setChunksLoading(true);
    try {
      const data = await api.getDocumentChunks(doc.filename, sessionId);
      setChunks(data.chunks || []);
    } catch (err) {
      setChunks(['Failed to load document content.']);
    } finally {
      setChunksLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200 h-full flex flex-col relative z-10">
      
{/* HEADER SECTION - Softened terminology & Aero Mobile Return Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/20 p-4 sm:p-6 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg gap-4">
        <div className="flex flex-col w-full sm:w-auto">
          
{/* Luminous Aero Mobile Return Button */}
          <button 
            onClick={() => setView('chat')}
            className="md:hidden self-start mb-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/10 backdrop-blur-xl border border-blue-400/30 shadow-[0_4px_20px_rgba(59,130,246,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] text-sm font-semibold text-blue-50 hover:from-blue-400/30 hover:to-blue-500/20 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
            Return to Chat
          </button>
          
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
            <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" /> 
            File Manager
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/70 mt-1 font-medium">View, manage, and interact with your uploaded files.</p>
        </div>
        <button 
          onClick={fetchDocs}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* CONTENT LIST - Replaced table with responsive cards/grid */}
      <div className="flex-1 bg-black/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/60 gap-4 w-full">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.6)]" />
            <p className="text-sm font-medium tracking-wide">Loading your files...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/50 gap-4 w-full">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
              <FileText className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-sm font-medium">No files uploaded yet.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto w-full p-2 sm:p-0">
            
            {/* Desktop-only List Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 text-xs text-blue-100/60 uppercase font-semibold tracking-wider bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="col-span-5">File Name</div>
              <div className="col-span-2 text-center">Active Status</div>
              <div className="col-span-2">Date Added</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {/* Responsive List Items */}
            <div className="flex flex-col gap-3 sm:gap-0 sm:divide-y sm:divide-white/5 w-full">
              {documents.map((doc) => (
                <div key={doc.id} className="group">
                  
                  {/* Item Row / Mobile Card */}
                  <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center p-4 md:px-6 md:py-4 bg-white/5 md:bg-transparent rounded-2xl md:rounded-none border border-white/10 md:border-transparent hover:bg-white/10 transition-colors">
                    
                    {/* Filename & Mobile Toggle */}
                    <div className="col-span-5 flex items-start md:items-center justify-between w-full gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button 
                          onClick={() => toggleExpand(doc)} 
                          className="text-white/40 hover:text-blue-300 transition-colors p-1 shrink-0 bg-white/5 rounded-md border border-white/10"
                          title="Preview Content"
                        >
                          {expandedId === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <FileText className="w-4 h-4 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)] shrink-0" />
                        <span className="truncate font-medium text-white/90 text-sm">{doc.filename}</span>
                      </div>

                      {/* Mobile-only toggle switch */}
                      <div className="md:hidden flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-blue-200/50 uppercase font-bold">{doc.is_active ? 'Active' : 'Off'}</span>
                        <button 
                          onClick={() => handleToggle(doc.id, doc.is_active)}
                          className={clsx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
                            doc.is_active ? "bg-gradient-to-r from-blue-500 to-blue-400 border-blue-300/50" : "bg-white/10 border-white/10"
                          )}
                        >
                          <span className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform",
                            doc.is_active ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>
                    </div>

                    {/* Desktop-only toggle switch */}
                    <div className="hidden md:flex col-span-2 justify-center">
                      <button 
                        onClick={() => handleToggle(doc.id, doc.is_active)}
                        className={clsx(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
                          doc.is_active ? "bg-gradient-to-r from-blue-500 to-blue-400 border-blue-300/50" : "bg-white/10 border-white/10"
                        )}
                        title={doc.is_active ? "Turn off file in chat" : "Activate file in chat"}
                      >
                        <span className={clsx(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform",
                          doc.is_active ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>

                    {/* Details (Mobile: middle row, Desktop: columns) */}
                    <div className="col-span-2 flex flex-row md:flex-col gap-4 md:gap-1 text-xs text-blue-50/60 w-full">
                      <span className="flex items-center gap-1.5" title="Upload Date">
                        <Calendar className="w-3.5 h-3.5 text-white/40" /> 
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 md:hidden" title="File Size/Segments">
                        <Layers className="w-3.5 h-3.5 text-white/40" /> 
                        {doc.chunk_count} parts
                      </span>
                    </div>

                    {/* Actions (Mobile: full width bottom row buttons) */}
                    <div className="col-span-3 flex items-center justify-end w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t border-white/10 md:border-none gap-2">
                      <button 
                        onClick={() => handleQuickChat(doc.filename)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white rounded-xl md:rounded-lg text-xs font-medium transition-colors border border-blue-400/30 hover:border-blue-400"
                        title="Chat about this document"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="md:hidden lg:inline">Chat</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl md:rounded-lg text-xs font-medium transition-colors border border-red-400/20 hover:border-red-500"
                        title="Permanently Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="md:hidden lg:inline">Delete</span>
                      </button>
                    </div>

                  </div>

                  {/* Expanded Content Preview */}
                  {expandedId === doc.id && (
                    <div className="bg-black/40 shadow-inner px-4 md:px-14 py-6 border-t border-white/5">
                      <div className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-4">
                        Document Content Preview
                      </div>
                      {chunksLoading ? (
                        <div className="flex items-center gap-2 text-blue-200/70 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" /> Fetching content...
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chunks.map((chunk, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-mono text-blue-50/80 leading-relaxed max-h-32 overflow-y-auto shadow-inner backdrop-blur-sm">
                              {chunk}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}