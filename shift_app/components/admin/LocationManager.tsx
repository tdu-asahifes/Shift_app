'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi, DailyCode } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Plus, Pencil, Trash2, Save, X, QrCode, Download } from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#10b981',
  '#eab308', '#64748b', '#a855f7', '#fb923c', '#2dd4bf',
];

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [codes, setCodes] = useState<DailyCode[]>([]);
  const [loading, setLoading] = useState(true);

  // 場所追加フォーム
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newCategory, setNewCategory] = useState('');

  // 場所編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // コード追加フォーム
  const [newCodeDate, setNewCodeDate] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');

  // QRコード
  const [qrCodes, setQrCodes] = useState<{ locationId: string; locationName: string; url: string; qrDataUrl: string }[] | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, cs] = await Promise.all([
        adminApi.getLocations(),
        adminApi.getDailyCodes(),
      ]);
      setLocations(locs);
      setCodes(cs);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'データ取得に失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddLocation = async () => {
    if (!newId.trim() || !newName.trim()) return;
    try {
      await adminApi.createLocation(newId.trim(), newName.trim(), newColor, newCategory.trim());
      setNewId('');
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setNewCategory('');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '追加に失敗');
    }
  };

  const handleUpdateLocation = async (id: string) => {
    try {
      await adminApi.updateLocation(id, { locationName: editName, color: editColor, category: editCategory });
      setEditingId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新に失敗');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm(`場所「${id}」を削除しますか？`)) return;
    try {
      await adminApi.deleteLocation(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗');
    }
  };

  const handleUpsertCode = async () => {
    if (!newCodeDate || !newCodeValue.trim()) return;
    try {
      await adminApi.upsertDailyCode(newCodeDate, newCodeValue.trim());
      setNewCodeDate('');
      setNewCodeValue('');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '設定に失敗');
    }
  };

  const handleGenerateQr = async () => {
    const baseUrl = window.location.origin;
    setQrLoading(true);
    try {
      setQrCodes(await adminApi.getQrCodes(baseUrl));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'QRコード生成に失敗');
    } finally {
      setQrLoading(false);
    }
  };

  const handlePrintQr = () => {
    window.print();
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#d97706',
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 場所一覧 */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>場所一覧</h2>
          <button className="btn" onClick={handleGenerateQr} disabled={qrLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
            <QrCode size={16} /> {qrLoading ? '生成中...' : 'QRコード生成'}
          </button>
        </div>

        {/* 追加フォーム */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="場所ID" value={newId}
            onChange={e => setNewId(e.target.value)} style={{ width: '7rem' }} />
          <input className="input" placeholder="場所名" value={newName}
            onChange={e => setNewName(e.target.value)} style={{ flex: 1, minWidth: '6rem' }} />
          <input className="input" placeholder="カテゴリ" value={newCategory}
            onChange={e => setNewCategory(e.target.value)} style={{ width: '6rem' }} />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button className="btn btn-primary" onClick={handleAddLocation} style={btnStyle}>
            <Plus size={16} /><span>追加</span>
          </button>
        </div>

        {/* テーブル */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', width: '2rem' }}>色</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>場所ID</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>場所名</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>カテゴリ</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', width: '6rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.locationId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {editingId === loc.locationId ? (
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    ) : (
                      <div style={{
                        width: '1.25rem', height: '1.25rem', borderRadius: '4px',
                        background: loc.color || '#e5e7eb', border: '1px solid #d1d5db',
                      }} />
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {loc.locationId}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {editingId === loc.locationId ? (
                      <input className="input" value={editName} onChange={e => setEditName(e.target.value)}
                        style={{ width: '100%' }} autoFocus />
                    ) : (
                      loc.locationName
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                    {editingId === loc.locationId ? (
                      <input className="input" value={editCategory} onChange={e => setEditCategory(e.target.value)}
                        style={{ width: '100%' }} placeholder="カテゴリ" />
                    ) : (
                      <span style={{ color: '#6b7280' }}>{loc.category || '-'}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    {editingId === loc.locationId ? (
                      <span style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleUpdateLocation(loc.locationId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>
                          <Save size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                          <X size={16} />
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingId(loc.locationId); setEditName(loc.locationName); setEditColor(loc.color || '#e5e7eb'); setEditCategory(loc.category || ''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteLocation(loc.locationId)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                          <Trash2 size={16} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          {locations.length}件
        </p>
      </div>

      {/* QRコード一覧 */}
      {qrCodes && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>QRコード</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={handlePrintQr}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                <Download size={16} /> 印刷
              </button>
              <button className="btn" onClick={() => setQrCodes(null)}
                style={{ fontSize: '0.8rem' }}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div id="qr-print-area" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '1rem',
          }}>
            {qrCodes.map(qr => (
              <div key={qr.locationId} style={{ textAlign: 'center', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                <img src={qr.qrDataUrl} alt={qr.locationName} style={{ width: '100%', maxWidth: '8rem', margin: '0 auto' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem' }}>{qr.locationName}</div>
                <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>{qr.locationId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 当日コード */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>当日ログインコード</h2>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" type="date" value={newCodeDate}
            onChange={e => setNewCodeDate(e.target.value)} style={{ width: '10rem' }} />
          <input className="input" placeholder="コード" value={newCodeValue}
            onChange={e => setNewCodeValue(e.target.value)} style={{ width: '8rem' }} />
          <button className="btn btn-primary" onClick={handleUpsertCode} style={btnStyle}>
            <Save size={16} /><span>設定</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>日付</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>コード</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.date} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem' }}>{c.date}</td>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{c.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          {codes.length}件
        </p>
      </div>
    </div>
  );
}

// カラーピッカーコンポーネント
function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '1.5rem', height: '1.5rem', borderRadius: '4px',
          background: value, border: '2px solid #d1d5db', cursor: 'pointer', padding: 0,
        }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '2rem', left: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
          padding: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {PRESET_COLORS.map(c => (
            <button key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '4px',
                background: c, border: value === c ? '2px solid #374151' : '1px solid #d1d5db',
                cursor: 'pointer', padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
