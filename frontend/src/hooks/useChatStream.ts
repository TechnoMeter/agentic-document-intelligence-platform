// src/hooks/useChatStream.ts
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';

export function useChatStream() {
  const addMessage = useChatStore((state) => state.addMessage);
  const updateLastMessageToken = useChatStore((state) => state.updateLastMessageToken);
  const addThought = useChatStore((state) => state.addThought);
  const clearThoughts = useChatStore((state) => state.clearThoughts);
  const setLoading = useChatStore((state) => state.setLoading);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    setLoading(true);
    clearThoughts();
    
    addMessage({ role: 'user', content: message });
    addMessage({ role: 'assistant', content: '', isStreaming: true });

    try {
      const response = await api.chatStream(message);

      if (!response.body) throw new Error('Unreadable response body payload.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let chunkBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        chunkBuffer += decoder.decode(value, { stream: true });
        const lines = chunkBuffer.split('\n\n');
        chunkBuffer = lines.pop() || ''; 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonString = line.replace('data: ', '').trim();
            if (!jsonString) continue;
            
            try {
              const eventData = JSON.parse(jsonString);
              
              if (eventData.token) {
                updateLastMessageToken(eventData.token, true);
              } else if (eventData.thought) {
                addThought(eventData.thought);
              } else if (eventData.error) {
                updateLastMessageToken(`\n[Agent Error: ${eventData.error}]`, false);
              } else if (eventData.done) {
                updateLastMessageToken('', false);
              }
            } catch (err) {
              console.error('SSE JSON Line Parse Failure:', err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message === 'Failed to fetch' 
        ? 'CORS or Network Connection Error. The browser blocked the request.' 
        : err.message;
      updateLastMessageToken(`\n[System Error]: ${errorMessage}`, false);
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage };
}