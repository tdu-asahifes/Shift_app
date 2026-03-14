'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginUser } from '@/components/LoginPage';

function QRImage({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`} alt={url} style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }} />;
}

const DEFAULT_BOOTHS = [
  { id: 'BOOTH-A01', name: '本部' },
  { id: 'BOOTH-A02', name: '体育館入口' },
  { id: 'BOOTH-A03', name: '校舎入口' },
  { id: 'BOOTH-B01', name: '食品ゾーン' },
  { id: 'BOOTH-B02', name: '展示ゾーン' },
  { id: 'BOOTH-C01', name: '駐輪場' },
];

export default function QRPage() {
  const router = useRouter();
  const [appUrl, setAppUrl] = useState('');
  const [booths, setBooths] = useState(DEFAULT_BOOTHS);
  const [newId, setNewId]   = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    const auth   = sessionStorage.getItem('auth');
    if (!auth || !stored) { router.push('/'); return; }
    const u: LoginUser = JSON.parse(stored);
    if (u.role !== 'manager' && u.role !== 'hq') { router.push('/'); return; }
    setAppUrl(window.location.origin);
  }, [router]);

  function addBooth() {
    if (!newId || !newName) return;
    setBooths(prev => [...prev, { id: newId.toUpperCase(), name: newName }]);
    setNewId(''); setNewName('');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#2563eb', color: 'white', padding: '0 1rem', height: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/')} style={{ color: '#bfdbfe', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>←</button>
        <span style={{ fontWeight: 'bold' }}>QRコード管理</span>
      </nav>

      <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: '#334155' }}>➕ ブースを追加</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input className="input" placeholder="ブースID（例: BOOTH-D01）" value={newId} onChange={e => setNewId(e.target.value)} />
            <input className="input" placeholder="ブース名（例: 音楽室）" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={addBooth}>追加</button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>各QRを長押し→画像保存、またはページを印刷してください</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {booths.map(b => {
            const url = `${appUrl}/scan?booth=${b.id}&name=${encodeURIComponent(b.name)}`;
            return (
              <div key={b.id} className="card" style={{ textAlign: 'center' }}>
                <QRImage url={url} />
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#334155' }}>{b.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{b.id}</div>
                </div>
                <button onClick={() => setBooths(prev => prev.filter(x => x.id !== b.id))}
                  style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
