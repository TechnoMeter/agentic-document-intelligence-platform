import { useState } from 'react';
import { api } from '@/lib/api';
import { FileUp, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocumentSidebar() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('uploading');
    try {
      await api.uploadFile(file);
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
    <div className="p-4 space-y-4 relative z-10">
      <h3 className="text-[10px] font-bold text-blue-200/60 uppercase tracking-widest drop-shadow-sm px-1">Ingestion Channel</h3>
      <label className={cn(
        "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all p-4 text-center backdrop-blur-md shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]",
        status === 'idle' ? "border-white/20 bg-black/20 hover:bg-white/10 hover:border-white/40" : 
        status === 'uploading' ? "border-blue-400/50 bg-blue-900/20" :
        "border-emerald-400/50 bg-emerald-900/20"
      )}>
        <div className="flex flex-col items-center justify-center">
          {status === 'idle' && <FileUp className="w-8 h-8 mb-3 text-white/50 drop-shadow-sm" />}
          {status === 'uploading' && <Loader2 className="w-8 h-8 mb-3 text-blue-400 animate-spin drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
          {status === 'success' && <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
          
          <p className="text-sm font-semibold text-white/90 tracking-wide">
            {status === 'idle' ? "Upload Workspace File" : status === 'uploading' ? "Processing Chunks..." : "Ingested Successfully!"}
          </p>
          <p className="text-xs text-blue-100/50 mt-1 max-w-[200px] truncate font-medium">
            {fileName || "Accepts PDF, TXT, or MD"}
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          onChange={handleFileUpload} 
          accept=".pdf,.txt,.md" 
        />
      </label>
    </div>
  );
}