'use client';
import { useState, useEffect } from 'react';
import { LoginUser } from '@/lib/types';
import { getSession, getLocation } from '@/lib/session';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [user, setUser] = useState<LoginUser | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setLocationId(getLocation());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={u => setUser(u)} />;
  }

  return (
    <Dashboard
      user={user}
      locationId={locationId}
      onLogout={() => setUser(null)}
    />
  );
}
