'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/gas';
import { LoginUser } from '@/components/LoginPage';

type State = 'loading' | 'confirm' | 'success' | 'error' | 'login_required';

function ScanContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const boothId   = params.get('booth') || '';
  const boothName = params.get('name') || boothId;

  const [user, setUser]             = useState<LoginUser | null>(null);
  const [state, setState]           = useState<State>('loading');
  const [action, setAction]         = useState<'checkin' | 'checkout'>('checkin');
  const [message, setMessage]       = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    const auth   = sessionStorage.getItem('auth');
    if (!auth || !stored) { setState('login_required'); return; }
    try {
      const u: LoginUser = JSON.parse(stored);
      setUser(u);
      checkCurrentStatus(u);
    } catch { setState('login_required'); }
  }, []);

  async function checkCurrentStatus(u: LoginUser) {
    try {
      const r = await api.getAttendance();
      if (r.ok) {
        const myRecord = (r.attendance ?? []).find(
          (a: { staffId: string; status: string; checkOut: string }) =>
            a.staffId === u.staffId && a.status === '出勤' && !a.checkOut
        );
        setAction(myRecord ? 'checkout' : 'checkin');
      }
    } catch {}
    setState('confirm');
  }

  async function handleConfirm() {
    if (!user || processing) return;
    setProcessing(true);
    try {
      const r = action === 'checkin'
        ? await api.checkIn(user.staffId, boothName)
        : await api.checkOut(user.staffId);
      if (r.ok) { setMessage(r.message); setState('success'); }
      else       { setMessage(r.message || '記録に失敗しました'); setState('error'); }
    } catch { setMessage('通信エラーが発生しました'); setState('error'); }
    setProcessing(false);
  }

  if (state === 'login_required') return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '24rem', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>ログインが必要です</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>先にアプリにログインしてから<br />QRを読み取ってください</p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>ログイン画面へ</button>
      </div>
    </div>
  );

  if (state === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94a3b8' }}>確認中...</p>
    </div>
  );

  if (state === 'success') return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '24rem', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{action === 'checkin' ? '✅' : '👋'}</div>
        <h2 style={{ fontWeight: 'bold', color: action === 'checkin' ? '#16a34a' : '#ea580c', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          {action === 'checkin' ? '出勤しました！' : '退勤しました！'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>
        <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: '600' }}>{user?.name}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>📍 {boothName}</div>
        </div>
        <button className="btn btn-outline" onClick={() => router.push('/')}>ホームに戻る</button>
      </div>
    </div>
  );

  if (state === 'error') return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '24rem', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <h2 style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>記録に失敗しました</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>
        <button className="btn btn-outline" style={{ marginBottom: '0.5rem' }} onClick={() => setState('confirm')}>もう一度</button>
        <button className="btn btn-outline" onClick={() => router.push('/')}>ホームに戻る</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '24rem', width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '1rem', background: action === 'checkin' ? '#f0fdf4' : '#fff7ed', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{action === 'checkin' ? '✅' : '👋'}</div>
          <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: action === 'checkin' ? '#16a34a' : '#ea580c' }}>
            {action === 'checkin' ? '出勤する' : '退勤する'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[['名前', user?.name], ['所属', user?.section], ['📍 場所', boothName],
            ['時刻', new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })]
          ].map(([label, value]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '0.75rem', padding: '0.625rem 0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{value}</span>
            </div>
          ))}
        </div>

        <button
          className={`btn ${action === 'checkin' ? 'btn-success' : 'btn-danger'}`}
          style={{ marginBottom: '0.5rem', fontSize: '1rem', padding: '1rem' }}
          onClick={handleConfirm}
          disabled={processing}
        >
          {processing ? '記録中...' : action === 'checkin' ? '📥 出勤を記録する' : '📤 退勤を記録する'}
        </button>
        <button className="btn btn-outline" style={{ fontSize: '0.875rem' }} onClick={() => router.push('/')}>キャンセル</button>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#94a3b8' }}>読み込み中...</p></div>}>
      <ScanContent />
    </Suspense>
  );
}
