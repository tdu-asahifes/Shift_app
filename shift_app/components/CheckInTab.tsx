'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/gas';
import { getToday } from '@/lib/session';
import { LoginUser, Shift } from '@/lib/types';
import MemberStatus from './MemberStatus';

interface Props {
  user: LoginUser;
  locationId: string | null;
}

type CheckInState = 'idle' | 'loading' | 'done' | 'wrong_location' | 'already' | 'error';

export default function CheckInTab({ user, locationId }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [state, setState] = useState<CheckInState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [locationName, setLocationName] = useState('');
  const [checkedInTime, setCheckedInTime] = useState('');
  const today = getToday();

  const loadShifts = useCallback(async () => {
    try {
      const data = await api.getMyShifts(user.studentId, today);
      setShifts(data);

      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      // 現在のシフトと次のシフトを特定
      let cur: Shift | null = null;
      let nxt: Shift | null = null;

      const sorted = [...data].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (const s of sorted) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        if (nowMin >= start && nowMin < end) cur = s;
        if (start > nowMin && !nxt) nxt = s;
      }
      setCurrentShift(cur);
      setNextShift(nxt);

      // 場所名を取得
      if (locationId) {
        const matchShift = data.find(s => s.locationId === locationId);
        if (matchShift) {
          setLocationName(matchShift.locationName);
        } else {
          // 場所一覧から取得
          try {
            const locs = await api.getLocations();
            const loc = locs.find(l => l.locationId === locationId);
            setLocationName(loc?.locationName || locationId);
          } catch {
            setLocationName(locationId);
          }
        }

        // シフト外の場所かチェック
        const isAssigned = data.some(s => s.locationId === locationId);
        if (!isAssigned) {
          setState('wrong_location');
          // 迷子ログ保存
          api.saveLostLog(user.studentId, locationId).catch(() => {});
          return;
        }

        // 既に出勤済みかチェック
        const attendance = await api.getMyAttendance(user.studentId, today);
        const activeHere = attendance.find(
          a => a.locationId === locationId && !a.checkOutAt
        );
        if (activeHere) {
          setCheckedInTime(
            new Date(activeHere.checkInAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          );
          setState('done');
        }
      }
    } catch {
      setErrorMsg('シフトデータの取得に失敗しました');
    }
  }, [user.studentId, locationId, today]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  async function handleCheckIn() {
    if (!locationId) return;
    setState('loading');
    try {
      await api.checkIn(user.studentId, locationId);
      setCheckedInTime(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
      setState('done');
    } catch (e) {
      if (e instanceof Error && e.message.includes('already')) {
        setState('already');
      } else {
        setErrorMsg(e instanceof Error ? e.message : '打刻に失敗しました');
        setState('error');
      }
    }
  }

  // QRコード未読み取り
  if (!locationId) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          QRコードを読み取ってください
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          各担当場所に設置されたQRコードをカメラで読み取ると、打刻ができます
        </p>

        {/* 現在・次のシフト情報 */}
        {(currentShift || nextShift) && (
          <div style={{ marginTop: '2rem', textAlign: 'left' }}>
            {currentShift && (
              <div className="card" style={{ marginBottom: '0.75rem', borderLeft: '4px solid #16a34a' }}>
                <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>現在のシフト</p>
                <p style={{ fontWeight: '600' }}>{currentShift.locationName}</p>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{currentShift.time}</p>
              </div>
            )}
            {nextShift && (
              <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                <p style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>次のシフト</p>
                <p style={{ fontWeight: '600' }}>{nextShift.locationName}</p>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{nextShift.time}</p>
                {(() => {
                  const [h, m] = nextShift.startTime.split(':').map(Number);
                  const now = new Date();
                  const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
                  if (diff > 0) {
                    return (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        あと{Math.floor(diff / 60) > 0 ? `${Math.floor(diff / 60)}時間` : ''}{diff % 60}分
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // シフト外の場所
  if (state === 'wrong_location') {
    const correctShift = currentShift || shifts[0];
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '1.5rem', background: '#fef3c7', borderRadius: '1rem',
          border: '1px solid #fde68a', marginBottom: '1rem',
        }}>
          <p style={{ fontWeight: '600', fontSize: '1rem', color: '#92400e' }}>
            この場所のシフトではありません
          </p>
          {correctShift && (
            <p style={{ color: '#92400e', marginTop: '0.5rem' }}>
              あなたの担当場所は「{correctShift.locationName}」です
            </p>
          )}
        </div>
      </div>
    );
  }

  // 打刻完了
  if (state === 'done' || state === 'already') {
    return (
      <div style={{ padding: '1.5rem 1rem' }}>
        <div style={{
          padding: '1.5rem', background: '#f0fdf4', borderRadius: '1rem',
          border: '1px solid #bbf7d0', textAlign: 'center', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
          <p style={{ fontWeight: '600', fontSize: '1.125rem', color: '#166534' }}>
            {state === 'done' ? '打刻完了' : '打刻済みです'}
          </p>
          <p style={{ color: '#166534', marginTop: '0.5rem' }}>
            {state === 'done' ? `出勤 ${checkedInTime}` : ''}　{locationName}
          </p>
        </div>
        <MemberStatus locationId={locationId} date={today} />
      </div>
    );
  }

  // エラー
  if (state === 'error') {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '1rem', background: '#fef2f2', borderRadius: '1rem',
          border: '1px solid #fee2e2', color: '#dc2626',
        }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  // 打刻画面（メイン）
  return (
    <div style={{ padding: '1rem' }}>
      {/* ヘッダー情報 */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>現在地</p>
            <p style={{ fontWeight: '700', fontSize: '1.25rem' }}>{locationName}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.studentId}</p>
          </div>
        </div>

        {/* 連絡事項 */}
        {shifts.filter(s => s.locationId === locationId && s.notice).map((s, i) => (
          <div key={i} style={{
            padding: '0.5rem 0.75rem', background: '#eff6ff',
            borderRadius: '0.5rem', fontSize: '0.875rem', color: '#1d4ed8',
            marginBottom: '0.5rem',
          }}>
            {s.notice}
          </div>
        ))}
      </div>

      {/* 現在のシフト */}
      {currentShift && (
        <div className="card" style={{ marginBottom: '0.75rem', borderLeft: '4px solid #16a34a' }}>
          <p style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>現在のシフト</p>
          <p style={{ fontWeight: '600' }}>{currentShift.locationName}</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{currentShift.time}</p>
        </div>
      )}

      {/* 次のシフト */}
      {nextShift && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #2563eb' }}>
          <p style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>次のシフト</p>
          <p style={{ fontWeight: '600' }}>{nextShift.locationName}</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{nextShift.time}</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            次の場所のQRで打刻すると自動的に移動します
          </p>
        </div>
      )}

      {/* 出勤ボタン */}
      <button
        className="btn btn-success"
        style={{ fontSize: '1.125rem', padding: '1rem' }}
        onClick={handleCheckIn}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? '処理中...' : '出勤'}
      </button>
    </div>
  );
}
