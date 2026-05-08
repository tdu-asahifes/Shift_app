'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/gas';
import { getToday } from '@/lib/session';
import { LoginUser, Shift, AttendanceRecord } from '@/lib/types';
import { X, MapPin, Clock } from 'lucide-react';

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
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const today = getToday();

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
      {/* 縦タイムライン */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
          タイムライン
        </h3>

        <div style={{ position: 'relative', paddingLeft: '3rem' }}>
          {/* 時間目盛り（縦） */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            const top = (i / TOTAL_HOURS) * 100;
            return (
              <div key={i} style={{
                position: 'absolute', left: 0, top: `${top}%`,
                width: '2.5rem', textAlign: 'right',
                fontSize: '0.7rem', color: '#64748b', fontWeight: 500,
                transform: 'translateY(-50%)',
              }}>
                {HOUR_START + i}:00
              </div>
            );
          })}

          {/* 縦の基準線 */}
          <div style={{
            position: 'absolute', left: '3rem', top: 0, bottom: 0,
            width: '1px', background: '#d1d5db',
          }} />

          {/* 時間横線 */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            const top = (i / TOTAL_HOURS) * 100;
            return (
              <div key={`line-${i}`} style={{
                position: 'absolute', left: '2.75rem', right: 0,
                top: `${top}%`, height: '1px',
                background: i === 0 || i === TOTAL_HOURS ? '#9ca3af' : '#e5e7eb',
              }} />
            );
          })}

          {/* シフトバー（縦） */}
          <div style={{ position: 'relative', minHeight: `${TOTAL_HOURS * 3}rem`, marginLeft: '0.5rem' }}>
            {shifts.map((shift, i) => {
              const startMin = timeToMinutes(shift.startTime);
              const endMin = timeToMinutes(shift.endTime);
              const top = ((startMin - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;
              const height = ((endMin - startMin) / (TOTAL_HOURS * 60)) * 100;
              const status = getShiftStatus(shift, attendance);
              const color = statusColors[status];

              return (
                <div
                  key={i}
                  onClick={() => setSelectedShift(shift)}
                  style={{
                    position: 'absolute',
                    top: `${top}%`,
                    left: 0,
                    right: 0,
                    height: `${height}%`,
                    backgroundColor: color.bar,
                    borderRadius: '0.375rem',
                    padding: '0.25rem 0.375rem',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: status === 'not_yet' ? '#374151' : '#fff',
                    lineHeight: 1.2,
                  }}>
                    {shift.locationName}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    color: status === 'not_yet' ? '#6b7280' : 'rgba(255,255,255,0.85)',
                    marginTop: '0.125rem',
                  }}>
                    {shift.time}
                  </span>
                </div>
              );
            })}

            {/* 現在時刻線 */}
            {nowPercent >= 0 && nowPercent <= 100 && (
              <div style={{
                position: 'absolute',
                top: `${nowPercent}%`,
                left: '-0.5rem',
                right: 0,
                height: '2px',
                borderTop: '2px dashed #dc2626',
                pointerEvents: 'none',
                zIndex: 5,
              }}>
                <span style={{
                  position: 'absolute', left: '-3rem', top: '-0.5rem',
                  fontSize: '0.6rem', color: '#dc2626', fontWeight: 700,
                }}>
                  {`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`}
                </span>
              </div>
            )}
          </div>
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
              onClick={() => setSelectedShift(shift)}
              style={{
                cursor: 'pointer',
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

      {/* ポップアップ */}
      {selectedShift && (
        <div
          onClick={() => setSelectedShift(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '1rem', padding: '1.5rem',
              width: '100%', maxWidth: '20rem', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>シフト詳細</h3>
              <button onClick={() => setSelectedShift(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            {(() => {
              const status = getShiftStatus(selectedShift, attendance);
              const color = statusColors[status];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* 出勤状態 */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', padding: '0.25rem 1rem', borderRadius: '9999px',
                      fontSize: '0.875rem', fontWeight: 600,
                      background: color.badge, color: color.text,
                    }}>
                      {color.label}
                    </span>
                  </div>

                  {/* 場所 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} style={{ color: '#6b7280', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>担当場所</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedShift.locationName}</div>
                    </div>
                  </div>

                  {/* 時間 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} style={{ color: '#6b7280', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>時間</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedShift.time}</div>
                    </div>
                  </div>

                  {/* 連絡事項 */}
                  {selectedShift.notice && (
                    <div style={{
                      background: '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem',
                      fontSize: '0.875rem', color: '#1d4ed8',
                    }}>
                      {selectedShift.notice}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
