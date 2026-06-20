import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/store/chatStore';
import { useChatStream } from '@/hooks/useChatStream';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Trash2, Paperclip, Sparkles } from 'lucide-react';
import { DocumentSidebar } from '@/components/DocumentSidebar'; 
import { api } from '@/lib/api';
import clsx from 'clsx';

export function ChatWindow() {
  const [input, setInput] = useState('');
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const pendingPrompt = useChatStore((state) => state.pendingPrompt);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);
  const setView = useChatStore((state) => state.setView);
  const sessionId = useChatStore((state) => state.sessionId);
  const hasDocuments = useChatStore((state) => state.hasDocuments); // Determines onboarding UI
  const clearChat = useChatStore((state) => state.clearChat);
  
  const { sendMessage } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (pendingPrompt && !isLoading) {
      sendMessage(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, isLoading, sendMessage, setPendingPrompt]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleClearHistory = async () => {
    if (!sessionId) return;
    if (messages.length === 0) return;

    if (!window.confirm('This will permanently delete your entire chat history for this session. Continue?')) {
      return;
    }

    try {
      await api.clearChatHistory(sessionId);
      clearChat(); 
    } catch (err) {
      console.error('Failed to clear chat history:', err);
      alert('Could not clear history. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/10 backdrop-blur-sm shrink-0">
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Conversation</span>
        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),_0_0_15px_rgba(239,68,68,0.4)] transition-all"
          title="Clear chat history (permanent)"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear Chat History</span>
          <span className="sm:hidden">Clear</span>
        </button>
      </div>

      <ScrollArea className="flex-1 p-2 sm:p-6">
        {messages.length === 0 ? (
          
          /* ===== ONBOARDING EMPTY STATE ===== */
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-white/70 space-y-6 px-4 py-8 max-w-lg mx-auto relative">
            
            {/* Context Awareness Label */}
            {hasDocuments === false && (
              <div className="absolute top-0 animate-bounce bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                <Sparkles className="w-4 h-4" /> Awaiting Knowledge Base
              </div>
            )}

            <div className="w-20 h-20 mt-4 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_0_40px_rgba(255,255,255,0.1)] shrink-0 z-10 relative">
              <Bot className="w-10 h-10 text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.8)]" />
              {hasDocuments === false && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 border-4 border-black rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="text-center space-y-3 w-full relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">Agentic Intelligence</h2>
              <p className="text-sm text-blue-100/70 font-medium bg-black/20 p-3 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
                {hasDocuments 
                  ? "Your files are ready. Ask me anything to begin searching the vectors." 
                  : "I cannot answer questions yet! Upload a document to give me context."}
              </p>
            </div>

            {/* Glowing Dropzone Pedestal (Only prominent when empty) */}
            {hasDocuments === false && (
              <div className="relative w-full max-w-md animate-in zoom-in-95 duration-500 mt-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-[2rem] blur-md opacity-40 animate-pulse"></div>
                <div className="relative bg-black/60 backdrop-blur-3xl rounded-[1.8rem] border border-white/20 shadow-2xl overflow-hidden p-1">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
                  <DocumentSidebar />
                </div>
              </div>
            )}
          </div>

        ) : (
          <div className="space-y-6 pb-32 sm:pb-36">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "flex gap-3 sm:gap-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-[0_5px_15px_rgba(0,0,0,0.3)] border",
                  msg.role === 'user' 
                    ? "bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300/50 text-white" 
                    : "bg-gradient-to-br from-slate-200 to-slate-400 border-white/50 text-slate-900"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" />}
                </div>

                <div className={clsx(
                  "px-4 py-3 sm:px-5 sm:py-4 max-w-[85%] sm:max-w-[80%] shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl border",
                  msg.role === 'user' 
                    ? "bg-white/15 border-white/30 text-white rounded-2xl rounded-tr-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" 
                    : "bg-black/40 border-white/10 text-blue-50/90 rounded-2xl rounded-tl-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
                  msg.isError && "bg-red-900/40 border-red-500/50 text-red-200"
                )}>
                  <div className="prose prose-sm md:prose-base prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:shadow-inner break-words">
                    {msg.isStreaming ? (
                      <div className="flex items-center gap-1">
                        {msg.content}
                        <span className="w-2.5 h-4 sm:h-5 bg-blue-400 animate-pulse inline-block align-middle ml-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.9)] rounded-sm" />
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || ' '}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="absolute bottom-0 left-0 right-0 p-3 pb-5 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pointer-events-none z-20">
        
        {/* ===== GLASSMORPHIC BUBBLES (Only appear if NO documents exist) ===== */}
        {hasDocuments === false && (
          <>
            {/* MOBILE BUBBLE (Points leftward to the paperclip) */}
            <div className="md:hidden absolute -top-12 left-2 flex items-center animate-bounce z-30 pointer-events-auto">
              <div className="relative bg-gradient-to-r from-emerald-500/90 to-emerald-400/90 backdrop-blur-xl border border-white/40 text-white px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(52,211,153,0.5)] text-[11px] font-bold tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-md" />
                Tap to upload first
                <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-emerald-500/90 transform rotate-45 border-b border-r border-white/40" />
              </div>
            </div>

            {/* DESKTOP BUBBLE (Floats above the input) */}
            <div className="hidden md:flex absolute -top-12 left-1/2 -translate-x-1/2 items-center animate-bounce z-30 pointer-events-auto">
              <div className="relative bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 backdrop-blur-xl border border-white/40 text-white px-5 py-2 rounded-3xl shadow-[0_10px_30px_rgba(52,211,153,0.4)] text-xs font-bold tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                No data indexed. Upload a file above! 👆
              </div>
            </div>
          </>
        )}

        <div className={clsx(
          "max-w-4xl mx-auto flex gap-1 sm:gap-3 items-center bg-white/10 backdrop-blur-3xl border p-2 sm:p-2.5 rounded-full transition-all pointer-events-auto",
          hasDocuments === false 
            ? "border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.15)] focus-within:bg-white/15 focus-within:border-emerald-400" 
            : "border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] focus-within:bg-white/20 focus-within:border-blue-400/50"
        )}>
          
          <button
            onClick={() => setView('documents')}
            className={clsx(
              "md:hidden h-10 w-10 flex items-center justify-center shrink-0 rounded-full transition-all relative",
              hasDocuments === false 
                ? "text-white bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse border border-white/40" 
                : "text-white/50 hover:text-white hover:bg-white/10"
            )}
            title="Upload Document"
          >
            <Paperclip className={clsx("w-5 h-5", hasDocuments === false && "drop-shadow-md")} />
            {hasDocuments === false && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-black rounded-full" />
            )}
          </button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={hasDocuments === false ? "Upload a file first to ask questions..." : "Ask about your documents..."}
            className={clsx(
              "flex-1 border-0 focus-visible:ring-0 shadow-none h-10 sm:h-12 px-2 sm:px-5 text-sm sm:text-base bg-transparent font-medium transition-colors",
              hasDocuments === false ? "text-emerald-100 placeholder:text-emerald-200/50" : "text-white placeholder:text-white/50"
            )}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0 bg-gradient-to-b from-blue-400 to-blue-600 border border-blue-300/60 hover:from-blue-300 hover:to-blue-500 transition-colors shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),_0_0_20px_rgba(59,130,246,0.6)] text-white disabled:opacity-30 disabled:shadow-none"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" />
          </Button>
        </div>
      </div>
    </div>
  );
}