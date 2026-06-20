import React, { useState } from 'react';
import { Database, Shield, Clock, Info, Eye, EyeOff, Loader2 } from 'lucide-react';

// Mocking the chat store so the component compiles successfully in a standalone preview environment.
// In your actual app, you can replace this with: import { useChatStore } from '@/store/chatStore';
const useChatStore = (selector: any) => {
  return selector({
    setSessionId: (id: string) => console.log('Mock Session ID set:', id)
  });
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState('');
  const setSessionId = useChatStore((state: any) => state.setSessionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Both fields are required.');
      return;
    }
    if (username.trim().length < 3 || password.trim().length < 3) {
      setError('Workspace ID and Access Key must be at least 3 characters.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Step 1: Hashing state
      setLoadingStatus('Hashing credentials locally...');
      const sessionIdPromise = hashCredentials(username.trim(), password.trim());
      await new Promise(resolve => setTimeout(resolve, 700)); // Artificial delay for UX
      
      // Step 2: Provisioning & Network Check
      setLoadingStatus('Allocating secure sandbox...');
      
      // Ping the backend to ensure it's online before letting the user in
      try {
        // We ping a common FastAPI endpoint. 
        // Even if it returns 404 Not Found, the server is UP. 
        // If it returns 5xx (Gateway timeout) or fails entirely, the server is DOWN.
        const res = await fetch('/api/docs', { method: 'HEAD' });
        if (!res.ok && res.status >= 500) {
          throw new Error('Server returned a Gateway Error.');
        }
      } catch (networkError) {
        throw new Error('Backend server is offline or unreachable. Please check your connection.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 400)); // Artificial delay for UX
      
      // Step 3: Finalizing
      setLoadingStatus('Finalizing workspace...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Artificial delay for UX

      const sessionId = await sessionIdPromise;
      setSessionId(sessionId);
      
      // Clear form and stop loading on success
      setUsername('');
      setPassword('');
      setIsLoading(false); // Prevents infinite spinning if routing doesn't immediately unmount the component
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during session creation. Please try again.');
      }
      setIsLoading(false); // Stop the spinner so the error is visible
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
          <p className="text-sm text-blue-100/70">Secure, ephemeral document intelligence</p>
        </div>

        <div className="mt-6 p-4 bg-blue-900/40 border border-blue-400/30 rounded-xl flex items-start gap-3 text-sm text-blue-100/90 shadow-inner">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-semibold text-white mb-1">No registration required.</p>
            <p>Simply choose a unique username and password. This acts as your private key for a temporary 24-hour workspace.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 mb-4 py-8 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin relative z-10" />
            </div>
            <p className="text-blue-100 font-medium tracking-wide animate-pulse text-center">
              {loadingStatus}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 animate-in fade-in duration-300">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider mb-1">
                Workspace ID (Username)
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                placeholder="Create any username (min 3 chars)"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider mb-1">
                Access Key (Password)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-4 pr-12 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  placeholder="Create any password (min 3 chars)"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/50 hover:text-blue-200 transition-colors focus:outline-none focus:text-blue-200"
                  aria-label={showPassword ? "Mask access key" : "Reveal access key"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-2 text-center animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),_0_0_20px_rgba(59,130,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Session
            </button>
          </form>
        )}

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

export default function App() {
  return <Login />;
}