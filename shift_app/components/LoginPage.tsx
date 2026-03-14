'use client';
import { useState } from 'react';
import { api } from '@/lib/gas';

export type UserRole = 'individual' | 'leader' | 'manager' | 'hq';

export interface LoginUser {
  staffId: string;
  name: string;
  section: string;
  team: string;
  role: UserRole;
}

interface Props { onLogin: (user: LoginUser) => void; }

export default function LoginPage({ onLogin }: Props) {
  const [studentId, setStudentId] = useState('');
  const [pw, setPw]               = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handleLogin() {
    const cleanId = studentId.trim().toUpperCase();
    const cleanPw = pw.trim();
    if (!cleanId) { setError('学籍番号を入力してください'); return; }
    if (!cleanPw) { setError('パスワードを入力してください'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.login(cleanId, cleanPw);
      if (res.ok) {
        sessionStorage.setItem('auth', '1');
        sessionStorage.setItem('user', JSON.stringify(res.user));
        onLogin(res.user);
      } else {
        setError(res.message || 'ログインに失敗しました');
      }
    } catch { setError('通信エラーが発生しました'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '5rem', height: '5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '1.5rem', marginBottom: '1rem', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '2.5rem' }}>🏫</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>文化祭シフト管理</h1>
          <p style={{ color: '#bfdbfe', fontSize: '0.875rem', marginTop: '0.5rem' }}>学籍番号と本日のパスワードでログイン</p>
        </div>

        <div style={{ background: 'white', borderRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>学籍番号</label>
            <input
              type="text"
              className="input"
              placeholder="例: A12345"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
              autoCapitalize="characters"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>大文字・小文字どちらでもOK</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>本日のパスワード</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.75rem', color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.875rem' }} onClick={handleLogin} disabled={loading}>
            {loading ? '確認中...' : 'ログイン →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#bfdbfe', fontSize: '0.75rem', marginTop: '1.25rem' }}>
          パスワードは毎朝の全体会議でお知らせします
        </p>
      </div>
    </div>
  );
}
