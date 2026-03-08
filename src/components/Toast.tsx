'use client';
import { useEffect } from 'react';

type ToastProps = { message: string; type: 'success' | 'error' | 'info' | ''; onClose: () => void };

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const styles = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-slate-700', '': 'bg-slate-700' };
  const icons  = { success: '✅', error: '❌', info: 'ℹ️', '': '' };

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl flex items-center gap-2 max-w-xs ${styles[type]}`}>
      <span>{icons[type]}</span><span>{message}</span>
    </div>
  );
}
