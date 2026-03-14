'use client';
import { useState, useEffect } from 'react';
import LoginPage, { LoginUser } from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [user, setUser]   = useState<LoginUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth   = sessionStorage.getItem('auth');
    const stored = sessionStorage.getItem('user');
    if (auth === '1' && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setReady(true);
  }, []);

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🏫</div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>読み込み中...</p>
      </div>
    </div>
  );

  return user
    ? <Dashboard currentUser={user} onLogout={() => {
        sessionStorage.removeItem('auth');
        sessionStorage.removeItem('user');
        setUser(null);
      }} />
    : <LoginPage onLogin={u => setUser(u)} />;
}
