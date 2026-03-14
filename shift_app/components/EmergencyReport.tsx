'use client';
import { useState } from 'react';
import { api } from '@/lib/gas';

type Staff = { id: string; name: string; section: string; role: string };
interface Props { staffList: Staff[]; onSent: (m: string) => void; onError: (m: string) => void; }

const INCIDENT_TYPES = [
  { id: 'injury',   icon: '🩹', label: 'ケガ・体調不良' },
  { id: 'trouble',  icon: '⚠️', label: 'トラブル・揉め事' },
  { id: 'lost',     icon: '🔍', label: '迷子・行方不明' },
  { id: 'facility', icon: '🏚️', label: '設備・施設の問題' },
  { id: 'other',    icon: '📋', label: 'その他' },
];

export default function EmergencyReport({ staffList, onSent, onError }: Props) {
  const [reporter, setReporter] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType]         = useState('');
  const [detail, setDetail]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);

  const selectedType = INCIDENT_TYPES.find(t => t.id === type);

  async function handleSend() {
    if (!reporter) { onError('報告者を選択してください'); return; }
    if (!type)     { onError('種別を選択してください'); return; }
    if (!detail.trim()) { onError('詳細を入力してください'); return; }
    setLoading(true);
    try {
      const reporterName = staffList.find(s => s.id === reporter)?.name || reporter;
      const message = [`🚨 **緊急報告**`, `報告者: ${reporterName}`, location ? `📍 ${location}` : '', `種別: ${selectedType?.icon} ${selectedType?.label}`, `詳細: ${detail.trim()}`].filter(Boolean).join('\n');
      const r = await api.sendNotification('role', ['本部', 'リーダー'], message, '🚨 緊急報告', true);
      if (r.ok) {
        setSent(true);
        onSent('🚨 緊急報告を送信しました');
        setTimeout(() => { setSent(false); setReporter(''); setLocation(''); setType(''); setDetail(''); }, 5000);
      } else { onError(r.message || '送信に失敗しました'); }
    } catch { onError('通信エラーが発生しました'); }
    setLoading(false);
  }

  if (sent) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '4rem' }}>✅</div>
      <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#16a34a' }}>緊急報告を送信しました</div>
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>管理者・リーダーに通知されました</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem' }}>🚨</span>
        <div>
          <div style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '0.875rem' }}>緊急報告フォーム</div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>送信すると管理者・リーダー全員に即時通知されます</div>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>報告者 <span style={{ color: '#ef4444' }}>*</span></label>
        <select className="select" value={reporter} onChange={e => setReporter(e.target.value)}>
          <option value="">-- 自分の名前を選択 --</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>発生場所</label>
        <input className="input" placeholder="例: 体育館入口・食品ブースA" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>種別 <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {INCIDENT_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', borderRadius: '0.75rem', border: '2px solid', borderColor: type === t.id ? '#f87171' : '#e2e8f0', background: type === t.id ? '#fef2f2' : 'white', color: type === t.id ? '#b91c1c' : '#475569', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '1.125rem' }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>詳細 <span style={{ color: '#ef4444' }}>*</span></label>
        <textarea className="input" rows={4} style={{ resize: 'none' }} placeholder="状況を具体的に入力してください..." value={detail} onChange={e => setDetail(e.target.value)} />
      </div>

      <button className="btn btn-danger" style={{ fontSize: '1rem', padding: '1rem' }} onClick={handleSend} disabled={loading || !reporter || !type || !detail.trim()}>
        {loading ? '送信中...' : '🚨 緊急報告を送信する'}
      </button>
    </div>
  );
}
