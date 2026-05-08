'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminShift, adminApi } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import ShiftEditor from './ShiftEditor';
import ShiftBulkEditor from './ShiftBulkEditor';

type Mode = 'list' | 'add' | 'edit' | 'bulk';

export default function ShiftManager() {
  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  const [date, setDate] = useState(today);
  const [shifts, setShifts] = useState<AdminShift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editTarget, setEditTarget] = useState<AdminShift | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        adminApi.getShifts(date),
        adminApi.getLocations(),
      ]);
      setShifts(s);
      setLocations(l);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'データ取得に失敗');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm('このシフトを削除しますか？')) return;
    try {
      await adminApi.deleteShift(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '削除に失敗');
    }
  };

  const handleSaved = () => {
    setMode('list');
    setEditTarget(undefined);
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 日付選択 + ボタン */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => { setMode('add'); setEditTarget(undefined); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#d97706' }}>
          <Plus size={16} /> 追加
        </button>
        <button className="btn" onClick={() => setMode('bulk')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Upload size={16} /> 一括追加
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: 'auto' }}>
          {shifts.length}件
        </span>
      </div>

      {/* エディタ */}
      {(mode === 'add' || mode === 'edit') && (
        <ShiftEditor
          date={date}
          locations={locations}
          shift={editTarget}
          onSave={handleSaved}
          onCancel={() => { setMode('list'); setEditTarget(undefined); }}
        />
      )}
      {mode === 'bulk' && (
        <ShiftBulkEditor
          date={date}
          locations={locations}
          onSave={handleSaved}
          onCancel={() => setMode('list')}
        />
      )}

      {/* シフト一覧 */}
      <div className="card" style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            この日のシフトはありません
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>時間</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>名前</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>学籍番号</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>場所</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>連絡</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', width: '5rem' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{s.startTime}〜{s.endTime}</td>
                    <td style={{ padding: '0.5rem' }}>{s.name}</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.studentId}</td>
                    <td style={{ padding: '0.5rem' }}>{s.locationName}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>{s.notice}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <span style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditTarget(s); setMode('edit'); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
