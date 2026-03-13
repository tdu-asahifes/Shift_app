'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/gas';
import { LoginUser } from './LoginPage';
import NotificationCenter from './NotificationCenter';
import NotificationComposer from './NotificationComposer';
import EmergencyReport from './EmergencyReport';
import Toast from './Toast';

type Staff = { id: string; name: string; section: string; team: string; role: string };
type Attendance = { time: string; staffId: string; name: string; section: string; booth: string; status: string; checkOut: string };
type KeyRecord = { keyId: string; keyName: string; borrowerName: string; section: string; borrowedAt: string; returnedAt: string; status: string };
type Tab = 'status' | 'checkin' | 'checkout' | 'key' | 'emergency' | 'notify' | 'settings';
type ToastState = { message: string; type: 'success' | 'error' | 'info' | '' };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'status', icon: '📊', label: '状況' },
  { id: 'checkin', icon: '✅', label: '出勤' },
  { id: 'checkout', icon: '👋', label: '退勤' },
  { id: 'key', icon: '🔑', label: '鍵' },
  { id: 'emergency', icon: '🚨', label: '緊急' },
  { id: 'notify', icon: '📢', label: '本部連絡' },
  { id: 'settings', icon: '⚙️', label: '設定' },
];

// 管理者以上かどうか
function isManager(role: string) { return role === 'manager' || role === 'hq'; }
function isLeaderOrAbove(role: string) { return role === 'leader' || isManager(role); }

export default function Dashboard({ onLogout, currentUser }: { onLogout: () => void; currentUser: LoginUser }) {
  const [tab, setTab] = useState<Tab>('status');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [gasOk, setGasOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState('');
  const [now, setNow] = useState('');

  const [ciStaff, setCiStaff] = useState('');
  const [ciBooth, setCiBooth] = useState('');
  const [coStaff, setCoStaff] = useState('');
  const [bKeyId, setBKeyId] = useState('');
  const [bKeyName, setBKeyName] = useState('');
  const [bStaff, setBStaff] = useState('');
  const [rKeyId, setRKeyId] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showToast = (m: string, t: ToastState['type']) => setToast({ message: m, type: t });

  // 出勤中スタッフ
  const activeStaff = attendance.filter(a => a.status === '出勤' && !a.checkOut);
  const activeKeys = keys.filter(k => k.status === '貸出中');

  // 自分の出勤状況
  const myAttendance = attendance.find(a => a.staffId === currentUser.staffId && a.status === '出勤' && !a.checkOut);

  // 未出勤スタッフ（管理者用）
  const absentStaff = staffList.filter(s =>
    !activeStaff.find(a => a.staffId === s.id)
  );

  // 自分と同じsectionのスタッフ（リーダー用）
  const sectionStaff = activeStaff.filter(a => a.section === currentUser.section);

  async function fetchData() {
    try {
      const [attR, keyR] = await Promise.all([api.getAttendance(), api.getKeyStatus()]);
      if (attR.ok) setAttendance(attR.attendance ?? []);
      if (keyR.ok) setKeys(keyR.keys ?? []);
      setLastUpdated(new Date().toLocaleTimeString('ja-JP'));
    } catch (e) { console.error('fetchData error:', e); }
  }

  async function handleRefresh() { setRefreshing(true); await fetchData(); setRefreshing(false); }

  useEffect(() => {
    (async () => {
      try { const r = await api.ping(); setGasOk(r.ok); } catch { setGasOk(false); }
      try { const r = await api.getStaff(); if (r.ok) setStaffList(r.staff ?? []); } catch { }
      await fetchData();
    })();
    timerRef.current = setInterval(fetchData, 30000);
    // 時計
    const tick = () => setNow(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  async function doCheckIn() {
    if (!ciStaff) { showToast('スタッフを選択してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.checkIn(ciStaff, ciBooth);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setCiStaff(''); setCiBooth(''); await fetchData(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doCheckOut() {
    if (!coStaff) { showToast('スタッフを選択してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.checkOut(coStaff);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setCoStaff(''); await fetchData(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doBorrowKey() {
    if (!bKeyId || !bStaff) { showToast('鍵IDと借用者を選択してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.borrowKey(bKeyId, bKeyName, bStaff);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setBKeyId(''); setBKeyName(''); setBStaff(''); await fetchData(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  async function doReturnKey() {
    if (!rKeyId) { showToast('鍵IDを入力してください', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.returnKey(rKeyId);
      showToast(r.message, r.ok ? 'success' : 'error');
      if (r.ok) { setRKeyId(''); await fetchData(); }
    } catch { showToast('通信エラー', 'error'); }
    setLoading(false);
  }

  // ===== 状況欄コンテンツ（ロール別）=====
  function StatusContent() {
    return (
      <div className="space-y-4">

        {/* 現在時刻 */}
        <div className="card text-center py-4">
          <div className="text-4xl font-bold text-primary tabular-nums">{now}</div>
          <div className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
        </div>

        {/* 個人：自分の出退勤状況 */}
        <div className="card">
          <h2 className="font-semibold text-sm text-slate-700 mb-3">👤 自分の状況</h2>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${myAttendance ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${myAttendance ? 'bg-green-500' : 'bg-slate-300'}`} />
            <div>
              <div className="text-sm font-bold">{currentUser.name}</div>
              <div className="text-xs text-slate-500">{currentUser.section}</div>
            </div>
            <span className={`ml-auto badge ${myAttendance ? 'badge-green' : 'badge-yellow'}`}>
              {myAttendance ? `出勤中 · ${myAttendance.booth || '未指定'}` : '未出勤'}
            </span>
          </div>
        </div>

        {/* リーダー以上：担当セクションの出退勤 */}
        {isLeaderOrAbove(currentUser.role) && (
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-slate-700">
                🏢 {currentUser.section}の出勤状況
              </h2>
              <span className="text-xs text-slate-400">{sectionStaff.length}名出勤中</span>
            </div>
            {sectionStaff.length === 0
              ? <p className="text-center text-slate-400 text-sm py-4">出勤中のスタッフがいません</p>
              : sectionStaff.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm font-medium">{a.name}</span>
                  <div className="flex items-center gap-2">
                    {a.booth && a.booth !== '未指定' && <span className="badge badge-blue">{a.booth}</span>}
                    <span className="badge badge-green">出勤中</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* 管理者以上：未出勤スタッフ一覧 */}
        {isManager(currentUser.role) && (
          <div className={`card ${absentStaff.length > 0 ? 'border-l-4 border-orange-400' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-slate-700">⚠️ 未出勤スタッフ</h2>
              <span className="text-xs text-slate-400">{absentStaff.length}名</span>
            </div>
            {absentStaff.length === 0
              ? <p className="text-center text-green-500 text-sm py-4">✅ 全員出勤済み</p>
              : absentStaff.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{s.section}</span>
                  </div>
                  <span className="badge badge-yellow">未出勤</span>
                </div>
              ))
            }
          </div>
        )}

        {/* 管理者以上：全体の出勤状況サマリー */}
        {isManager(currentUser.role) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center py-4">
              <div className="text-3xl font-bold text-primary">{activeStaff.length}</div>
              <div className="text-xs text-slate-400 mt-1">出勤中</div>
            </div>
            <div className="card text-center py-4">
              <div className={`text-3xl font-bold ${activeKeys.length > 0 ? 'text-yellow-500' : 'text-slate-400'}`}>{activeKeys.length}</div>
              <div className="text-xs text-slate-400 mt-1">鍵 貸出中</div>
            </div>
          </div>
        )}

        {/* 本日のログ */}
        {attendance.length > 0 && (
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-slate-700">
                📋 {isManager(currentUser.role) ? '本日の全体ログ' : '本日のログ'}
                （{isManager(currentUser.role) ? attendance.length : attendance.filter(a => a.section === currentUser.section).length}件）
              </h2>
              <button onClick={handleRefresh} disabled={refreshing}
                className="text-xs text-primary hover:underline disabled:opacity-50">
                {refreshing ? '更新中...' : '🔄 更新'}
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...(isManager(currentUser.role)
                ? attendance
                : attendance.filter(a => a.section === currentUser.section)
              )].reverse().map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 w-12 flex-shrink-0">{String(a.time).slice(11, 16)}</span>
                  <span className="font-medium flex-1">{a.name}</span>
                  {isManager(currentUser.role) && <span className="text-slate-400">{a.section}</span>}
                  <span className={`badge ${!a.checkOut ? 'badge-green' : 'badge-yellow'}`}>
                    {!a.checkOut ? '出勤中' : '退勤済'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 鍵貸出中（管理者以上） */}
        {isManager(currentUser.role) && activeKeys.length > 0 && (
          <div className="card border-l-4 border-yellow-400">
            <h2 className="font-semibold text-sm text-slate-700 mb-2">🔑 貸出中の鍵</h2>
            {activeKeys.map((k, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-medium">{k.keyName}</span>
                <span className="text-slate-500 text-xs">{k.borrowerName}</span>
              </div>
            ))}
          </div>
        )}

        {lastUpdated && (
          <p className="text-center text-xs text-slate-300">最終更新: {lastUpdated}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-primary text-white px-4 h-14 flex items-center justify-between sticky top-0 z-40 shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏫</span>
          <span className="font-bold text-sm">文化祭シフト管理</span>
          <span className={`w-2 h-2 rounded-full ml-1 ${gasOk === true ? 'bg-green-400' : gasOk === false ? 'bg-red-400' : 'bg-yellow-300'}`} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-blue-200 mr-1">{currentUser.name}</span>
          <NotificationCenter />
          <button onClick={onLogout} className="text-blue-200 text-sm hover:text-white px-2 py-1 rounded-lg">ログアウト</button>
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 flex overflow-x-auto sticky top-14 z-30 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === t.id
                ? t.id === 'emergency' ? 'border-red-500 text-red-500' : 'border-primary text-primary'
                : 'border-transparent text-slate-400'
              }`}>
            <span className="text-base">{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-8">

        {tab === 'status' && <StatusContent />}

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
              <input type="text" className="input" placeholder="例: 体育館入口" value={ciBooth} onChange={e => setCiBooth(e.target.value)} />
            </div>
            <button className="btn btn-success" onClick={doCheckIn} disabled={loading}>
              {loading ? '記録中...' : '📥 出勤する'}
            </button>
          </div>
        )}

        {tab === 'checkout' && (
          <div className="card space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">👋</span>退勤記録</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">スタッフ</label>
              <select className="select" value={coStaff} onChange={e => setCoStaff(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {(activeStaff.length > 0
                  ? activeStaff.map(a => ({ id: a.staffId, name: a.name, section: a.section }))
                  : staffList
                ).map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            {activeStaff.length > 0 && <p className="text-xs text-slate-400">※ 出勤中のスタッフのみ表示</p>}
            <button className="btn btn-danger" onClick={doCheckOut} disabled={loading}>
              {loading ? '記録中...' : '📤 退勤する'}
            </button>
          </div>
        )}

        {tab === 'key' && (
          <div className="space-y-4">
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
              {activeKeys.length > 0 ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">返却する鍵を選択</label>
                  <select className="select" value={rKeyId} onChange={e => setRKeyId(e.target.value)}>
                    <option value="">-- 選択 --</option>
                    {activeKeys.map(k => <option key={k.keyId} value={k.keyId}>{k.keyName}（{k.borrowerName}）</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">鍵ID</label>
                  <input type="text" className="input" placeholder="KEY-001" value={rKeyId} onChange={e => setRKeyId(e.target.value)} />
                </div>
              )}
              <button className="btn btn-success" onClick={doReturnKey} disabled={loading}>
                {loading ? '処理中...' : '🔒 返却を記録'}
              </button>
            </div>

            <div className="card">
              <div className="flex justify-between mb-3">
                <h2 className="font-semibold text-sm text-slate-700">📋 本日の鍵一覧</h2>
                <button onClick={handleRefresh} className="text-xs text-primary">🔄 更新</button>
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
          </div>
        )}

        {tab === 'emergency' && (
          <div className="card">
            <EmergencyReport
              staffList={staffList}
              onSent={m => showToast(m, 'success')}
              onError={m => showToast(m, 'error')}
            />
          </div>
        )}

        {tab === 'notify' && (
          <div className="card">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><span className="text-xl">📢</span>本部連絡</h2>
            {isManager(currentUser.role)
              ? <NotificationComposer
                staffList={staffList}
                onSent={m => showToast(m, 'success')}
                onError={m => showToast(m, 'error')}
              />
              : <div className="py-8 text-center text-slate-400 space-y-2">
                <div className="text-4xl">📢</div>
                <p className="text-sm">本部からの連絡はここに表示されます</p>
                <p className="text-xs text-slate-300">通知センター（🔔）でも確認できます</p>
              </div>
            }
          </div>
        )}

        {tab === 'settings' && (
          <div className="card space-y-3">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><span className="text-xl">⚙️</span>設定・状態</h2>
            <div className="px-4 py-3 bg-slate-50 rounded-xl space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">ログイン中</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">学籍番号</span>
                <span className="font-medium">{currentUser.staffId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">所属</span>
                <span className="font-medium">{currentUser.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">役職</span>
                <span className="font-medium">{currentUser.role === 'hq' ? '本部' : currentUser.role === 'manager' ? 'シフト管理者・局長' : currentUser.role === 'leader' ? 'リーダー' : '一般'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
              <div className={`w-2.5 h-2.5 rounded-full ${gasOk === true ? 'bg-green-500' : gasOk === false ? 'bg-red-500' : 'bg-yellow-400'}`} />
              <span className="text-sm">GAS接続: {gasOk === true ? '✅ 正常' : gasOk === false ? '❌ エラー' : '確認中...'}</span>
            </div>
            <button className="btn btn-outline" onClick={async () => { await handleRefresh(); showToast('更新しました', 'info'); }}>
              🔄 データ更新
            </button>
            {isManager(currentUser.role) && (
              <a href="/qr" className="btn btn-outline block text-center">
                📱 QRコード管理
              </a>
            )}
            <button className="btn btn-outline" onClick={onLogout}>ログアウト</button>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
    </div>
  );
}