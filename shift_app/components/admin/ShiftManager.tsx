'use client';
import { useState, useEffect, useCallback } from 'react';
import { AdminShift, adminApi } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Plus, Upload, Save } from 'lucide-react';
import ShiftEditor from './ShiftEditor';
import ShiftBulkEditor from './ShiftBulkEditor';

type Mode = 'matrix' | 'add' | 'bulk';

// 30分刻みの時間スロットを生成
function generateTimeSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots(8, 20); // 8:00〜19:30

// 場所に色を割り当て
const LOCATION_COLORS = [
  '#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#e0e7ff',
  '#ccfbf1', '#fde68a', '#f3e8ff', '#ffe4e6', '#cffafe',
  '#d9f99d', '#fbcfe8', '#c7d2fe', '#bae6fd', '#fecaca',
];

interface CellData {
  locationId: string;
  locationName: string;
  shiftId: number;
}

interface StaffRow {
  studentId: string;
  name: string;
  cells: Map<string, CellData>; // timeSlot -> CellData
}

function buildMatrix(shifts: AdminShift[]): StaffRow[] {
  const staffMap = new Map<string, StaffRow>();

  for (const s of shifts) {
    if (!staffMap.has(s.studentId)) {
      staffMap.set(s.studentId, { studentId: s.studentId, name: s.name, cells: new Map() });
    }
    const row = staffMap.get(s.studentId)!;

    // startTime〜endTimeまでの30分スロットを埋める
    for (const slot of TIME_SLOTS) {
      if (slot >= s.startTime && slot < s.endTime) {
        row.cells.set(slot, { locationId: s.locationId, locationName: s.locationName, shiftId: s.id });
      }
    }
  }

  return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export default function ShiftManager() {
  const today = new Date().toLocaleDateString('sv-SE');
  const [date, setDate] = useState(today);
  const [shifts, setShifts] = useState<AdminShift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('matrix');

  // セル編集
  const [editingCell, setEditingCell] = useState<{ studentId: string; slot: string } | null>(null);

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

  const matrix = buildMatrix(shifts);

  // 場所ごとの色マップ
  const locationColorMap = new Map<string, string>();
  const uniqueLocations = [...new Set(shifts.map(s => s.locationId))];
  uniqueLocations.forEach((id, i) => {
    locationColorMap.set(id, LOCATION_COLORS[i % LOCATION_COLORS.length]);
  });

  // 使われている時間範囲だけ表示
  let minSlotIdx = TIME_SLOTS.length;
  let maxSlotIdx = 0;
  for (const row of matrix) {
    for (const slot of row.cells.keys()) {
      const idx = TIME_SLOTS.indexOf(slot);
      if (idx < minSlotIdx) minSlotIdx = idx;
      if (idx > maxSlotIdx) maxSlotIdx = idx;
    }
  }
  // 前後1スロット余裕を持たせる
  minSlotIdx = Math.max(0, minSlotIdx - 1);
  maxSlotIdx = Math.min(TIME_SLOTS.length - 1, maxSlotIdx + 1);
  const visibleSlots = matrix.length > 0 ? TIME_SLOTS.slice(minSlotIdx, maxSlotIdx + 1) : TIME_SLOTS;

  // セルクリック → 場所選択
  const handleCellClick = (studentId: string, slot: string) => {
    setEditingCell({ studentId, slot });
  };

  const handleCellChange = async (studentId: string, slot: string, newLocationId: string) => {
    setEditingCell(null);
    const row = matrix.find(r => r.studentId === studentId);
    if (!row) return;

    const currentCell = row.cells.get(slot);

    if (!newLocationId) {
      // 空にする → 該当シフトからこのスロットを除外（シフト削除 or 分割が必要）
      // 簡易実装: 該当シフトを削除
      if (currentCell) {
        try {
          await adminApi.deleteShift(currentCell.shiftId);
          load();
        } catch (e) {
          alert(e instanceof Error ? e.message : '削除に失敗');
        }
      }
      return;
    }

    if (currentCell && currentCell.locationId === newLocationId) return; // 変更なし

    // 新しいシフトを作成（30分スロット1つ分）
    const name = row.name;
    const endSlotIdx = TIME_SLOTS.indexOf(slot);
    const endTime = endSlotIdx + 1 < TIME_SLOTS.length ? TIME_SLOTS[endSlotIdx + 1] : '20:00';

    try {
      // 既存セルがあれば削除
      if (currentCell) {
        await adminApi.deleteShift(currentCell.shiftId);
      }
      await adminApi.createShift({
        date,
        studentId,
        name,
        locationId: newLocationId,
        startTime: slot,
        endTime,
        notice: '',
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新に失敗');
    }
  };

  const handleSaved = () => {
    setMode('matrix');
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* コントロール */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setMode('add')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#d97706' }}>
          <Plus size={16} /> 追加
        </button>
        <button className="btn" onClick={() => setMode('bulk')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Upload size={16} /> 一括追加
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: 'auto' }}>
          {matrix.length}名 / {shifts.length}件
        </span>
      </div>

      {/* エディタ */}
      {mode === 'add' && (
        <ShiftEditor
          date={date}
          locations={locations}
          onSave={handleSaved}
          onCancel={() => setMode('matrix')}
        />
      )}
      {mode === 'bulk' && (
        <ShiftBulkEditor
          date={date}
          locations={locations}
          onSave={handleSaved}
          onCancel={() => setMode('matrix')}
        />
      )}

      {/* 凡例 */}
      {uniqueLocations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', fontSize: '0.7rem' }}>
          {uniqueLocations.map(locId => {
            const loc = locations.find(l => l.locationId === locId);
            return (
              <span key={locId} style={{
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                background: locationColorMap.get(locId),
              }}>
                {loc?.locationName || locId}
              </span>
            );
          })}
        </div>
      )}

      {/* マトリックス */}
      <div className="card" style={{ padding: '0.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
        ) : matrix.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            この日のシフトはありません
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, background: '#fff', zIndex: 10,
                    padding: '0.375rem 0.5rem', borderBottom: '2px solid #e5e7eb',
                    textAlign: 'left', minWidth: '6rem',
                  }}>
                    名前
                  </th>
                  {visibleSlots.map(slot => (
                    <th key={slot} style={{
                      padding: '0.375rem 0.125rem', borderBottom: '2px solid #e5e7eb',
                      textAlign: 'center', minWidth: '2.5rem',
                      borderLeft: slot.endsWith(':00') ? '1px solid #d1d5db' : '1px solid #f3f4f6',
                      fontSize: '0.65rem', color: '#6b7280',
                    }}>
                      {slot.endsWith(':00') ? slot : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.studentId}>
                    <td style={{
                      position: 'sticky', left: 0, background: '#fff', zIndex: 10,
                      padding: '0.25rem 0.5rem', borderBottom: '1px solid #f3f4f6',
                      fontWeight: 500,
                    }}>
                      <div>{row.name}</div>
                      <div style={{ fontSize: '0.6rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                        {row.studentId}
                      </div>
                    </td>
                    {visibleSlots.map(slot => {
                      const cell = row.cells.get(slot);
                      const isEditing = editingCell?.studentId === row.studentId && editingCell?.slot === slot;
                      const bg = cell ? (locationColorMap.get(cell.locationId) || '#f3f4f6') : '#fff';

                      // 左隣と同じ場所なら区切り線を消す
                      const slotIdx = visibleSlots.indexOf(slot);
                      const prevSlot = slotIdx > 0 ? visibleSlots[slotIdx - 1] : null;
                      const prevCell = prevSlot ? row.cells.get(prevSlot) : null;
                      const sameAsPrev = cell && prevCell && cell.locationId === prevCell.locationId;

                      return (
                        <td key={slot}
                          onClick={() => handleCellClick(row.studentId, slot)}
                          style={{
                            padding: 0,
                            borderBottom: '1px solid #f3f4f6',
                            borderLeft: sameAsPrev ? 'none' : (slot.endsWith(':00') ? '1px solid #d1d5db' : '1px solid #e5e7eb'),
                            background: bg,
                            cursor: 'pointer',
                            minWidth: '2.5rem',
                            height: '2.25rem',
                            position: 'relative',
                          }}
                          title={cell ? `${cell.locationName} (${slot})` : slot}
                        >
                          {isEditing && (
                            <select
                              autoFocus
                              defaultValue={cell?.locationId || ''}
                              onChange={e => handleCellChange(row.studentId, slot, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '100%', height: '100%',
                                fontSize: '0.7rem', border: '2px solid #d97706',
                                background: '#fff',
                              }}
                            >
                              <option value="">（なし）</option>
                              {locations.map(l => (
                                <option key={l.locationId} value={l.locationId}>
                                  {l.locationName}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      );
                    })}
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
