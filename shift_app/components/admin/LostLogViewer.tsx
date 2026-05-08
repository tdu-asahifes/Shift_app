'use client';
import { useState, useEffect, useCallback } from 'react';
import { LostLog, adminApi } from '@/lib/adminApi';
import { RefreshCw } from 'lucide-react';

export default function LostLogViewer() {
  const today = new Date().toLocaleDateString('sv-SE');
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<LostLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await adminApi.getLostLogs(date));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'データ取得に失敗');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const fmtTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn" onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={16} /> 更新
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: 'auto' }}>
          {logs.length}件
        </span>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            この日の迷子ログはありません
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>時刻</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>学籍番号</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>スキャンした場所</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{fmtTime(log.scannedAt)}</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{log.studentId}</td>
                    <td style={{ padding: '0.5rem' }}>{log.scannedLocationName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
