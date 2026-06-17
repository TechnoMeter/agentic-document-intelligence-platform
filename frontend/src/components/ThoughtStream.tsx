import { useChatStore } from '@/store/chatStore';
import { Loader2 } from 'lucide-react';

export function ThoughtStream() {
  const thoughts = useChatStore((state) => state.thoughts);
  const isLoading = useChatStore((state) => state.isLoading);

  if (thoughts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 p-6 text-center space-y-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <Loader2 className="w-6 h-6 text-white/30" />
        </div>
        <p className="text-sm font-medium tracking-wide">Agent is standing by.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {thoughts.map((thought, idx) => (
        <div 
          key={idx} 
          className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-sm text-blue-50/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.3)] animate-in slide-in-from-right-4 fade-in duration-300"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse" />
            <span className="font-bold text-[10px] text-blue-200/60 uppercase tracking-widest drop-shadow-sm">System Step</span>
          </div>
          <p className="leading-relaxed font-mono text-xs">{thought}</p>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex items-center justify-center py-6 text-blue-300/70 gap-3">
          <Loader2 className="w-5 h-5 animate-spin drop-shadow-[0_0_5px_rgba(147,197,253,0.5)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Processing...</span>
        </div>
      )}
    </div>
  );
}