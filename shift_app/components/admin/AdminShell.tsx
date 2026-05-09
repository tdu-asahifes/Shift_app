'use client';
import { useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { clearAdminSession } from '@/lib/adminSession';
import { CalendarDays, Users, MapPin, AlertTriangle, Bell, LogOut } from 'lucide-react';
import ShiftManager from './ShiftManager';
import AttendanceDashboard from './AttendanceDashboard';
import LocationManager from './LocationManager';
import LostLogViewer from './LostLogViewer';
import NotificationSender from './NotificationSender';

type Tab = 'shifts' | 'attendance' | 'locations' | 'notifications' | 'lost-logs';

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'shifts', label: 'シフト管理', icon: <CalendarDays size={18} /> },
  { key: 'attendance', label: '出勤状況', icon: <Users size={18} /> },
  { key: 'locations', label: '場所・コード', icon: <MapPin size={18} /> },
  { key: 'notifications', label: '通知', icon: <Bell size={18} /> },
  { key: 'lost-logs', label: '迷子ログ', icon: <AlertTriangle size={18} /> },
];

interface Props {
  onLogout: () => void;
}

export default function AdminShell({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('shifts');

  const handleLogout = async () => {
    await adminApi.logout();
    clearAdminSession();
    onLogout();
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb' }}>
      {/* ヘッダー */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#d97706' }}>
          管理画面
        </h1>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem',
            color: '#6b7280',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </header>

      {/* タブ */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#d97706' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #d97706' : '2px solid transparent',
              background: 'none',
              border: 'none',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.key ? '#d97706' : 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* コンテンツ */}
      <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '1rem' }}>
        {activeTab === 'shifts' && <ShiftManager />}
        {activeTab === 'attendance' && <AttendanceDashboard />}
        {activeTab === 'locations' && <LocationManager />}
        {activeTab === 'notifications' && <NotificationSender />}
        {activeTab === 'lost-logs' && <LostLogViewer />}
      </main>
    </div>
  );
}
