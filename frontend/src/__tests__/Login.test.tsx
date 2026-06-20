import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '@/components/Login';
import { useChatStore } from '@/store/chatStore';

vi.mock('@/store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

describe('Login', () => {
  const mockSetSessionId = vi.fn();

  beforeEach(() => {
    (useChatStore as any).mockReturnValue({
      setSessionId: mockSetSessionId,
    });
    mockSetSessionId.mockClear();
  });

  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument();
  });

  it('shows error if fields are empty', async () => {
    render(<Login />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /start session/i }));

    expect(await screen.findByText(/both fields are required/i)).toBeInTheDocument();
  });

  it('shows error if username < 3 chars', async () => {
    render(<Login />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), 'ab');
    await user.type(screen.getByLabelText(/password/i), '123456');
    await user.click(screen.getByRole('button', { name: /start session/i }));

    expect(await screen.findByText(/must be at least 3 characters/i)).toBeInTheDocument();
  });

  it('shows 24h wipe warning', () => {
    render(<Login />);
    expect(screen.getByText(/automatically wiped after 24 hours/i)).toBeInTheDocument();
  });

  it('shows hashing notice', () => {
    render(<Login />);
    expect(screen.getByText(/never sent in plain text/i)).toBeInTheDocument();
  });
});