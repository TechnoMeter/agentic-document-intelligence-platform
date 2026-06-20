import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Database, Shield, Clock } from 'lucide-react';

async function hashCredentials(username: string, password: string): Promise<string> {
  const combined = username + password;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const setSessionId = useChatStore((state) => state.setSessionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Both fields are required.');
      return;
    }
    if (username.trim().length < 3 || password.trim().length < 3) {
      setError('Username and password must be at least 3 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const sessionId = await hashCredentials(username.trim(), password.trim());
      setSessionId(sessionId);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#003B5C] via-[#051B2C] to-[#000000] p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] p-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-300 to-blue-600 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_0_25px_rgba(59,130,246,0.6)] border border-white/40">
            <Database className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ShriRAGx</h1>
          <p className="text-sm text-blue-100/70">Secure document intelligence platform</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Enter your username (min 3 chars)"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              placeholder="Enter your password (min 3 chars)"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),_0_0_20px_rgba(59,130,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-blue-200/50 border-t border-white/10 pt-4">
          <Clock className="w-4 h-4" />
          <span>All data and chats are automatically wiped after 24 hours.</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-blue-200/50 mt-1">
          <Shield className="w-4 h-4" />
          <span>Credentials are hashed locally; never sent in plain text.</span>
        </div>
      </div>
    </div>
  );
}