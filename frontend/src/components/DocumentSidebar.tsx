import { useState } from 'react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocumentSidebar() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [fileName, setFileName] = useState<string>('');
  const sessionId = useChatStore((state) => state.sessionId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sessionId) return;

    setFileName(file.name);
    setStatus('uploading');
    try {
      await api.uploadFile(file, sessionId);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFileName('');
      }, 3000);
    } catch (error) {
      console.error(error);
      setStatus('idle');
      alert('Failed to complete document ingestion.');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingestion Channel</h3>
      <label className={cn(
        "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all p-4 text-center",
        status === 'idle' ? "border-slate-700 hover:bg-slate-800/40" : "border-blue-500 bg-blue-950/20"
      )}>
        <div className="flex flex-col items-center justify-center">
          {status === 'idle' && <FileUp className="w-7 h-7 mb-2 text-slate-400" />}
          {status === 'uploading' && <Loader2 className="w-7 h-7 mb-2 text-blue-500 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-7 h-7 mb-2 text-emerald-500" />}
          
          <p className="text-xs font-medium text-slate-300">
            {status === 'idle' ? "Upload Workspace File" : status === 'uploading' ? "Processing Chunks..." : "Ingested Successfully!"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] text-center leading-tight">
            {fileName || "Accepts PDF, Office, TXT, MD, CSV, JSON, HTML, EPUB & more"}
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleFileUpload} 
          accept=".txt,.pdf,.md,.docx,.xlsx,.pptx,.csv,.json,.html,.xml,.epub,.odt,.rtf" 
        />
      </label>
    </div>
  );
}