import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/store/chatStore';
import { useChatStream } from '@/hooks/useChatStream';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import clsx from 'clsx';

export function ChatWindow() {
  const [input, setInput] = useState('');
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const pendingPrompt = useChatStore((state) => state.pendingPrompt);
  const setPendingPrompt = useChatStore((state) => state.setPendingPrompt);
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

  return (
    <div className="flex flex-col h-full relative z-10">
      <ScrollArea className="flex-1 p-2 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-white/70 space-y-5 px-4">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-full flex items-center justify-center border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),_0_0_40px_rgba(255,255,255,0.1)]">
              <Bot className="w-10 h-10 text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.8)]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight text-center">Agentic Intelligence</h2>
            <p className="text-sm text-center max-w-sm text-blue-100/70 font-medium bg-black/20 p-3 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
              Ask a question about your uploaded documents or query the system metadata.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
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

      {/* Input Area: Aero Floating Pill */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pointer-events-none">
        <div className="max-w-4xl mx-auto flex gap-2 sm:gap-3 items-center bg-white/10 backdrop-blur-3xl border border-white/20 p-2 sm:p-2.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] focus-within:bg-white/20 focus-within:border-blue-400/50 transition-all pointer-events-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query documents or metadata..."
            className="flex-1 border-0 focus-visible:ring-0 shadow-none h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base bg-transparent text-white placeholder:text-white/50 font-medium"
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