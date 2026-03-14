'use client';
import { useState } from 'react';
import { api, TargetMode } from '@/lib/gas';

type Staff = { id: string; name: string; section: string; role: string };
interface Props {
  staffList: Staff[];
  onSent:  (m: string) => void;
  onError: (m: string) => void;
}

export default function NotificationComposer({ staffList, onSent, onError }: Props) {
  const [mode, setMode]       = useState<TargetMode>('all');
  const [targets, setTargets] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);

  const sections = Array.from(new Set(staffList.map(s => s.section))).sort();
  const roles    = Array.from(new Set(staffList.map(s => s.role))).sort();

  async function handleSend() {
    if (!message.trim()) { onError('メッセージを入力してください'); return; }
    if (mode !== 'all' && targets.length === 0) { onError('送信先を選択してください'); return; }
    setLoading(true);
    try {
      const r = await api.sendNotification(mode, targets, message, title || '本部連絡');
      if (r.ok) { onSent('通知を送信しました'); setMessage(''); setTitle(''); setTargets([]); }
      else onError(r.message || '送信に失敗しました');
    } catch { onError('通信エラーが発生しました'); }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>送信先</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {(['all', 'section', 'role', 'individual'] as TargetMode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setTargets([]); }}
              style={{ padding: '0.5rem', borderRadius: '0.75rem', border: '2px solid', borderColor: mode === m ? '#2563eb' : '#e2e8f0', background: mode === m ? '#eff6ff' : 'white', color: mode === m ? '#2563eb' : '#64748b', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
              {m === 'all' ? '全員' : m === 'section' ? '局・部門' : m === 'role' ? '役職' : '個人指定'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'section' && (
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>局・部門を選択</label>
          <select className="select" onChange={e => setTargets([e.target.value])}>
            <option value="">-- 選択 --</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {mode === 'role' && (
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>役職を選択</label>
          <select className="select" onChange={e => setTargets([e.target.value])}>
            <option value="">-- 選択 --</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {mode === 'individual' && (
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>個人を選択</label>
          <select className="select" onChange={e => setTargets([e.target.value])}>
            <option value="">-- 選択 --</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
          </select>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>タイトル（任意）</label>
        <input className="input" placeholder="例: 重要なお知らせ" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>メッセージ</label>
        <textarea className="input" rows={4} style={{ resize: 'none' }} placeholder="メッセージを入力..." value={message} onChange={e => setMessage(e.target.value)} />
      </div>

      <button className="btn btn-primary" onClick={handleSend} disabled={loading}>
        {loading ? '送信中...' : '📢 送信する'}
      </button>
    </div>
  );
}
