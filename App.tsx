import React, { useState } from 'react';
import { JellyfinCredentials } from './types';
import { LoginForm } from './components/LoginForm';
import { Scanner } from './components/Scanner';

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<JellyfinCredentials | null>(null);

  const handleLogin = (creds: JellyfinCredentials) => {
    setCredentials(creds);
  };

  const handleLogout = () => {
    setCredentials(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-purple-500/30">
      {!credentials ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <Scanner creds={credentials} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
