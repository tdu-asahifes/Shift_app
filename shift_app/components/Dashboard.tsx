'use client';
import { useState, type ReactNode } from 'react';
import { LoginUser } from '@/lib/types';
import { clearSession, saveLocation } from '@/lib/session';
import { ScanLine, CalendarDays, History, LogOut } from 'lucide-react';
import CheckInTab from './CheckInTab';
import ShiftTab from './ShiftTab';
import HistoryTab from './HistoryTab';
import QrScanner from './QrScanner';

type Tab = 'checkin' | 'shift' | 'history';

const TABS: { id: Tab; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'checkin', label: '打刻', icon: (a) => <ScanLine size={22} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: 'shift', label: 'シフト', icon: (a) => <CalendarDays size={22} strokeWidth={a ? 2.5 : 1.8} /> },
  { id: 'history', label: '履歴', icon: (a) => <History size={22} strokeWidth={a ? 2.5 : 1.8} /> },
];

interface Props {
  user: LoginUser;
  locationId: string | null;
  onLogout: () => void;
}

export default function Dashboard({ user, locationId: initialLocation, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>(initialLocation ? 'checkin' : 'shift');
  const [locationId, setLocationId] = useState(initialLocation);
  const [scanning, setScanning] = useState(false);

  function handleLogout() {
    clearSession();
    onLogout();
  }

  function handleScan(locId: string) {
    saveLocation(locId);
    setLocationId(locId);
    setScanning(false);
    setTab('checkin');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* QRスキャナー */}
      {scanning && (
        <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}

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
            padding: '0.375rem 0.75rem', fontSize: '0.75rem', color: '#64748b',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem',
          }}
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </header>

      {/* コンテンツ */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '4rem' }}>
        {tab === 'checkin' && (
          <CheckInTab user={user} locationId={locationId} onScanRequest={() => setScanning(true)} />
        )}
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
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '0.5rem 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0.25rem', border: 'none', background: 'none', cursor: 'pointer',
                color: active ? '#2563eb' : '#94a3b8',
                fontWeight: active ? '600' : '400',
                fontSize: '0.625rem',
                transition: 'color 0.15s',
              }}
            >
              {t.icon(active)}
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
