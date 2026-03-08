'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/gas';

type Notification = {
  time: string;
  type: string;
  message: string;
  section: string;
};

const TYPE_STYLE: Record<string, { bg: string; icon: string }> = {
  '出勤':   { bg: 'bg-green-50 border-green-200',  icon: '✅' },
  '退勤':   { bg: 'bg-slate-50 border-slate-200',  icon: '👋' },
  '鍵貸出': { bg: 'bg-yellow-50 border-yellow-200', icon: '🔑' },
  '鍵返却': { bg: 'bg-blue-50 border-blue-200',    icon: '🔒' },
  '緊急':   { bg: 'bg-red-50 border-red-200',      icon: '🚨' },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [lastSeen, setLastSeen] = useState<string>('');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      if (res.ok) {
        setNotifications(res.notifications);
        // 未読カウント（最後に開いた時刻より新しいもの）
        const newCount = res.notifications.filter(
          (n: Notification) => !lastSeen || n.time > lastSeen
        ).length;
        if (!open) setUnread(newCount);
      }
    } catch {}
  }, [lastSeen, open]);

  // 30秒ごとにポーリング
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  function handleOpen() {
    setOpen(true);
    setUnread(0);
    setLastSeen(new Date().toISOString().replace('T', ' ').slice(0, 19));
  }

  function formatTime(timeStr: string) {
    return String(timeStr).slice(11, 16);
  }

  return (
    <div className="relative">
      {/* ベルボタン */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative p-2 rounded-full hover:bg-blue-700 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {open && (
        <>
          {/* オーバーレイ */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* パネル */}
          <div className="absolute right-0 top-12 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-700">🔔 通知センター</span>
              <button
                onClick={fetchNotifications}
                className="text-xs text-primary hover:underline"
              >
                更新
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  通知はありません
                </div>
              ) : (
                notifications.map((n, i) => {
                  const style = TYPE_STYLE[n.type] || { bg: 'bg-white border-slate-100', icon: '📢' };
                  return (
                    <div key={i} className={`px-4 py-3 border-l-4 ${style.bg}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">{formatTime(n.time)}</span>
                            {n.section && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {n.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
