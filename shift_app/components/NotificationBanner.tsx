'use client';
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface Props {
  studentId: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBanner({ studentId }: Props) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (localStorage.getItem('push_subscribed') === 'true') return;
    if (Notification.permission === 'granted') {
      // 既に許可済みだが未登録の場合はサイレントに登録
      subscribe();
      return;
    }
    if (Notification.permission === 'denied') return;
    setShow(true);
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subscription: subscription.toJSON() }),
      });

      localStorage.setItem('push_subscribed', 'true');
      setShow(false);
    } catch {
      // 拒否された場合など
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      subscribe();
    } else {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem', margin: '0 1rem 0.5rem', fontSize: '0.8rem',
    }}>
      <Bell size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
      <span style={{ flex: 1, color: '#1e40af' }}>
        通知を有効にするとシフト開始前にお知らせが届きます
      </span>
      <button
        onClick={handleEnable}
        disabled={loading}
        style={{
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem',
          padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '...' : '有効にする'}
      </button>
      <button onClick={() => setShow(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}
