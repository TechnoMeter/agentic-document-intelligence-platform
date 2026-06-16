
import { useChatStore } from '@/store/chatStore';
import { Loader2 } from 'lucide-react';

export function ThoughtStream() {
  const thoughts = useChatStore((state) => state.thoughts);
  const isLoading = useChatStore((state) => state.isLoading);

  if (thoughts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center space-y-4">
        <div className="p-3 bg-slate-100 rounded-full">
          <Loader2 className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm">Agent is standing by.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {thoughts.map((thought, idx) => (
        <div 
          key={idx} 
          className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-600 shadow-sm animate-in slide-in-from-right-4 fade-in duration-300"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold text-xs text-slate-500 uppercase tracking-wider">System Step</span>
          </div>
          <p className="leading-relaxed">{thought}</p>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-medium uppercase tracking-wider">Processing...</span>
        </div>
      )}
    </div>
  );
}