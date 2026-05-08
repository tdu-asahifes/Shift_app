'use client';
import { useState, useEffect, useCallback } from 'react';
import { LocationAttendance, adminApi } from '@/lib/adminApi';
import { RefreshCw, Users, AlertTriangle } from 'lucide-react';

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

  // カテゴリ別にグルーピング
  const categoryMap = new Map<string, LocationAttendance[]>();
  for (const loc of data) {
    const cat = loc.category || '未分類';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(loc);
  }
  const categories = Array.from(categoryMap.entries());

  // 全体サマリー
  const totalSummary = data.reduce(
    (acc, loc) => ({
      working: acc.working + loc.summary.working,
      left: acc.left + loc.summary.left,
      notYet: acc.notYet + loc.summary.notYet,
      total: acc.total + loc.summary.total,
    }),
    { working: 0, left: 0, notYet: 0, total: 0 }
  );

  const totalShortage = data.reduce((acc, loc) => {
    const shortage = loc.summary.total - loc.summary.working - loc.summary.left;
    return acc + Math.max(0, shortage);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* コントロール */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn" onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={16} /> 更新
        </button>
      </div>

      {/* 全体サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))', gap: '0.5rem' }}>
        {[
          { label: '合計', value: totalSummary.total, color: '#374151' },
          { label: '出勤中', value: totalSummary.working, color: '#166534' },
          { label: '退勤済', value: totalSummary.left, color: '#388e3c' },
          { label: '未出勤', value: totalSummary.notYet, color: '#64748b' },
          { label: '不足', value: totalShortage, color: totalShortage > 0 ? '#dc2626' : '#16a34a' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{item.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          この日のシフトデータがありません
        </div>
      ) : (
        /* カテゴリ別セクション */
        categories.map(([catName, locs]) => {
          const catShortage = locs.reduce((acc, loc) => {
            return acc + Math.max(0, loc.summary.total - loc.summary.working - loc.summary.left);
          }, 0);

          return (
            <div key={catName}>
              {/* カテゴリヘッダー */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.5rem', paddingBottom: '0.25rem',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>{catName}</h3>
                {catShortage > 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '0.125rem',
                    fontSize: '0.7rem', color: '#dc2626', fontWeight: 600,
                  }}>
                    <AlertTriangle size={12} /> 不足 {catShortage}人
                  </span>
                )}
              </div>

              {/* 場所カード */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                {locs.map(loc => {
                  const shortage = Math.max(0, loc.summary.total - loc.summary.working - loc.summary.left);
                  return (
                    <div key={loc.locationId} className="card" style={{
                      padding: '0.75rem',
                      borderLeft: shortage > 0 ? '3px solid #dc2626' : '3px solid #16a34a',
                    }}>
                      {/* 場所名 + 不足数 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0 }}>{loc.locationName}</h4>
                        {shortage > 0 ? (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                            background: '#fef2f2', padding: '0.125rem 0.375rem', borderRadius: '4px',
                          }}>
                            不足:{shortage}人
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.7rem', color: '#16a34a',
                            background: '#f0fdf4', padding: '0.125rem 0.375rem', borderRadius: '4px',
                          }}>
                            充足
                          </span>
                        )}
                      </div>

                      {/* 人数バー */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.375rem',
                      }}>
                        <Users size={12} />
                        <span>{loc.summary.working}/{loc.summary.total}</span>
                        <div style={{
                          flex: 1, height: '4px', background: '#e5e7eb',
                          borderRadius: '2px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            width: loc.summary.total > 0 ? `${((loc.summary.working + loc.summary.left) / loc.summary.total) * 100}%` : '0%',
                            background: '#16a34a',
                          }} />
                        </div>
                      </div>

                      {/* メンバーリスト */}
                      {loc.members.map((m, i) => {
                        const sc = statusColors[m.status];
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.2rem 0',
                            borderBottom: i < loc.members.length - 1 ? '1px solid #f3f4f6' : 'none',
                            fontSize: '0.7rem',
                          }}>
                            <div>
                              <span style={{ fontWeight: 500 }}>{m.name}</span>
                              <span style={{ color: '#9ca3af', marginLeft: '0.375rem' }}>{m.shiftTime}</span>
                            </div>
                            <span style={{
                              padding: '0.0625rem 0.375rem', borderRadius: '9999px',
                              fontSize: '0.6rem', background: sc.bg, color: sc.color,
                            }}>
                              {sc.label}{m.checkInAt ? ` ${m.checkInAt}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
