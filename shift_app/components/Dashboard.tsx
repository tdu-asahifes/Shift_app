'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/gas';
import { LoginUser } from './LoginPage';
import NotificationCenter from './NotificationCenter';
import NotificationComposer from './NotificationComposer';
import EmergencyReport from './EmergencyReport';
import Toast from './Toast';

type Staff      = { id: string; name: string; section: string; team: string; role: string };
type Attendance = { time: string; staffId: string; name: string; section: string; booth: string; status: string; checkOut: string };
type KeyRecord  = { keyId: string; keyName: string; borrowerName: string; section: string; borrowedAt: string; returnedAt: string; status: string };
type Tab        = 'status' | 'checkin' | 'checkout' | 'key' | 'emergency' | 'notify' | 'settings';
type ToastState = { message: string; type: 'success' | 'error' | 'info' | '' };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'status',    icon: '📊', label: '状況'    },
  { id: 'checkin',   icon: '✅', label: '出勤'    },
  { id: 'checkout',  icon: '👋', label: '退勤'    },
  { id: 'key',       icon: '🔑', label: '鍵'      },
  { id: 'emergency', icon: '🚨', label: '緊急'    },
  { id: 'notify',    icon: '📢', label: '本部連絡' },
  { id: 'settings',  icon: '⚙️', label: '設定'    },
];

const S = {
  card:   { backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', padding: '1.25rem' } as React.CSSProperties,
  row:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  label:  { display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.375rem' } as React.CSSProperties,
  small:  { fontSize: '0.75rem', color: '#94a3b8' } as React.CSSProperties,
  divider:{ borderBottom: '1px solid #f8fafc' } as React.CSSProperties,
};

function Badge({ label, color }: { label: string; color: 'green' | 'yellow' | 'red' | 'blue' }) {
  const bg: Record<string, string> = { green: '#dcfce7', yellow: '#fef9c3', red: '#fee2e2', blue: '#dbeafe' };
  const fg: Record<string, string> = { green: '#166534', yellow: '#854d0e', red: '#b91c1c', blue: '#1d4ed8' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: bg[color], color: fg[color] }}>{label}</span>;
}

function isManager(role: string)       { return role === 'manager' || role === 'hq'; }
function isLeaderOrAbove(role: string) { return role === 'leader' || isManager(role); }

export default function Dashboard({ onLogout, currentUser }: { onLogout: () => void; currentUser: LoginUser }) {
  const [tab, setTab]               = useState<Tab>('status');
  const [staffList, setStaffList]   = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [keys, setKeys]             = useState<KeyRecord[]>([]);
  const [gasOk, setGasOk]           = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]           = useState<ToastState>({ message: '', type: '' });
  const [lastUpdated, setLastUpdated] = useState('');
  const [now, setNow]               = useState('');
  const [ciStaff, setCiStaff]       = useState('');
  const [ciBooth, setCiBooth]       = useState('');
  const [coStaff, setCoStaff]       = useState('');
  const [bKeyId, setBKeyId]         = useState('');
  const [bKeyName, setBKeyName]     = useState('');
  const [bStaff, setBStaff]         = useState('');
  const [rKeyId, setRKeyId]         = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showToast = (m: string, t: ToastState['type']) => setToast({ message: m, type: t });

  const activeStaff  = attendance.filter(a => a.status === '出勤' && !a.checkOut);
  const activeKeys   = keys.filter(k => k.status === '貸出中');
  const myAttendance = attendance.find(a => a.staffId === currentUser.staffId && a.status === '出勤' && !a.checkOut);
  const absentStaff  = staffList.filter(s => !activeStaff.find(a => a.staffId === s.id));
  const sectionStaff = activeStaff.filter(a => a.section === currentUser.section);

  async function fetchData() {
    try {
      const [attR, keyR] = await Promise.all([api.getAttendance(), api.getKeyStatus()]);
      if (attR.ok) setAttendance(attR.attendance ?? []);
      if (keyR.ok) setKeys(keyR.keys ?? []);
      setLastUpdated(new Date().toLocaleTimeString('ja-JP'));
    } catch {}
  }

  async function handleRefresh() { setRefreshing(true); await fetchData(); setRefreshing(false); }

  useEffect(() => {
    (async () => {
      try { const r = await api.ping(); setGasOk(r.ok); } catch { setGasOk(false); }
      try { const r = await api.getStaff(); if (r.ok) setStaffList(r.staff ?? []); } catch {}
      await fetchData();
    })();
    timerRef.current = setInterval(fetchData, 30000);
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

  const roleLabel = { hq: '本部', manager: 'シフト管理者・局長', leader: 'リーダー', individual: '一般' }[currentUser.role] || '一般';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* ナビ */}
      <nav style={{ backgroundColor: '#2563eb', color: 'white', padding: '0 1rem', height: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem' }}>🏫</span>
          <span style={{ fontWeight: 'bold', fontSize: '0.9375rem' }}>文化祭シフト管理</span>
          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: gasOk === true ? '#4ade80' : gasOk === false ? '#f87171' : '#fbbf24' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#bfdbfe', marginRight: '0.25rem' }}>{currentUser.name}</span>
          <NotificationCenter />
          <button onClick={onLogout} style={{ color: '#bfdbfe', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}>ログアウト</button>
        </div>
      </nav>

      {/* タブ */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', overflowX: 'auto', position: 'sticky', top: '3.5rem', zIndex: 30, flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem', padding: '0.625rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', borderBottom: '2px solid', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottomColor: tab === t.id ? (t.id === 'emergency' ? '#ef4444' : '#2563eb') : 'transparent', color: tab === t.id ? (t.id === 'emergency' ? '#ef4444' : '#2563eb') : '#94a3b8', background: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '1rem' }}>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, maxWidth: '32rem', margin: '0 auto', width: '100%', padding: '1rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ===== 状況 ===== */}
        {tab === 'status' && <>
          <div style={{ ...S.card, textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{now}</div>
            <div style={{ ...S.small, marginTop: '0.25rem' }}>{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
          </div>

          <div style={S.card}>
            <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155', marginBottom: '0.75rem' }}>👤 自分の状況</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: myAttendance ? '#f0fdf4' : '#f8fafc', border: `1px solid ${myAttendance ? '#bbf7d0' : '#e2e8f0'}` }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', backgroundColor: myAttendance ? '#16a34a' : '#cbd5e1', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{currentUser.name}</div>
                <div style={{ ...S.small }}>{currentUser.section} · {roleLabel}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <Badge label={myAttendance ? `出勤中 · ${myAttendance.booth || '未指定'}` : '未出勤'} color={myAttendance ? 'green' : 'yellow'} />
              </div>
            </div>
          </div>

          {isLeaderOrAbove(currentUser.role) && (
            <div style={S.card}>
              <div style={{ ...S.row, marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155' }}>🏢 {currentUser.section}の出勤状況</div>
                <span style={S.small}>{sectionStaff.length}名出勤中</span>
              </div>
              {sectionStaff.length === 0
                ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', padding: '1rem 0' }}>出勤中のスタッフがいません</p>
                : sectionStaff.map((a, i) => (
                    <div key={i} style={{ ...S.row, padding: '0.625rem 0', ...S.divider }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{a.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {a.booth && a.booth !== '未指定' && <Badge label={a.booth} color="blue" />}
                        <Badge label="出勤中" color="green" />
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {isManager(currentUser.role) && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ ...S.card, textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{activeStaff.length}</div>
                  <div style={S.small}>出勤中</div>
                </div>
                <div style={{ ...S.card, textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: activeKeys.length > 0 ? '#eab308' : '#94a3b8' }}>{activeKeys.length}</div>
                  <div style={S.small}>鍵 貸出中</div>
                </div>
              </div>

              <div style={{ ...S.card, borderLeft: absentStaff.length > 0 ? '4px solid #fb923c' : undefined }}>
                <div style={{ ...S.row, marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155' }}>⚠️ 未出勤スタッフ</div>
                  <span style={S.small}>{absentStaff.length}名</span>
                </div>
                {absentStaff.length === 0
                  ? <p style={{ textAlign: 'center', color: '#16a34a', fontSize: '0.875rem', padding: '0.5rem 0' }}>✅ 全員出勤済み</p>
                  : absentStaff.map((s, i) => (
                      <div key={i} style={{ ...S.row, padding: '0.5rem 0', ...S.divider }}>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{s.name}</span>
                          <span style={{ ...S.small, marginLeft: '0.5rem' }}>{s.section}</span>
                        </div>
                        <Badge label="未出勤" color="yellow" />
                      </div>
                    ))
                }
              </div>
            </>
          )}

          {attendance.length > 0 && (
            <div style={S.card}>
              <div style={{ ...S.row, marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155' }}>
                  📋 {isManager(currentUser.role) ? '本日の全体ログ' : '本日のログ'}（{isManager(currentUser.role) ? attendance.length : attendance.filter(a => a.section === currentUser.section).length}件）
                </div>
                <button onClick={handleRefresh} disabled={refreshing} style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {refreshing ? '更新中...' : '🔄 更新'}
                </button>
              </div>
              <div style={{ maxHeight: '12rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                {[...(isManager(currentUser.role) ? attendance : attendance.filter(a => a.section === currentUser.section))].reverse().map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.375rem 0', ...S.divider }}>
                    <span style={{ color: '#94a3b8', width: '3rem', flexShrink: 0 }}>{String(a.time).slice(11, 16)}</span>
                    <span style={{ fontWeight: '500', flex: 1 }}>{a.name}</span>
                    {isManager(currentUser.role) && <span style={S.small}>{a.section}</span>}
                    <Badge label={!a.checkOut ? '出勤中' : '退勤済'} color={!a.checkOut ? 'green' : 'yellow'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {isManager(currentUser.role) && activeKeys.length > 0 && (
            <div style={{ ...S.card, borderLeft: '4px solid #eab308' }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155', marginBottom: '0.5rem' }}>🔑 貸出中の鍵</div>
              {activeKeys.map((k, i) => (
                <div key={i} style={{ ...S.row, padding: '0.375rem 0' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{k.keyName}</span>
                  <span style={S.small}>{k.borrowerName}</span>
                </div>
              ))}
            </div>
          )}

          {lastUpdated && <p style={{ textAlign: 'center', ...S.small }}>最終更新: {lastUpdated}</p>}
        </>}

        {/* ===== 出勤 ===== */}
        {tab === 'checkin' && (
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><span style={{ fontSize: '1.25rem' }}>✅</span>出勤記録</h2>
            <div>
              <label style={S.label}>スタッフ</label>
              <select className="select" value={ciStaff} onChange={e => setCiStaff(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>ブース・場所</label>
              <input className="input" placeholder="例: 体育館入口" value={ciBooth} onChange={e => setCiBooth(e.target.value)} />
            </div>
            <button className="btn btn-success" onClick={doCheckIn} disabled={loading}>{loading ? '記録中...' : '📥 出勤する'}</button>
          </div>
        )}

        {/* ===== 退勤 ===== */}
        {tab === 'checkout' && (
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><span style={{ fontSize: '1.25rem' }}>👋</span>退勤記録</h2>
            <div>
              <label style={S.label}>スタッフ</label>
              <select className="select" value={coStaff} onChange={e => setCoStaff(e.target.value)}>
                <option value="">-- 選択してください --</option>
                {(activeStaff.length > 0 ? activeStaff.map(a => ({ id: a.staffId, name: a.name, section: a.section })) : staffList).map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            {activeStaff.length > 0 && <p style={S.small}>※ 出勤中のスタッフのみ表示</p>}
            <button className="btn btn-danger" onClick={doCheckOut} disabled={loading}>{loading ? '記録中...' : '📤 退勤する'}</button>
          </div>
        )}

        {/* ===== 鍵管理 ===== */}
        {tab === 'key' && <>
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><span>📤</span>鍵を貸し出す</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><label style={S.label}>鍵ID</label><input className="input" placeholder="KEY-001" value={bKeyId} onChange={e => setBKeyId(e.target.value)} /></div>
              <div><label style={S.label}>鍵名</label><input className="input" placeholder="体育館 鍵" value={bKeyName} onChange={e => setBKeyName(e.target.value)} /></div>
            </div>
            <div>
              <label style={S.label}>借用者</label>
              <select className="select" value={bStaff} onChange={e => setBStaff(e.target.value)}>
                <option value="">-- 選択 --</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>)}
              </select>
            </div>
            <button className="btn btn-warning" onClick={doBorrowKey} disabled={loading}>{loading ? '処理中...' : '🔓 貸し出す'}</button>
          </div>

          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><span>📥</span>鍵を返却する</h2>
            {activeKeys.length > 0
              ? <div><label style={S.label}>返却する鍵を選択</label>
                  <select className="select" value={rKeyId} onChange={e => setRKeyId(e.target.value)}>
                    <option value="">-- 選択 --</option>
                    {activeKeys.map(k => <option key={k.keyId} value={k.keyId}>{k.keyName}（{k.borrowerName}）</option>)}
                  </select></div>
              : <div><label style={S.label}>鍵ID</label><input className="input" placeholder="KEY-001" value={rKeyId} onChange={e => setRKeyId(e.target.value)} /></div>
            }
            <button className="btn btn-success" onClick={doReturnKey} disabled={loading}>{loading ? '処理中...' : '🔒 返却を記録'}</button>
          </div>

          <div style={S.card}>
            <div style={{ ...S.row, marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#334155' }}>📋 本日の鍵一覧</div>
              <button onClick={handleRefresh} style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>🔄 更新</button>
            </div>
            {keys.length === 0
              ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', padding: '1rem 0' }}>記録がありません</p>
              : keys.map((k, i) => (
                  <div key={i} style={{ ...S.row, padding: '0.625rem 0', ...S.divider }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{k.keyName}</div>
                      <div style={S.small}>{k.borrowerName} · {String(k.borrowedAt).slice(11, 16)}</div>
                    </div>
                    <Badge label={k.status} color={k.status === '貸出中' ? 'red' : 'green'} />
                  </div>
                ))
            }
          </div>
        </>}

        {/* ===== 緊急報告 ===== */}
        {tab === 'emergency' && (
          <div style={S.card}>
            <EmergencyReport staffList={staffList} onSent={m => showToast(m, 'success')} onError={m => showToast(m, 'error')} />
          </div>
        )}

        {/* ===== 本部連絡 ===== */}
        {tab === 'notify' && (
          <div style={S.card}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}><span>📢</span>本部連絡</h2>
            {isManager(currentUser.role)
              ? <NotificationComposer staffList={staffList} onSent={m => showToast(m, 'success')} onError={m => showToast(m, 'error')} />
              : <div style={{ padding: '2rem 0', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📢</div>
                  <p style={{ fontSize: '0.875rem' }}>本部からの連絡はここに表示されます</p>
                  <p style={{ ...S.small, marginTop: '0.25rem' }}>通知センター（🔔）でも確認できます</p>
                </div>
            }
          </div>
        )}

        {/* ===== 設定 ===== */}
        {tab === 'settings' && (
          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><span>⚙️</span>設定・状態</h2>
            <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
              {[['ログイン中', currentUser.name], ['学籍番号', currentUser.staffId], ['所属', currentUser.section], ['役職', roleLabel]].map(([k, v]) => (
                <div key={k} style={S.row}><span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: '500' }}>{v}</span></div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: gasOk === true ? '#16a34a' : gasOk === false ? '#dc2626' : '#eab308' }} />
              <span style={{ fontSize: '0.875rem' }}>GAS接続: {gasOk === true ? '✅ 正常' : gasOk === false ? '❌ エラー' : '確認中...'}</span>
            </div>
            <button className="btn btn-outline" onClick={async () => { await handleRefresh(); showToast('更新しました', 'info'); }}>🔄 データ更新</button>
            {isManager(currentUser.role) && <a href="/qr" className="btn btn-outline" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>📱 QRコード管理</a>}
            <button className="btn btn-outline" onClick={onLogout}>ログアウト</button>
          </div>
        )}
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
    </div>
  );
}
