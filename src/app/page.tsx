'use client';
import { useState, useEffect } from 'react';
import LoginPage, { LoginUser } from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [user, setUser] = useState<LoginUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('auth');
    const stored = sessionStorage.getItem('user');
    if (auth === '1' && stored) {
      try { setUser(JSON.parse(stored)); } catch { }
    }
    setReady(true);
  }, []);

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-bounce">🏫</div>
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    </div>
  );

  return user
    ? <Dashboard
      currentUser={user}
      onLogout={() => {
        sessionStorage.removeItem('auth');
        sessionStorage.removeItem('user');
        setUser(null);
      }}
    />
    : <LoginPage onLogin={u => setUser(u)} />;
}