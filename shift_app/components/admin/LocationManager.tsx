'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi, DailyCode } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [codes, setCodes] = useState<DailyCode[]>([]);
  const [loading, setLoading] = useState(true);

  // 場所追加フォーム
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  // 場所編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // コード追加フォーム
  const [newCodeDate, setNewCodeDate] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');

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
      await adminApi.createLocation(newId.trim(), newName.trim());
      setNewId('');
      setNewName('');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '追加に失敗');
    }
  };

  const handleUpdateLocation = async (id: string) => {
    try {
      await adminApi.updateLocation(id, editName);
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 場所一覧 */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>場所一覧</h2>

        {/* 追加フォーム */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="場所ID"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            style={{ width: '8rem' }}
          />
          <input
            className="input"
            placeholder="場所名"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: '8rem' }}
          />
          <button className="btn btn-primary" onClick={handleAddLocation} style={{ background: '#d97706' }}>
            <Plus size={16} /> 追加
          </button>
        </div>

        {/* テーブル */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>場所ID</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>場所名</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', width: '6rem' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.locationId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {loc.locationId}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {editingId === loc.locationId ? (
                      <input
                        className="input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ width: '100%' }}
                        autoFocus
                      />
                    ) : (
                      loc.locationName
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
                        <button onClick={() => { setEditingId(loc.locationId); setEditName(loc.locationName); }}
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

      {/* 当日コード */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>当日ログインコード</h2>

        {/* 追加/更新フォーム */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            type="date"
            value={newCodeDate}
            onChange={e => setNewCodeDate(e.target.value)}
            style={{ width: '10rem' }}
          />
          <input
            className="input"
            placeholder="コード"
            value={newCodeValue}
            onChange={e => setNewCodeValue(e.target.value)}
            style={{ width: '8rem' }}
          />
          <button className="btn btn-primary" onClick={handleUpsertCode} style={{ background: '#d97706' }}>
            <Save size={16} /> 設定
          </button>
        </div>

        {/* テーブル */}
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
