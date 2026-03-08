'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/gas';
import { usePushNotification } from '@/lib/usePush';
import NotificationCenter from './NotificationCenter';
import NotificationComposer from './NotificationComposer';
import Toast from './Toast';

type Staff      = { id: string; name: string; section: string; team: string; role: string };
type Attendance = { time: string; staffId: string; name: string; section: string; booth: string; status: string; checkOut: string };
type KeyRecord  = { keyId: string; keyName: string; borrowerName: string; section: string; borrowedAt: string; returnedAt: string; status: string };
type Shift      = { date: string; staffId: string; staffName: string; section: string; booth: string; startTime: string; endTime: string; role: string };
type Tab        = 'status' | 'checkin' | 'checkout' | 'key' | 'notify' | 'settings';
type Toast_     = { message: string; type: 'success' | 'error' | 'info' | '' };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'status',   icon: '📊', label: '状況'   },
  { id: 'checkin',  icon: '✅', label: '出勤'   },
  { id: 'checkout', icon: '👋', label: '退勤'   },
  { id: 'key',      icon: '🔑', label: '鍵'     },
  { id: 'notify',   icon: '📢', label: '通知'   },
  { id: 'settings', icon: '⚙️', label: '設定'   },
];

export default function Dashboard({ onLogout, currentStaffId }: { onLogout: () => void; currentStaffId?: string }) {
  const [tab, setTab]               = useState<Tab>('status');
  const [staffList, setStaffList]   = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [keys, setKeys]             = useState<KeyRecord[]>([]);
  const [myShifts, setMyShifts]     = useState<Shift[]>([]);
  const [gasOk, setGasOk]           = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState<Toast_>({ message: '', type: '' });

  const [ciStaff, setCiStaff]   = useState('');
  const [ciBooth, setCiBooth]   = useState('');
  const [coStaff, setCoStaff]   = useState('');
  const [bKeyId, setBKeyId]     = useState('');
  const [bKeyName, setBKeyName] = useState('');
  const [bStaff, setBStaff]     = useState('');
  const [rKeyId, setRKeyId]     = useState('');

  const { subscribed, subscribe } = usePushNotification(currentStaffId || '');
  const showToast = (m: string, t: Toast_['type']) => setToast({ message: m, type: t });
  const activeStaff = attendance.filter(a => a.status === '出勤' && !a.checkOut);

  const refresh = useCallback(async () => {
    try {
      const [attR, keyR] = await Promise.all([api.getAttendance(), api.getKeyStatus()]);
      if (attR.ok) setAttendance(attR.attendance);
      if (keyR.ok) setKeys(keyR.keys);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try { const r = await api.ping(); setGasOk(r.ok); } catch { setGasOk(false); }
      try { const r = await api.getStaff(); if (r.ok) setStaffList(r.staff); } catch {}
      await refresh();
      if (currentStaffId) {
        try { const r = await api.getMyShifts(currentStaffId); if (r.ok) setMyShifts(r.shifts); } catch {}
      }
    })();
    const iv = setInterval(refresh, 30000);
    return () => clearInterval(iv);
  }, [refresh, currentStaffId]);

  async function doCheckIn() {
    if (!ciStaff) { showToast('スタッフを選択してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.checkIn(ciStaff, ciBooth);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setCiStaff(''); setCiBooth(''); await refresh(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doCheckOut() {
    if (!coStaff) { showToast('スタッフを選択してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.checkOut(coStaff);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setCoStaff(''); await refresh(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doBorrowKey() {
    if (!bKeyId || !bStaff) { showToast('鍵IDと借用者を入力してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.borrowKey(bKeyId, bKeyName, bStaff);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setBKeyId(''); setBKeyName(''); setBStaff(''); await refresh(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doReturnKey() {
    if (!rKeyId) { showToast('鍵IDを入力してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.returnKey(rKeyId);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setRKeyId(''); await refresh(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  // 次のシフト
  const nextShift = myShifts.find(s => {
    const now = new Date();
    const [h, m] = String(s.startTime).split(':').map(Number);
    const start = new Date(); start.setHours(h, m, 0, 0);
    return start > now;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ナビ */}
      <nav className="bg-primary text-white px-4 h-14 flex items-center justify-between sticky top-0 z-40 shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏫</span>
          <span className="font-bold">文化祭シフト管理</span>
          <span className={`w-2 h-2 rounded-full ml-1 ${gasOk === true ? 'bg-green-400' : gasOk === false ? 'bg-red-400' : 'bg-yellow-300'}`} />
        </div>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <button onClick={onLogout} className="text-blue-200 text-sm hover:text-white px-2 py-1 rounded-lg">
            ログアウト
          </button>
        </div>
      </nav>

      {/* タブ */}
      <div className="bg-white border-b border-slate-100 flex overflow-x-auto sticky top-14 z-30 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-400'
            }`}>
            <span className="text-base">{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-8 space-y-4">

        {/* ===== 状況 ===== */}
        {tab === 'status' && <>
          {/* 次のシフトリマインダー */}
          {nextShift && (
            <div className="card border-l-4 border-primary bg-blue-50">
              <div className="text-xs font-semibold text-primary mb-1">⏰ 次のシフト</div>
              <div className="text-base font-bold text-slate-700">{nextShift.startTime} 〜 {nextShift.endTime}</div>
              <div className="text-sm text-slate-500 mt-0.5">📍 {nextShift.booth}</div>
              <div className="text-xs text-slate-400 mt-1">30分前・5分前にプッシュ通知が届きます</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center py-4">
              <div className="text-3xl font-bold text-primary">{activeStaff.length}</div>
              <div className="text-xs text-slate-400 mt-1">現在出勤中</div>
            </div>
            <div className="card text-center py-4">
              <div className={`text-3xl font-bold ${keys.filter(k => k.status === '貸出中').length > 0 ? 'text-yellow-500' : 'text-slate-400'}`}>
                {keys.filter(k => k.status === '貸出中').length}
              </div>
              <div className="text-xs text-slate-400 mt-1">鍵 貸出中</div>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-slate-700">📍 出勤中スタッフ</h2>
              <button onClick={refresh} className="text-xs text-primary">更新</button>
            </div>
            {activeStaff.length === 0
              ? <p className="text-center text-slate-400 text-sm py-4">出勤中のスタッフがいません</p>
              : activeStaff.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{a.section}</span>
                    </div>
                    {a.booth && <span className="badge badge-blue">{a.booth}</span>}
                  </div>
                ))
            }
          </div>

          {keys.filter(k => k.status === '貸出中').length > 0 && (
            <div className="card border-l-4 border-yellow-400">
              <h2 className="font-semibold text-sm text-slate-700 mb-2">🔑 貸出中の鍵</h2>
              {keys.filter(k => k.status === '貸出中').map((k, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-medium">{k.keyName}</span>
                  <span className="text-slate-500 text-xs">{k.borrowerName}</span>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ===== 出勤 ===== */}
        {tab === 'checkin' && (
          <div className="card space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">✅</span>出勤記録</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">スタッフ</label>
              <select className="select" value={ciStaff} onChange={e => setCiStaff(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">ブース・場所</label>
              <input type="text" className="input" placeholder="例: A01・体育館入口" value={ciBooth} onChange={e => setCiBooth(e.target.value)} />
            </div>
            <button className="btn btn-success" onClick={doCheckIn} disabled={loading}>
              {loading ? '記録中...' : '📥 出勤する'}
            </button>
          </div>
        )}

        {/* ===== 退勤 ===== */}
        {tab === 'checkout' && (
          <div className="card space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">👋</span>退勤記録</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">スタッフ</label>
              <select className="select" value={coStaff} onChange={e => setCoStaff(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {(activeStaff.length > 0 ? activeStaff.map(a => ({ id: a.staffId, name: a.name, section: a.section })) : staffList).map(s => (
                  <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>
                ))}
              </select>
            </div>
            {activeStaff.length > 0 && <p className="text-xs text-slate-400">※ 出勤中のスタッフのみ表示</p>}
            <button className="btn btn-danger" onClick={doCheckOut} disabled={loading}>
              {loading ? '記録中...' : '📤 退勤する'}
            </button>
          </div>
        )}

        {/* ===== 鍵管理 ===== */}
        {tab === 'key' && <>
          <div className="card space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">📤</span>鍵を貸し出す</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">鍵ID</label>
                <input type="text" className="input" placeholder="KEY-001" value={bKeyId} onChange={e => setBKeyId(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">鍵名</label>
                <input type="text" className="input" placeholder="体育館 鍵" value={bKeyName} onChange={e => setBKeyName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">借用者</label>
              <select className="select" value={bStaff} onChange={e => setBStaff(e.target.value)}>
                <option value="">-- 選択 --</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            <button className="btn btn-warning" onClick={doBorrowKey} disabled={loading}>
              {loading ? '処理中...' : '🔓 貸し出す'}
            </button>
          </div>

          <div className="card space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">📥</span>鍵を返却する</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">鍵ID</label>
              <input type="text" className="input" placeholder="KEY-001" value={rKeyId} onChange={e => setRKeyId(e.target.value)} />
            </div>
            <button className="btn btn-success" onClick={doReturnKey} disabled={loading}>
              {loading ? '処理中...' : '🔒 返却を記録'}
            </button>
          </div>

          <div className="card">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold text-sm text-slate-700">📋 本日の鍵一覧</h2>
              <button onClick={refresh} className="text-xs text-primary">更新</button>
            </div>
            {keys.length === 0
              ? <p className="text-center text-slate-400 text-sm py-4">記録がありません</p>
              : keys.map((k, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{k.keyName}</div>
                      <div className="text-xs text-slate-400">{k.borrowerName} · {String(k.borrowedAt).slice(11, 16)}</div>
                    </div>
                    <span className={`badge ${k.status === '貸出中' ? 'badge-red' : 'badge-green'}`}>{k.status}</span>
                  </div>
                ))
            }
          </div>
        </>}

        {/* ===== 通知送信 ===== */}
        {tab === 'notify' && (
          <div className="card">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
              <span className="text-xl">📢</span>通知を送る
            </h2>
            <NotificationComposer
              staffList={staffList}
              onSent={m => showToast(m, 'success')}
              onError={m => showToast(m, 'error')}
            />
          </div>
        )}

        {/* ===== 設定 ===== */}
        {tab === 'settings' && <>
          <div className="card space-y-3">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">🔔</span>プッシュ通知</h2>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${subscribed ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
              <div className={`w-3 h-3 rounded-full ${subscribed ? 'bg-green-500' : 'bg-slate-300'}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold">{subscribed ? '通知 有効' : '通知 無効'}</div>
                <div className="text-xs text-slate-400">{subscribed ? 'シフトリマインダーが届きます' : '下から有効化できます'}</div>
              </div>
            </div>
            {!subscribed && (
              <button className="btn btn-primary" onClick={async () => {
                const ok = await subscribe();
                showToast(ok ? '🔔 通知を有効にしました！' : '通知の許可が必要です', ok ? 'success' : 'error');
              }}>
                🔔 プッシュ通知を有効にする
              </button>
            )}
            <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
              <p className="font-semibold">📱 iPhoneをご利用の方へ</p>
              <p>Safariで開き「共有 → ホーム画面に追加」してから起動してください。</p>
            </div>

            {/* 通知タイミングの説明 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">通知が届くタイミング</p>
              {[
                { icon: '✅', label: '出勤記録', desc: '本人のみ' },
                { icon: '👋', label: '退勤記録', desc: '本人のみ' },
                { icon: '⏰', label: 'シフト開始30分前', desc: '本人のみ' },
                { icon: '⏰', label: 'シフト開始5分前',  desc: '本人のみ' },
                { icon: '🔑', label: '鍵の貸し借り',     desc: '管理者（本部）のみ' },
                { icon: '📢', label: '全体・個別連絡',   desc: '送信時に指定した対象者' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-xs">
                  <span>{item.icon} {item.label}</span>
                  <span className="text-slate-400">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">⚙️</span>システム状態</h2>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${gasOk === true ? 'bg-green-500' : gasOk === false ? 'bg-red-500' : 'bg-yellow-400'}`} />
              <span className="text-sm">GAS: {gasOk === true ? '正常' : gasOk === false ? 'エラー' : '確認中'}</span>
              <button className="ml-auto text-xs text-primary" onClick={async () => {
                try { const r = await api.ping(); setGasOk(r.ok); showToast(r.ok ? '接続OK' : 'エラー', r.ok ? 'success' : 'error'); } catch { setGasOk(false); }
              }}>再確認</button>
            </div>
            <button className="btn btn-outline" onClick={async () => { await refresh(); showToast('更新しました', 'info'); }}>
              🔄 データ更新
            </button>
          </div>
        </>}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
    </div>
  );
}
