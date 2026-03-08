'use client';
import { useState } from 'react';
import { api } from '@/lib/gas';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!pw.trim()) { setError('パスワードを入力してください'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.checkPassword(pw.trim());
      if (res.ok) { sessionStorage.setItem('auth', '1'); onLogin(); }
      else setError(res.message || 'パスワードが違います');
    } catch { setError('通信エラーが発生しました'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center p-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
            <span className="text-4xl">🏫</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">文化祭シフト管理</h1>
          <p className="text-blue-100 text-sm mt-2">本日のパスワードを入力してください</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">パスワード</label>
            <input
              type="password"
              className="input text-base"
              placeholder="••••••••"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          <button className="btn btn-primary text-base py-3.5" onClick={handleLogin} disabled={loading}>
            {loading ? '確認中...' : '入室する →'}
          </button>
        </div>

        <p className="text-center text-blue-200 text-xs mt-5">
          毎朝の全体会議でパスワードをお知らせします
        </p>
      </div>
    </div>
  );
}
