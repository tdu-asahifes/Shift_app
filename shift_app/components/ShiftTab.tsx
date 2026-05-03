'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/gas';
import { LoginUser, Shift, AttendanceRecord } from '@/lib/types';

interface Props {
  user: LoginUser;
}

const HOUR_START = 8;
const HOUR_END = 19;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getShiftStatus(shift: Shift, attendance: AttendanceRecord[]): 'working' | 'left' | 'not_yet' {
  const rec = attendance.find(a => a.locationId === shift.locationId);
  if (!rec) return 'not_yet';
  if (rec.checkOutAt) return 'left';
  return 'working';
}

const statusColors = {
  working: { bar: '#16a34a', badge: '#dcfce7', text: '#166534', label: '出勤中' },
  left: { bar: '#86efac', badge: '#e8f5e9', text: '#388e3c', label: '退勤済' },
  not_yet: { bar: '#e2e8f0', badge: '#f1f5f9', text: '#64748b', label: '未出勤' },
};

export default function ShiftTab({ user }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api.getMyShifts(user.studentId, today),
        api.getMyAttendance(user.studentId, today),
      ]);
      setShifts(s.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setAttendance(a);
    } catch {}
    setLoading(false);
  }, [user.studentId, today]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>読み込み中...</div>;
  }

  if (shifts.length === 0) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>本日のシフトはありません</p>
      </div>
    );
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPercent = ((nowMin - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;

  return (
    <div style={{ padding: '1rem' }}>
      {/* タイムライン */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
          タイムライン
        </h3>

        {/* 時間目盛り */}
        <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <span key={i} style={{ fontSize: '0.625rem', color: '#94a3b8', width: 0, textAlign: 'center' }}>
                {HOUR_START + i}
              </span>
            ))}
          </div>
        </div>

        {/* バー */}
        <div style={{ position: 'relative' }}>
          {shifts.map((shift, i) => {
            const startMin = timeToMinutes(shift.startTime);
            const endMin = timeToMinutes(shift.endTime);
            const left = ((startMin - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;
            const width = ((endMin - startMin) / (TOTAL_HOURS * 60)) * 100;
            const status = getShiftStatus(shift, attendance);
            const color = statusColors[status];

            return (
              <div key={i} style={{ position: 'relative', height: '2rem', marginBottom: '0.25rem' }}>
                <div style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  height: '100%',
                  backgroundColor: color.bar,
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    fontSize: '0.625rem',
                    color: status === 'not_yet' ? '#64748b' : 'white',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {shift.locationName}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 現在時刻線 */}
          {nowPercent >= 0 && nowPercent <= 100 && (
            <div style={{
              position: 'absolute',
              left: `${nowPercent}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              borderLeft: '2px dashed #dc2626',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>

      {/* シフトカードリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {shifts.map((shift, i) => {
          const status = getShiftStatus(shift, attendance);
          const color = statusColors[status];
          const isActive = status === 'working';

          return (
            <div
              key={i}
              className="card"
              style={{
                borderLeft: `4px solid ${color.bar}`,
                ...(isActive ? { boxShadow: `0 0 0 2px ${color.bar}` } : {}),
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '1rem' }}>{shift.locationName}</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {shift.time}
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '0.125rem 0.625rem', borderRadius: '9999px',
                  fontSize: '0.75rem', fontWeight: '600',
                  backgroundColor: color.badge, color: color.text,
                }}>
                  {color.label}
                </span>
              </div>
              {shift.notice && (
                <p style={{
                  fontSize: '0.875rem', color: '#1d4ed8',
                  background: '#eff6ff', padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem', marginTop: '0.75rem',
                }}>
                  {shift.notice}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
