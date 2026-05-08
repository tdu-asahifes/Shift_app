'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminShift, adminApi } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Plus, Upload, Filter, ArrowUpDown } from 'lucide-react';
import ShiftEditor from './ShiftEditor';
import ShiftBulkEditor from './ShiftBulkEditor';

type Mode = 'matrix' | 'add' | 'bulk';
type SortKey = 'name' | 'studentId' | 'shiftStart';

function generateTimeSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots(8, 20);

interface CellData {
  locationId: string;
  locationName: string;
  shiftId: number;
}

interface StaffRow {
  studentId: string;
  name: string;
  cells: Map<string, CellData>;
  earliestSlot: string;
  locationIds: Set<string>;
}

function buildMatrix(shifts: AdminShift[]): StaffRow[] {
  const staffMap = new Map<string, StaffRow>();

  for (const s of shifts) {
    if (!staffMap.has(s.studentId)) {
      staffMap.set(s.studentId, {
        studentId: s.studentId, name: s.name,
        cells: new Map(), earliestSlot: '99:99', locationIds: new Set(),
      });
    }
    const row = staffMap.get(s.studentId)!;
    row.locationIds.add(s.locationId);

    for (const slot of TIME_SLOTS) {
      if (slot >= s.startTime && slot < s.endTime) {
        row.cells.set(slot, { locationId: s.locationId, locationName: s.locationName, shiftId: s.id });
        if (slot < row.earliestSlot) row.earliestSlot = slot;
      }
    }
  }

  return Array.from(staffMap.values());
}

// セルの連続グループを検出（同じ場所が連続するスロット）
function getCellSpan(row: StaffRow, startSlot: string, visibleSlots: string[]): { span: number; isStart: boolean } {
  const cell = row.cells.get(startSlot);
  if (!cell) return { span: 1, isStart: false };

  const idx = visibleSlots.indexOf(startSlot);
  // 前のスロットと同じ場所か？
  if (idx > 0) {
    const prevCell = row.cells.get(visibleSlots[idx - 1]);
    if (prevCell && prevCell.locationId === cell.locationId && prevCell.shiftId === cell.shiftId) {
      return { span: 1, isStart: false };
    }
  }
  // 連続スパンを数える
  let span = 1;
  for (let i = idx + 1; i < visibleSlots.length; i++) {
    const nextCell = row.cells.get(visibleSlots[i]);
    if (nextCell && nextCell.locationId === cell.locationId && nextCell.shiftId === cell.shiftId) {
      span++;
    } else break;
  }
  return { span, isStart: true };
}

export default function ShiftManager() {
  const today = new Date().toLocaleDateString('sv-SE');
  const [date, setDate] = useState(today);
  const [shifts, setShifts] = useState<AdminShift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('matrix');

  // フィルタ・ソート
  const [filterLocation, setFilterLocation] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('shiftStart');

  // 範囲選択
  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState<{ studentId: string; slotIdx: number } | null>(null);
  const [selEnd, setSelEnd] = useState<{ studentId: string; slotIdx: number } | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

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

  // フィルタ適用
  let filtered = matrix;
  if (filterLocation) {
    filtered = filtered.filter(r => r.locationIds.has(filterLocation));
  }
  if (filterName) {
    const q = filterName.toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q)
    );
  }

  // ソート適用
  filtered.sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'ja');
    if (sortKey === 'studentId') return a.studentId.localeCompare(b.studentId);
    return a.earliestSlot.localeCompare(b.earliestSlot);
  });

  // 表示範囲
  let minSlotIdx = TIME_SLOTS.length;
  let maxSlotIdx = 0;
  for (const row of matrix) {
    for (const slot of row.cells.keys()) {
      const idx = TIME_SLOTS.indexOf(slot);
      if (idx < minSlotIdx) minSlotIdx = idx;
      if (idx > maxSlotIdx) maxSlotIdx = idx;
    }
  }
  minSlotIdx = Math.max(0, minSlotIdx - 1);
  maxSlotIdx = Math.min(TIME_SLOTS.length - 1, maxSlotIdx + 1);
  const visibleSlots = matrix.length > 0 ? TIME_SLOTS.slice(minSlotIdx, maxSlotIdx + 1) : TIME_SLOTS;

  // 範囲選択のハイライト判定
  const isSelected = (studentId: string, slotIdx: number) => {
    if (!selStart || !selEnd) return false;
    if (studentId !== selStart.studentId) return false;
    const lo = Math.min(selStart.slotIdx, selEnd.slotIdx);
    const hi = Math.max(selStart.slotIdx, selEnd.slotIdx);
    return slotIdx >= lo && slotIdx <= hi;
  };

  const handleMouseDown = (studentId: string, slotIdx: number) => {
    setSelecting(true);
    setSelStart({ studentId, slotIdx });
    setSelEnd({ studentId, slotIdx });
    setShowAssignDialog(false);
  };

  const handleMouseEnter = (studentId: string, slotIdx: number) => {
    if (!selecting || !selStart) return;
    if (studentId !== selStart.studentId) return;
    setSelEnd({ studentId, slotIdx });
  };

  const handleMouseUp = () => {
    if (selecting && selStart && selEnd) {
      setShowAssignDialog(true);
    }
    setSelecting(false);
  };

  const handleAssign = async (locationId: string) => {
    if (!selStart || !selEnd) return;
    const row = filtered.find(r => r.studentId === selStart.studentId);
    if (!row) return;

    const lo = Math.min(selStart.slotIdx, selEnd.slotIdx);
    const hi = Math.max(selStart.slotIdx, selEnd.slotIdx);

    const startTime = visibleSlots[lo];
    const endIdx = hi + 1;
    const endTime = endIdx < visibleSlots.length ? visibleSlots[endIdx] : '20:00';

    // 選択範囲の既存シフトを削除
    const idsToDelete = new Set<number>();
    for (let i = lo; i <= hi; i++) {
      const cell = row.cells.get(visibleSlots[i]);
      if (cell) idsToDelete.add(cell.shiftId);
    }

    try {
      for (const id of idsToDelete) {
        await adminApi.deleteShift(id);
      }
      if (locationId) {
        await adminApi.createShift({
          date,
          studentId: row.studentId,
          name: row.name,
          locationId,
          startTime,
          endTime,
          notice: '',
        });
      }
      setSelStart(null);
      setSelEnd(null);
      setShowAssignDialog(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新に失敗');
    }
  };

  const handleSaved = () => {
    setMode('matrix');
    load();
  };

  // 使われている場所一覧（フィルタ用）
  const usedLocations = [...new Set(shifts.map(s => s.locationId))].map(id => {
    const loc = locations.find(l => l.locationId === id);
    return { id, name: loc?.locationName || id };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      onMouseUp={handleMouseUp}>
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
          {filtered.length}名 / {shifts.length}件
        </span>
      </div>

      {/* フィルタ・ソート */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <Filter size={14} style={{ color: '#6b7280' }} />
        <input className="input" placeholder="名前・学籍番号で検索"
          value={filterName} onChange={e => setFilterName(e.target.value)}
          style={{ width: '10rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} />
        <select className="input" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
          <option value="">全場所</option>
          {usedLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <ArrowUpDown size={14} style={{ color: '#6b7280', marginLeft: '0.5rem' }} />
        <select className="input" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
          <option value="shiftStart">シフト開始順</option>
          <option value="name">名前順</option>
          <option value="studentId">学籍番号順</option>
        </select>
      </div>

      {/* エディタ */}
      {mode === 'add' && (
        <ShiftEditor date={date} locations={locations} onSave={handleSaved} onCancel={() => setMode('matrix')} />
      )}
      {mode === 'bulk' && (
        <ShiftBulkEditor date={date} locations={locations} onSave={handleSaved} onCancel={() => setMode('matrix')} />
      )}

      {/* 操作ヒント */}
      <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>
        ドラッグで範囲選択 → 場所を一括割り当て
      </p>

      {/* マトリックス */}
      <div className="card" style={{ padding: '0.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            {matrix.length === 0 ? 'この日のシフトはありません' : '該当するシフトがありません'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', userSelect: 'none' }}>
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
                {filtered.map(row => {
                  // レンダリング済みスロット（colSpanでスキップされたもの）
                  const skipSlots = new Set<string>();

                  return (
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
                      {visibleSlots.map((slot, slotIdx) => {
                        if (skipSlots.has(slot)) return null;

                        const cell = row.cells.get(slot);
                        const { span, isStart } = getCellSpan(row, slot, visibleSlots);
                        const selected = isSelected(row.studentId, slotIdx);

                        // スパン分のスロットをスキップに追加
                        if (isStart && span > 1) {
                          for (let i = 1; i < span; i++) {
                            if (slotIdx + i < visibleSlots.length) {
                              skipSlots.add(visibleSlots[slotIdx + i]);
                            }
                          }
                        }

                        // 範囲選択ハイライト（スパン内のどれかが選択されていたら）
                        let anySelected = selected;
                        if (isStart && span > 1) {
                          for (let i = 0; i < span; i++) {
                            if (isSelected(row.studentId, slotIdx + i)) { anySelected = true; break; }
                          }
                        }

                        const bg = anySelected ? '#fef3c7'
                          : cell ? '#e0f2fe' : '#fff';

                        return (
                          <td
                            key={slot}
                            colSpan={isStart ? span : 1}
                            onMouseDown={() => handleMouseDown(row.studentId, slotIdx)}
                            onMouseEnter={() => {
                              // ドラッグ中はスパンの最終スロットまで選択
                              if (selecting) {
                                handleMouseEnter(row.studentId, isStart ? slotIdx + span - 1 : slotIdx);
                              }
                            }}
                            style={{
                              padding: 0,
                              borderBottom: '1px solid #f3f4f6',
                              borderLeft: slot.endsWith(':00') ? '1px solid #d1d5db' : '1px solid #e5e7eb',
                              background: bg,
                              cursor: 'crosshair',
                              height: '2.5rem',
                              position: 'relative',
                              textAlign: 'center',
                              borderRight: isStart && span > 1 ? '1px solid #93c5fd' : undefined,
                            }}
                            title={cell ? `${cell.locationName} (${slot})` : slot}
                          >
                            {isStart && cell && (
                              <div style={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: '#1e40af',
                                padding: '0 0.125rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: '1.2',
                              }}>
                                {cell.locationName}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 場所割り当てダイアログ */}
      {showAssignDialog && selStart && selEnd && (
        <div style={{
          position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
          background: '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          padding: '0.75rem 1rem', zIndex: 100, display: 'flex', gap: '0.5rem',
          alignItems: 'center', flexWrap: 'wrap', maxWidth: '90vw',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {visibleSlots[Math.min(selStart.slotIdx, selEnd.slotIdx)]}
            〜
            {(() => {
              const hi = Math.max(selStart.slotIdx, selEnd.slotIdx);
              return hi + 1 < visibleSlots.length ? visibleSlots[hi + 1] : '20:00';
            })()}
          </span>
          <select
            className="input"
            onChange={e => handleAssign(e.target.value)}
            defaultValue=""
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="" disabled>場所を選択...</option>
            <option value="">（クリア）</option>
            {locations.map(l => (
              <option key={l.locationId} value={l.locationId}>{l.locationName}</option>
            ))}
          </select>
          <button className="btn" onClick={() => { setShowAssignDialog(false); setSelStart(null); setSelEnd(null); }}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
