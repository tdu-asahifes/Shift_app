'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/gas';

interface Notification { id: string; title: string; message: string; time: string; read: boolean; }

export default function NotificationCenter() {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const unread = items.filter(i => !i.read).length;

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 60000);
    return () => clearInterval(t);
  }, []);

  async function fetchNotifications() {
    try {
      const r = await api.getNotifications();
      if (r.ok) setItems((r.notifications ?? []).map((n: Omit<Notification, 'read'>) => ({ ...n, read: false })));
    } catch {}
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', position: 'relative', fontSize: '1.25rem' }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#ef4444', color: 'white', borderRadius: '9999px', fontSize: '0.6rem', minWidth: '1rem', height: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', right: 0, top: '2.5rem', width: '20rem', background: 'white', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: '600', fontSize: '0.875rem', color: '#334155' }}>
              通知 {unread > 0 && <span style={{ color: '#ef4444' }}>（{unread}件未読）</span>}
            </div>
            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
              {items.length === 0
                ? <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>通知はありません</div>
                : items.map((n, i) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc', background: n.read ? 'white' : '#eff6ff' }}
                      onClick={() => setItems(prev => prev.map((x, j) => j === i ? { ...x, read: true } : x))}>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155', marginBottom: '0.25rem' }}>{n.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{n.message}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{n.time}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
