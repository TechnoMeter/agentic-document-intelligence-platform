import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { FileText, Database, Calendar, Layers, RefreshCw, Loader2, MessageSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const setHasDocuments = useChatStore((state) => state.setHasDocuments); // NEW

  const fetchDocs = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const data = await api.getDocuments(sessionId);
      setDocuments(data.documents);
      setHasDocuments(data.documents.length > 0); // Sync state on refresh
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
    if (!confirm(`Are you sure you want to delete ${filename} from the vector store?`)) return;
    
    // Optimistic delete
    setDocuments(docs => {
      const remaining = docs.filter(d => d.id !== id);
      setHasDocuments(remaining.length > 0);
      return remaining;
    });

    try {
      await api.deleteDocument(id, filename, sessionId);
    } catch (err) {
      fetchDocs(); // revert on fail
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
      setChunks(['Failed to load vector chunks.']);
    } finally {
      setChunksLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200 h-full flex flex-col relative z-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-black/20 p-4 sm:p-6 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
            <Database className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" /> Vector Knowledge Base
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/70 mt-1 font-medium">Manage metadata and embeddings active in the routing agent.</p>
        </div>
        <button 
          onClick={fetchDocs}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>

      <ScrollArea className="flex-1 bg-black/30 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/60 gap-4 w-full">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.6)]" />
              <p className="text-sm font-medium tracking-wide">Querying metadata layer...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/50 gap-4 w-full">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                <FileText className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm font-medium">No vectors indexed yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-sm text-left">
              <thead className="text-xs text-blue-100/60 uppercase bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-5 font-semibold tracking-wider">File Entity</th>
                  <th className="px-4 py-5 font-semibold text-center tracking-wider">Status</th>
                  <th className="px-4 py-5 font-semibold tracking-wider">Vectors</th>
                  <th className="px-4 py-5 font-semibold tracking-wider">Ingestion Time</th>
                  <th className="px-6 py-5 font-semibold text-right tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
                  <React.Fragment key={doc.id}>
                    <tr className="hover:bg-white/10 transition-colors group">
                      <td className="px-6 py-4 font-medium text-white/90">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleExpand(doc)} className="text-white/40 hover:text-blue-300 transition-colors">
                            {expandedId === doc.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          <FileText className="w-4 h-4 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
                          {doc.filename}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => handleToggle(doc.id, doc.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${doc.is_active ? 'bg-gradient-to-r from-blue-500 to-blue-400 border-blue-300/50' : 'bg-white/10 border-white/10'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${doc.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-blue-50/80">
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-300/60" /> {doc.chunk_count}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-blue-50/60">
                        <span className="flex items-center gap-2 text-xs">
                          <Calendar className="w-4 h-4 text-white/30" /> {new Date(doc.upload_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleQuickChat(doc.filename)}
                            className="p-2 text-blue-300 hover:bg-blue-500/20 hover:text-white rounded-lg transition-colors border border-transparent hover:border-blue-400/30"
                            title="Chat with Document"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="p-2 text-red-400 hover:bg-red-500/20 hover:text-red-200 rounded-lg transition-colors border border-transparent hover:border-red-400/30"
                            title="Delete from Database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === doc.id && (
                      <tr className="bg-black/40 shadow-inner">
                        <td colSpan={5} className="px-6 sm:px-14 py-6">
                          <div className="text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-4">Semantic Vector Preview (Top 3 Chunks)</div>
                          {chunksLoading ? (
                            <div className="flex items-center gap-2 text-blue-200/70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Fetching from ChromaDB...</div>
                          ) : (
                            <div className="space-y-3">
                              {chunks.map((chunk, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-mono text-blue-50/80 leading-relaxed max-h-32 overflow-y-auto shadow-inner backdrop-blur-sm">
                                  {chunk}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}