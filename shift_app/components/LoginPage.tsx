'use client';
import { useState } from 'react';
import { api } from '@/lib/gas';
import { LoginUser } from '@/lib/types';
import { saveSession, getToday } from '@/lib/session';

interface Props {
  onLogin: (user: LoginUser) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [studentId, setStudentId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    const id = studentId.trim();
    const c = code.trim();
    if (!id) { setError('学籍番号を入力してください'); return; }
    if (!/^\d+$/.test(id)) { setError('学籍番号は数字のみで入力してください'); return; }
    if (!c) { setError('ログインコードを入力してください'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await api.login(id, c);
      const user: LoginUser = {
        studentId: id,
        name: res.name,
        loginDate: getToday(),
      };
      saveSession(user);
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
            シフト・出退勤管理
          </h1>
          <p style={{ color: '#bfdbfe', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            学籍番号と当日のコードでログイン
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>
              学籍番号
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="例: 12345678"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem' }}>
              当日のログインコード
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="4桁のコード"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: '#fef2f2', border: '1px solid #fee2e2',
              borderRadius: '0.75rem', color: '#dc2626',
              fontSize: '0.875rem', marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.875rem' }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </div>
      </div>
    </div>
  );
}
