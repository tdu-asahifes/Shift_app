'use client';
import { useState } from 'react';
import { LoginUser } from '@/lib/types';
import { clearSession, getLocation } from '@/lib/session';
import CheckInTab from './CheckInTab';
import ShiftTab from './ShiftTab';
import HistoryTab from './HistoryTab';

type Tab = 'checkin' | 'shift' | 'history';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'checkin', label: '打刻', icon: '✅' },
  { id: 'shift', label: 'シフト', icon: '📋' },
  { id: 'history', label: '履歴', icon: '📜' },
];

interface Props {
  user: LoginUser;
  locationId: string | null;
  onLogout: () => void;
}

export default function Dashboard({ user, locationId, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>(locationId ? 'checkin' : 'shift');

  function handleLogout() {
    clearSession();
    onLogout();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* ヘッダー */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h1 style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b' }}>シフト管理</h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
            padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </header>

      {/* コンテンツ */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '4rem' }}>
        {tab === 'checkin' && <CheckInTab user={user} locationId={locationId} />}
        {tab === 'shift' && <ShiftTab user={user} />}
        {tab === 'history' && <HistoryTab user={user} />}
      </main>

      {/* ボトムナビ */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '0.5rem 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.125rem', border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.id ? '#2563eb' : '#94a3b8',
              fontWeight: tab === t.id ? '600' : '400',
              fontSize: '0.625rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
