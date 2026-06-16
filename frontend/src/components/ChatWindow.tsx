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

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick-Action Prompt Handler
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
    <div className="flex flex-col h-full bg-white relative">
      <ScrollArea className="flex-1 p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
              <Bot className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700">Agentic Document Intelligence</h2>
            <p className="text-sm text-center max-w-sm">Ask a question about your uploaded documents or query the system metadata.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "flex gap-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                  msg.role === 'user' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={clsx(
                  "px-5 py-4 rounded-2xl max-w-[80%] shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm",
                  msg.isError && "bg-red-50 border-red-200 text-red-700"
                )}>
                  <div className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-50">
                    {msg.isStreaming ? (
                      <div className="flex items-center gap-1">
                        {msg.content}
                        <span className="w-2 h-4 bg-slate-400 animate-pulse inline-block align-middle ml-1" />
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

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-10">
        <div className="max-w-4xl mx-auto flex gap-2 items-center bg-white border border-slate-200 p-2 rounded-full shadow-md focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query documents or metadata..."
            className="flex-1 border-0 focus-visible:ring-0 shadow-none h-12 px-4 text-base bg-transparent"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}