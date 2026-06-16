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

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleToggle = async (id: number, currentStatus: boolean) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
    try {
      await api.toggleDocument(id, !currentStatus);
    } catch (err) {
      // Revert on failure
      setDocuments(docs => docs.map(d => d.id === id ? { ...d, is_active: currentStatus } : d));
    }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename} from the vector store?`)) return;
    setDocuments(docs => docs.filter(d => d.id !== id));
    try {
      await api.deleteDocument(id, filename);
    } catch (err) {
      fetchDocs(); // Resync on error
    }
  };

  const handleQuickChat = (filename: string) => {
    setPendingPrompt(`Summarize the key information found in the document: ${filename}`);
    setView('chat');
  };

  const toggleExpand = async (doc: DocumentRecord) => {
    if (expandedId === doc.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(doc.id);
    setChunksLoading(true);
    try {
      const data = await api.getDocumentChunks(doc.filename);
      setChunks(data.chunks || []);
    } catch (err) {
      setChunks(['Failed to load vector chunks.']);
    } finally {
      setChunksLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" /> Vector Knowledge Base
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage metadata and embeddings active in the routing agent.</p>
        </div>
        <button 
          onClick={fetchDocs}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>

      <ScrollArea className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Querying metadata layer...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
              <FileText className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium">No vectors indexed yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">File Entity</th>
                <th className="px-4 py-4 font-semibold text-center">Status</th>
                <th className="px-4 py-4 font-semibold">Vectors</th>
                <th className="px-4 py-4 font-semibold">Ingestion Time</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <React.Fragment key={doc.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleExpand(doc)} className="text-slate-400 hover:text-blue-500">
                          {expandedId === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <FileText className="w-4 h-4 text-blue-500" />
                        {doc.filename}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => handleToggle(doc.id, doc.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${doc.is_active ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${doc.is_active ? 'translate-x-4.5' : 'translate-x-1'}`} style={{ transform: doc.is_active ? 'translateX(18px)' : 'translateX(4px)' }} />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400" /> {doc.chunk_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      <span className="flex items-center gap-2 text-xs">
                        <Calendar className="w-3 h-3 text-slate-400" /> {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleQuickChat(doc.filename)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Chat with Document"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete from Database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Semantic Chunk View */}
                  {expandedId === doc.id && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-14 py-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Semantic Vector Preview (Top 3 Chunks)</div>
                        {chunksLoading ? (
                          <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Fetching from ChromaDB...</div>
                        ) : (
                          <div className="space-y-2">
                            {chunks.map((chunk, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
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
      </ScrollArea>
    </div>
  );
}