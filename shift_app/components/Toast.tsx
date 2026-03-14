'use client';
import { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info' | '';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const colors: Record<string, string> = {
    success: '#16a34a',
    error:   '#dc2626',
    info:    '#2563eb',
  };
  const icons: Record<string, string> = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      background: colors[type] || '#334155', color: 'white',
      padding: '0.75rem 1.25rem', borderRadius: '1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      fontSize: '0.875rem', fontWeight: '500',
      zIndex: 100, whiteSpace: 'nowrap', maxWidth: '90vw',
      animation: 'slideUp 0.2s ease',
    }}>
      <span>{icons[type] || '💬'}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(1rem); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
