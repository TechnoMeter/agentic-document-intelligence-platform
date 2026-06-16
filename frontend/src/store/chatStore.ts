import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export type ViewType = 'chat' | 'documents' | 'instructions';

interface ChatState {
  messages: Message[];
  thoughts: string[];
  isLoading: boolean;
  currentView: ViewType;
  pendingPrompt: string | null;
  
  setLoading: (loading: boolean) => void;
  setView: (view: ViewType) => void;
  setPendingPrompt: (prompt: string | null) => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
  updateLastMessageToken: (token: string, isStreaming?: boolean) => void;
  addThought: (thought: string) => void;
  clearThoughts: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  thoughts: [],
  isLoading: false,
  currentView: 'chat',
  pendingPrompt: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setView: (view) => set({ currentView: view }),
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, { ...msg, id: Math.random().toString(36).substring(7) }]
  })),
  
  updateLastMessageToken: (token, isStreaming = true) => set((state) => {
    const nextMessages = [...state.messages];
    const lastMsgIdx = nextMessages.length - 1;
    
    if (lastMsgIdx >= 0 && nextMessages[lastMsgIdx].role === 'assistant') {
      nextMessages[lastMsgIdx] = {
        ...nextMessages[lastMsgIdx],
        content: nextMessages[lastMsgIdx].content + token,
        isStreaming
      };
    }
    return { messages: nextMessages };
  }),

  addThought: (thought) => set((state) => ({
    thoughts: [...state.thoughts, thought]
  })),

  clearThoughts: () => set({ thoughts: [] }),
  clearChat: () => set({ messages: [], thoughts: [] })
}));