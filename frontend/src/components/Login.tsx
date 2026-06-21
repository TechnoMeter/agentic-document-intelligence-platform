import React, { useState, useEffect } from 'react';
import { Database, Shield, Clock, Info, Eye, EyeOff, Loader2, User, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { getProfiles, addProfile, removeProfile, Profile } from '@/lib/utils';

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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const setSession = useChatStore((state) => state.setSession);

  // Load profiles on mount
  useEffect(() => {
    setProfiles(getProfiles());
  }, []);

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
      setLoadingStatus('Hashing credentials locally...');
      const sessionIdPromise = hashCredentials(username.trim(), password.trim());
      await new Promise(resolve => setTimeout(resolve, 700));

      setLoadingStatus('Allocating secure sandbox...');
      const res = await fetch('/api/docs', { method: 'HEAD' });
      if (!res.ok && res.status >= 500) {
        throw new Error('Server returned a Gateway Error.');
      }
      await new Promise(resolve => setTimeout(resolve, 400));

      setLoadingStatus('Finalizing workspace...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const sessionId = await sessionIdPromise;

      addProfile({ username: username.trim(), sessionId });
      setProfiles(getProfiles());

      setSession(username.trim(), sessionId);

      setUsername('');
      setPassword('');
      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred during session creation. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSession(profile.username, profile.sessionId);
  };

  const handleRemoveProfile = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent triggering the profile click
    removeProfile(sessionId);
    setProfiles(getProfiles()); // Refresh the list
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#003B5C] via-[#051B2C] to-[#000000] p-4 py-12">
      
      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_15px_40px_rgba(0,0,0,0.5)] p-5 sm:p-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col items-center text-center">
          {/* Glassmorphic Hero Icon */}
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative overflow-hidden mb-5">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <Database className="w-10 h-10 text-blue-50 drop-shadow-md relative z-10" />
          </div>
          
          {/* Glassmorphic Gradient Text */}
          <h1 className="font-['Caveat',_cursive] font-medium text-[72px] leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 pb-2 drop-shadow-sm">
            ShriRAGx
          </h1>
          
          <div className="text-center text-blue-100/70 mt-3">
            <p className="text-sm font-medium tracking-wide">Upload your files. Ask anything. Get clear answers – instantly.</p>
            <p className="text-xs text-blue-100/50 mt-1.5">Just your documents and our AI. It's that easy.</p>
          </div>
        </div>

        {profiles.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-medium text-blue-200/60 uppercase tracking-wider text-center mb-3">
              Return to your session
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {profiles.map((profile) => (
                <div key={profile.sessionId} className="relative group">
                  <button
                    onClick={() => handleProfileClick(profile)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium text-white transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]"
                  >
                    <User className="w-5 h-5" />
                    {profile.username}
                  </button>
                  {/* Remove (X) button */}
                  <button
                    onClick={(e) => handleRemoveProfile(e, profile.sessionId)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    aria-label="Remove session"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <hr className="border-white/10 my-6" />
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-900/40 border border-blue-400/30 rounded-xl flex items-start gap-3 text-sm text-blue-100/90 shadow-inner">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-semibold text-white mb-1">No registration required.</p>
            <p>Simply choose a unique username and password. This acts as your private key for a temporary 24-hour workspace. Chat history, session data, and uploaded files are synchronized across different devices and clients. </p>
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

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-blue-200/50 border-t border-white/10 pt-4">
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