'use client';
import { useState } from 'react';
import { api, TargetMode } from '@/lib/gas';

type Staff = { id: string; name: string; section: string; role: string };

interface NotificationComposerProps {
  staffList: Staff[];
  onSent: (msg: string) => void;
  onError: (msg: string) => void;
}

const MODE_LABELS: { id: TargetMode; icon: string; label: string; desc: string }[] = [
  { id: 'all',        icon: '👥', label: '全員',     desc: '全スタッフに送信' },
  { id: 'section',    icon: '🏢', label: '局・部門', desc: '局・部門を選んで送信' },
  { id: 'role',       icon: '🎖️', label: '役職',     desc: '役職を選んで送信' },
  { id: 'individual', icon: '👤', label: '個人指定', desc: '1人〜複数人を選んで送信' },
];

export default function NotificationComposer({ staffList, onSent, onError }: NotificationComposerProps) {
  const [mode, setMode]         = useState<TargetMode>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage]   = useState('');
  const [title, setTitle]       = useState('');
  const [urgent, setUrgent]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(false);

  // 局・役職の一覧
  const sections = [...new Set(staffList.map(s => s.section))].sort();
  const roles    = [...new Set(staffList.map(s => s.role))].sort();

  function toggleSelect(val: string) {
    setSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function getTargetLabel() {
    if (mode === 'all') return `全スタッフ（${staffList.length}名）`;
    if (!selected.length) return '未選択';
    if (mode === 'section') return `${selected.join('・')}`;
    if (mode === 'role')    return `${selected.join('・')}`;
    if (mode === 'individual') {
      const names = selected.map(id => staffList.find(s => s.id === id)?.name || id);
      return names.length <= 3 ? names.join('・') : `${names.slice(0, 3).join('・')} 他${names.length - 3}名`;
    }
    return '';
  }

  function getEstimatedCount() {
    if (mode === 'all') return staffList.length;
    if (mode === 'section') return staffList.filter(s => selected.includes(s.section)).length;
    if (mode === 'role')    return staffList.filter(s => selected.includes(s.role)).length;
    return selected.length;
  }

  async function handleSend() {
    if (!message.trim()) { onError('メッセージを入力してください'); return; }
    if (mode !== 'all' && !selected.length) { onError('送信先を選択してください'); return; }
    setLoading(true);
    try {
      const r = await api.sendNotification(mode, selected, message.trim(), title.trim() || undefined, urgent);
      onSent(r.ok ? `✅ ${r.count}名に通知しました` : r.message);
      if (r.ok) { setMessage(''); setTitle(''); setSelected([]); setUrgent(false); setPreview(false); }
    } catch { onError('通信エラーが発生しました'); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* 送信先モード選択 */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">送信先の選び方</label>
        <div className="grid grid-cols-2 gap-2">
          {MODE_LABELS.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setSelected([]); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                mode === m.id ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">{m.icon}</span>
              <div>
                <div className="text-xs font-bold">{m.label}</div>
                <div className="text-xs text-slate-400">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 対象選択エリア */}
      {mode === 'section' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">局・部門を選択</label>
          <div className="flex flex-wrap gap-2">
            {sections.map(s => (
              <button
                key={s}
                onClick={() => toggleSelect(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  selected.includes(s) ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'role' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">役職を選択</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => (
              <button
                key={r}
                onClick={() => toggleSelect(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  selected.includes(r) ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary'
                }`}
              >
                {r === '本部' ? '🏛️' : r === 'リーダー' ? '🎖️' : '👤'} {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'individual' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2">
            スタッフを選択（{selected.length}名選択中）
          </label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-50">
            {staffList.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSelect(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  selected.includes(s.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  selected.includes(s.id) ? 'border-primary bg-primary' : 'border-slate-300'
                }`}>
                  {selected.includes(s.id) && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{s.section}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.role === '本部' ? 'bg-yellow-100 text-yellow-700' :
                  s.role === 'リーダー' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>{s.role}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* メッセージ入力 */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">通知タイトル（省略可）</label>
        <input
          type="text"
          className="input"
          placeholder="例: 全体連絡"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">メッセージ</label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="全員に伝えたい内容を入力..."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </div>

      {/* 緊急フラグ */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setUrgent(!urgent)}
          className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 cursor-pointer ${urgent ? 'bg-red-500' : 'bg-slate-200'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${urgent ? 'translate-x-5' : ''}`} />
        </div>
        <div>
          <span className="text-sm font-medium text-slate-700">🚨 緊急連絡</span>
          <span className="text-xs text-slate-400 ml-2">Discord に @everyone メンション付きで送信</span>
        </div>
      </label>

      {/* 送信プレビュー */}
      {(message || mode !== 'all') && (
        <div className={`px-4 py-3 rounded-xl border text-xs space-y-1 ${urgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="font-semibold text-slate-600">送信内容の確認</div>
          <div className="flex justify-between">
            <span className="text-slate-400">送信先</span>
            <span className="font-medium text-slate-700">{getTargetLabel()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">対象人数</span>
            <span className="font-medium text-primary">{getEstimatedCount()}名</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Discord</span>
            <span className="font-medium">{urgent ? '🚨 #緊急連絡 (@everyone)' : '📢 #緊急連絡'}</span>
          </div>
        </div>
      )}

      <button
        className={`btn ${urgent ? 'btn-danger' : 'btn-primary'}`}
        onClick={handleSend}
        disabled={loading || !message.trim() || (mode !== 'all' && !selected.length)}
      >
        {loading ? '送信中...' : `📨 ${getEstimatedCount()}名に送信`}
      </button>
    </div>
  );
}
