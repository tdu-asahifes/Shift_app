'use client';
import { useState, useEffect } from 'react';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem('auth') === '1');
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

  return authed
    ? <Dashboard onLogout={() => { sessionStorage.removeItem('auth'); setAuthed(false); }} />
    : <LoginPage onLogin={() => setAuthed(true)} />;
}
