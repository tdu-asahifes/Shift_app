'use client';
import { useState, useEffect, useCallback } from 'react';
import { LocationAttendance, adminApi } from '@/lib/adminApi';
import { RefreshCw, Users } from 'lucide-react';

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  working: { bg: '#dcfce7', color: '#166534', label: '出勤中' },
  left: { bg: '#e8f5e9', color: '#388e3c', label: '退勤済' },
  not_yet: { bg: '#f1f5f9', color: '#64748b', label: '未出勤' },
};

export default function AttendanceDashboard() {
  const today = new Date().toLocaleDateString('sv-SE');
  const [date, setDate] = useState(today);
  const [data, setData] = useState<LocationAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.getAttendanceDashboard(date));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'データ取得に失敗');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const totalSummary = data.reduce(
    (acc, loc) => ({
      working: acc.working + loc.summary.working,
      left: acc.left + loc.summary.left,
      notYet: acc.notYet + loc.summary.notYet,
      total: acc.total + loc.summary.total,
    }),
    { working: 0, left: 0, notYet: 0, total: 0 }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* コントロール */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn" onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> 更新
        </button>
      </div>

      {/* サマリーカード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem' }}>
        {[
          { label: '合計', value: totalSummary.total, color: '#374151' },
          { label: '出勤中', value: totalSummary.working, color: '#166534' },
          { label: '退勤済', value: totalSummary.left, color: '#388e3c' },
          { label: '未出勤', value: totalSummary.notYet, color: '#64748b' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 場所別カード */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          この日のシフトデータがありません
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1rem' }}>
          {data.map(loc => (
            <div key={loc.locationId} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>{loc.locationName}</h3>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  <Users size={14} />
                  {loc.summary.working}/{loc.summary.total}
                </span>
              </div>
              {/* プログレスバー */}
              <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', marginBottom: '0.75rem', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: loc.summary.total > 0 ? `${((loc.summary.working + loc.summary.left) / loc.summary.total) * 100}%` : '0%',
                  background: '#16a34a',
                  borderRadius: '2px',
                }} />
              </div>
              {/* メンバーリスト */}
              {loc.members.map((m, i) => {
                const sc = statusColors[m.status];
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.375rem 0',
                    borderBottom: i < loc.members.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: '0.8rem',
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <span style={{ color: '#9ca3af', marginLeft: '0.5rem' }}>{m.shiftTime}</span>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      background: sc.bg,
                      color: sc.color,
                    }}>
                      {sc.label}{m.checkInAt ? ` ${m.checkInAt}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
