import React, { useState, useEffect } from 'react';
import { JellyfinCredentials } from '../types';
import { loginToJellyfin } from '../services/jellyfinService';
import { Server, User, Lock, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';

interface LoginFormProps {
  onLogin: (creds: JellyfinCredentials) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMixedContentRisk, setIsMixedContentRisk] = useState(false);

  useEffect(() => {
    // Check for Mixed Content Risk: App is HTTPS, Target is HTTP
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
      setIsMixedContentRisk(true);
    } else {
      setIsMixedContentRisk(false);
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const creds = await loginToJellyfin(url, username, password);
      onLogin({
        serverUrl: creds.serverUrl,
        username: creds.username,
        accessToken: creds.accessToken,
        userId: creds.userId
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-600 p-3 rounded-full shadow-lg shadow-purple-900/50">
              <Server className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">Connect to Jellyfin</h2>
          <p className="text-center text-gray-400 mb-8">Scan your library for duplicate movies</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Server URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Server className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="url"
                  required
                  placeholder="http://192.168.1.10:8096"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 transition ${isMixedContentRisk ? 'border-yellow-600 focus:border-yellow-500' : 'border-gray-600 focus:border-transparent'}`}
                />
              </div>
              {isMixedContentRisk && (
                <div className="mt-2 flex items-start gap-2 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Warning: Connecting to an <b>HTTP</b> server from this <b>HTTPS</b> page may be blocked by your browser (Mixed Content). 
                    <br/><span className="opacity-75">Try using an HTTPS URL for your server or run this app locally.</span>
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  placeholder="Leave empty if none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};