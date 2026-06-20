import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';
import { useChatStore } from '@/store/chatStore';

vi.mock('@/store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/components/ChatWindow', () => ({
  ChatWindow: () => <div>ChatWindow</div>,
}));
vi.mock('@/components/DocumentLibrary', () => ({
  DocumentLibrary: () => <div>DocumentLibrary</div>,
}));
vi.mock('@/components/DocumentSidebar', () => ({
  DocumentSidebar: () => <div>DocumentSidebar</div>,
}));
vi.mock('@/components/ThoughtStream', () => ({
  ThoughtStream: () => <div>ThoughtStream</div>,
}));
vi.mock('@/components/Login', () => ({
  Login: () => <div>Login</div>,
}));

describe('App', () => {
  it('renders Login when no sessionId', () => {
    (useChatStore as any).mockReturnValue({
      sessionId: null,
      currentView: 'chat',
      setView: vi.fn(),
      isMobileMenuOpen: false,
      setMobileMenuOpen: vi.fn(),
      setSession: vi.fn(),
    });
    render(<App />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('ChatWindow')).not.toBeInTheDocument();
  });

  it('renders main app when sessionId exists', () => {
    (useChatStore as any).mockReturnValue({
      sessionId: 'test-session',
      username: 'TestUser',
      currentView: 'chat',
      thoughts: [],
      messages: [],
      hasDocuments: false,
      isMobileMenuOpen: false,
      isMobileThoughtsOpen: false,
      setView: vi.fn(),
      setMobileMenuOpen: vi.fn(),
      setMobileThoughtsOpen: vi.fn(),
      logout: vi.fn(),
      setMessages: vi.fn(),
      addMessage: vi.fn(),
      setHasDocuments: vi.fn(),
      setSession: vi.fn(),
    });
    render(<App />);
    expect(screen.getByText('ChatWindow')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.getByText('DocumentSidebar')).toBeInTheDocument();
    expect(screen.getByText('ThoughtStream')).toBeInTheDocument();
  });

  it('switches views when navigation buttons are clicked', async () => {
    const mockSetView = vi.fn();
    (useChatStore as any).mockReturnValue({
      sessionId: 'test-session',
      username: 'TestUser',
      currentView: 'chat',
      thoughts: [],
      messages: [],
      hasDocuments: false,
      isMobileMenuOpen: false,
      isMobileThoughtsOpen: false,
      setView: mockSetView,
      setMobileMenuOpen: vi.fn(),
      setMobileThoughtsOpen: vi.fn(),
      logout: vi.fn(),
      setMessages: vi.fn(),
      addMessage: vi.fn(),
      setHasDocuments: vi.fn(),
      setSession: vi.fn(),
    });
    render(<App />);

    const navButtons = screen.getAllByRole('button');
    const docBtn = navButtons.find(btn => btn.textContent?.includes('Document Library'));
    expect(docBtn).toBeDefined();
    if (docBtn) {
      docBtn.click();
      expect(mockSetView).toHaveBeenCalledWith('documents');
    }
  });
});