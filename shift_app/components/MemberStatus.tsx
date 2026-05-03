'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/gas';
import { MemberStatus as MemberStatusType } from '@/lib/types';

interface Props {
  locationId: string;
  date: string;
}

const statusLabel: Record<MemberStatusType['status'], string> = {
  working: '出勤中',
  left: '退勤済',
  not_yet: '未出勤',
};

const statusColor: Record<MemberStatusType['status'], { bg: string; color: string }> = {
  working: { bg: '#dcfce7', color: '#166534' },
  left: { bg: '#e8f5e9', color: '#388e3c' },
  not_yet: { bg: '#f1f5f9', color: '#64748b' },
};

export default function MemberStatus({ locationId, date }: Props) {
  const [members, setMembers] = useState<MemberStatusType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMemberStatus(locationId, date)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locationId, date]);

  if (loading) return <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>読み込み中...</p>;
  if (members.length === 0) return null;

  return (
    <div>
      <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.75rem' }}>
        このシフトのメンバー
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {members.map((m) => {
          const sc = statusColor[m.status];
          return (
            <div
              key={`${m.studentId}-${m.shiftTime}`}
              className="card"
              style={{ padding: '0.75rem 1rem', opacity: m.status === 'left' ? 0.7 : 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{m.name}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    {m.shiftTime}
                  </span>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '0.125rem 0.625rem', borderRadius: '9999px',
                  fontSize: '0.75rem', fontWeight: '600',
                  backgroundColor: sc.bg, color: sc.color,
                }}>
                  {statusLabel[m.status]}
                  {m.checkInAt && (
                    <span style={{ marginLeft: '0.25rem', fontWeight: '400' }}>
                      {m.checkInAt}
                    </span>
                  )}
                </span>
              </div>
              {m.status === 'not_yet' && m.previousLocation && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  前の勤務: {m.previousLocation} {m.previousTime}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
