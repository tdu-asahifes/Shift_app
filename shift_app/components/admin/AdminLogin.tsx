'use client';
import { useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { saveAdminSession } from '@/lib/adminSession';
import { Shield } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.login(password);
      saveAdminSession();
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '24rem', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Shield size={40} style={{ color: '#d97706', margin: '0 auto 0.5rem' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>管理画面</h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
            管理者パスワードを入力してください
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
            autoFocus
          />
          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !password}
            style={{ width: '100%', background: '#d97706' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
