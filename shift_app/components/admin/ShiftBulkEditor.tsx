'use client';
import { useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { Location } from '@/lib/types';
import { Upload, X } from 'lucide-react';

interface ParsedRow {
  studentId: string;
  name: string;
  locationId: string;
  startTime: string;
  endTime: string;
  notice: string;
  error?: string;
}

interface Props {
  date: string;
  locations: Location[];
  onSave: () => void;
  onCancel: () => void;
}

export default function ShiftBulkEditor({ date, locations, onSave, onCancel }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const locationMap = new Map(locations.map(l => [l.locationName, l.locationId]));

  const handleParse = () => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const rows: ParsedRow[] = lines.map(line => {
      const cols = line.split('\t');
      if (cols.length < 5) {
        return { studentId: '', name: '', locationId: '', startTime: '', endTime: '', notice: '', error: '列数不足（タブ区切りで5列以上必要）' };
      }
      const [studentId, name, locationName, startTime, endTime, notice] = cols.map(c => c.trim());
      const locId = locationMap.get(locationName) || locationName;
      const validLoc = locations.some(l => l.locationId === locId || l.locationName === locationName);
      return {
        studentId: studentId.toUpperCase(),
        name,
        locationId: locId,
        startTime,
        endTime,
        notice: notice || '',
        error: !validLoc ? `場所「${locationName}」が見つかりません` : undefined,
      };
    });
    setParsed(rows);
  };

  const handleSave = async () => {
    if (!parsed || parsed.some(r => r.error)) return;
    setSaving(true);
    try {
      await adminApi.createShiftsBulk(parsed.map(r => ({
        date,
        studentId: r.studentId,
        name: r.name,
        locationId: r.locationId,
        startTime: r.startTime,
        endTime: r.endTime,
        notice: r.notice,
      })));
      onSave();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗');
    } finally {
      setSaving(false);
    }
  };

  const hasErrors = parsed?.some(r => r.error);

  return (
    <div className="card" style={{ padding: '1.25rem', border: '2px solid #d97706' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>一括追加</h3>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        スプレッドシートからタブ区切りでペーストしてください。<br />
        形式: 学籍番号 → 名前 → 場所名 → 開始時刻 → 終了時刻 → 連絡事項（任意）
      </p>

      {!parsed ? (
        <>
          <textarea
            className="input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'AB12345\t山田 太郎\t受付\t09:00\t12:00\t確認事項あり'}
            rows={8}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '0.75rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onCancel}>
              <X size={16} /> キャンセル
            </button>
            <button className="btn btn-primary" onClick={handleParse} disabled={!text.trim()}
              style={{ background: '#d97706' }}>
              プレビュー
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.375rem' }}>学籍番号</th>
                  <th style={{ textAlign: 'left', padding: '0.375rem' }}>名前</th>
                  <th style={{ textAlign: 'left', padding: '0.375rem' }}>場所</th>
                  <th style={{ textAlign: 'left', padding: '0.375rem' }}>時間</th>
                  <th style={{ textAlign: 'left', padding: '0.375rem' }}>連絡</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: r.error ? '#fef2f2' : undefined,
                  }}>
                    <td style={{ padding: '0.375rem', fontFamily: 'monospace' }}>{r.studentId}</td>
                    <td style={{ padding: '0.375rem' }}>{r.name}</td>
                    <td style={{ padding: '0.375rem' }}>{r.locationId}</td>
                    <td style={{ padding: '0.375rem' }}>{r.startTime}〜{r.endTime}</td>
                    <td style={{ padding: '0.375rem' }}>
                      {r.error ? (
                        <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{r.error}</span>
                      ) : (
                        r.notice
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: hasErrors ? '#dc2626' : '#16a34a', marginBottom: '0.75rem' }}>
            {hasErrors ? 'エラーがあります。修正してください。' : `${parsed.length}件のシフトを追加します`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setParsed(null)}>戻る</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !!hasErrors}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#d97706' }}>
              <Upload size={16} /> {saving ? '保存中...' : '一括保存'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
