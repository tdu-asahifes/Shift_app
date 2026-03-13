'use client';
import { useState } from 'react';
import { api } from '@/lib/gas';

type Staff = { id: string; name: string; section: string; role: string };

interface Props {
    staffList: Staff[];
    onSent: (m: string) => void;
    onError: (m: string) => void;
}

const INCIDENT_TYPES = [
    { id: 'injury', icon: '🩹', label: 'ケガ・体調不良' },
    { id: 'trouble', icon: '⚠️', label: 'トラブル・揉め事' },
    { id: 'lost', icon: '🔍', label: '迷子・行方不明' },
    { id: 'facility', icon: '🏚️', label: '設備・施設の問題' },
    { id: 'other', icon: '📋', label: 'その他' },
];

export default function EmergencyReport({ staffList, onSent, onError }: Props) {
    const [reporter, setReporter] = useState('');
    const [location, setLocation] = useState('');
    const [type, setType] = useState('');
    const [detail, setDetail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const selectedType = INCIDENT_TYPES.find(t => t.id === type);

    async function handleSend() {
        if (!reporter) { onError('報告者を選択してください'); return; }
        if (!type) { onError('種別を選択してください'); return; }
        if (!detail.trim()) { onError('詳細を入力してください'); return; }

        setLoading(true);
        try {
            const reporterName = staffList.find(s => s.id === reporter)?.name || reporter;
            const locationText = location ? `📍 ${location}` : '';
            const message = [
                `🚨 **緊急報告**`,
                `報告者: ${reporterName}`,
                locationText,
                `種別: ${selectedType?.icon} ${selectedType?.label}`,
                `詳細: ${detail.trim()}`,
            ].filter(Boolean).join('\n');

            const r = await api.sendNotification('role', ['本部', 'リーダー'], message, '🚨 緊急報告', true);
            if (r.ok) {
                setSent(true);
                onSent(`🚨 緊急報告を送信しました`);
                // 5秒後にフォームリセット
                setTimeout(() => {
                    setSent(false);
                    setReporter(''); setLocation(''); setType(''); setDetail('');
                }, 5000);
            } else {
                onError(r.message || '送信に失敗しました');
            }
        } catch { onError('通信エラーが発生しました'); }
        setLoading(false);
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="text-6xl animate-bounce">✅</div>
                <div className="text-lg font-bold text-green-600">緊急報告を送信しました</div>
                <div className="text-sm text-slate-400">管理者・リーダーに通知されました</div>
                <div className="text-xs text-slate-300">5秒後に自動でリセットされます</div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 警告バナー */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🚨</span>
                <div>
                    <div className="text-sm font-bold text-red-700">緊急報告フォーム</div>
                    <div className="text-xs text-red-500 mt-0.5">送信すると管理者・リーダー全員に即時通知されます</div>
                </div>
            </div>

            {/* 報告者 */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    報告者 <span className="text-red-400">*</span>
                </label>
                <select className="select" value={reporter} onChange={e => setReporter(e.target.value)}>
                    <option value="">-- 自分の名前を選択 --</option>
                    {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}（{s.section}）</option>
                    ))}
                </select>
            </div>

            {/* 場所 */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    発生場所
                </label>
                <input
                    type="text"
                    className="input"
                    placeholder="例: 体育館入口・食品ブースA"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                />
            </div>

            {/* 種別 */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                    種別 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setType(t.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${type === t.id
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            <span className="text-lg">{t.icon}</span>
                            <span className="text-xs font-semibold">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 詳細 */}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    詳細 <span className="text-red-400">*</span>
                </label>
                <textarea
                    className="input resize-none"
                    rows={4}
                    placeholder="状況を具体的に入力してください..."
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                />
            </div>

            {/* 送信プレビュー */}
            {reporter && type && detail && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs space-y-1">
                    <div className="font-semibold text-red-700">送信内容の確認</div>
                    <div className="text-slate-600">
                        <span className="text-red-500 font-medium">
                            {staffList.find(s => s.id === reporter)?.name}
                        </span>
                        {location && ` @ ${location}`}
                    </div>
                    <div className="text-slate-600">{selectedType?.icon} {selectedType?.label}</div>
                    <div className="text-slate-500">{detail}</div>
                    <div className="mt-2 pt-2 border-t border-red-200 text-red-500">
                        📢 管理者・リーダー全員 + Discord #緊急連絡 に送信
                    </div>
                </div>
            )}

            <button
                className="btn btn-danger text-base py-4"
                onClick={handleSend}
                disabled={loading || !reporter || !type || !detail.trim()}
            >
                {loading ? '送信中...' : '🚨 緊急報告を送信する'}
            </button>
        </div>
    );
}