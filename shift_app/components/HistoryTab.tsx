'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/gas';
import { getToday } from '@/lib/session';
import { LoginUser, AttendanceRecord } from '@/lib/types';

interface Props {
  user: LoginUser;
}

export default function HistoryTab({ user }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getToday();

  const load = useCallback(async () => {
    try {
      const data = await api.getMyAttendance(user.studentId, today);
      setRecords(data.sort((a, b) => b.checkInAt.localeCompare(a.checkInAt)));
    } catch {}
    setLoading(false);
  }, [user.studentId, today]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>読み込み中...</div>;
  }

  if (records.length === 0) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>本日の打刻履歴はありません</p>
      </div>
    );
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {records.map((rec, i) => {
          // 次のレコード（時系列で次の出勤）が移動先
          const nextRec = i > 0 ? records[i - 1] : null;

          return (
            <div key={rec.id} className="card" style={{ padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: '600' }}>{rec.locationName}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    出勤 {formatTime(rec.checkInAt)}
                    {rec.checkOutAt && (
                      <> → 退勤 {formatTime(rec.checkOutAt)}</>
                    )}
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '0.125rem 0.625rem', borderRadius: '9999px',
                  fontSize: '0.75rem', fontWeight: '600',
                  ...(rec.checkOutAt
                    ? { backgroundColor: '#e8f5e9', color: '#388e3c' }
                    : { backgroundColor: '#dcfce7', color: '#166534' }
                  ),
                }}>
                  {rec.checkOutAt ? '退勤済' : '出勤中'}
                </span>
              </div>
              {rec.checkOutAt && nextRec && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  → {nextRec.locationName} へ移動
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
