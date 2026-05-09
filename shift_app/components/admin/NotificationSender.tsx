'use client';
import { useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { Send } from 'lucide-react';

export default function NotificationSender() {
  const [title, setTitle] = useState('お知らせ');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert('タイトルと本文を入力してください');
      return;
    }
    if (!confirm('全スタッフに通知を送信しますか？')) return;

    setSending(true);
    setResult(null);
    try {
      const res = await adminApi.sendNotification(title.trim(), body.trim());
      setResult(res);
      setBody('');
    } catch (e) {
      alert(e instanceof Error ? e.message : '送信に失敗');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>全体通知を送信</h2>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
            タイトル
          </label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
            本文
          </label>
          <textarea
            className="input"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            placeholder="通知の内容を入力してください"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            background: '#d97706', width: '100%', justifyContent: 'center',
          }}
        >
          <Send size={16} />
          {sending ? '送信中...' : '送信'}
        </button>

        {result && (
          <div style={{
            marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
            background: result.failed > 0 ? '#fef9c3' : '#dcfce7',
            fontSize: '0.875rem',
          }}>
            {result.sent}件送信しました
            {result.failed > 0 && `（${result.failed}件失敗）`}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>シフトリマインダー</h2>
        <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          シフト開始5分前に次のシフトを通知し、開始5分後に未打刻の場合は打刻を促す通知が自動送信されます。
          スタッフがアプリで通知を有効にしている場合のみ届きます。
        </p>
      </div>
    </div>
  );
}
