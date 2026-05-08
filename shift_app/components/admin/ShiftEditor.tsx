'use client';
import { useState } from 'react';
import { AdminShift, adminApi } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Save, X } from 'lucide-react';

interface Props {
  date: string;
  locations: Location[];
  shift?: AdminShift; // 編集時
  onSave: () => void;
  onCancel: () => void;
}

export default function ShiftEditor({ date, locations, shift, onSave, onCancel }: Props) {
  const [studentId, setStudentId] = useState(shift?.studentId || '');
  const [name, setName] = useState(shift?.name || '');
  const [locationId, setLocationId] = useState(shift?.locationId || (locations[0]?.locationId || ''));
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '12:00');
  const [notice, setNotice] = useState(shift?.notice || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!studentId.trim() || !name.trim()) {
      alert('学籍番号と名前は必須です');
      return;
    }
    setSaving(true);
    try {
      const data = { date, studentId: studentId.toUpperCase(), name, locationId, startTime, endTime, department: '', notice };
      if (shift) {
        await adminApi.updateShift(shift.id, data);
      } else {
        await adminApi.createShift(data);
      }
      onSave();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { marginBottom: '0.75rem' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' };

  return (
    <div className="card" style={{ padding: '1.25rem', border: '2px solid #d97706' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>
        {shift ? 'シフト編集' : 'シフト追加'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>学籍番号</label>
          <input className="input" value={studentId} onChange={e => setStudentId(e.target.value.toUpperCase())}
            placeholder="AB12345" style={{ width: '100%' }} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>氏名</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="山田 太郎" style={{ width: '100%' }} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>場所</label>
          <select className="input" value={locationId} onChange={e => setLocationId(e.target.value)}
            style={{ width: '100%' }}>
            {locations.map(l => (
              <option key={l.locationId} value={l.locationId}>{l.locationName}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>連絡事項</label>
          <input className="input" value={notice} onChange={e => setNotice(e.target.value)}
            placeholder="任意" style={{ width: '100%' }} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>開始時刻</label>
          <input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            style={{ width: '100%' }} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>終了時刻</label>
          <input className="input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={{ width: '100%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button className="btn" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <X size={16} /> キャンセル
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#d97706' }}>
          <Save size={16} /> {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
