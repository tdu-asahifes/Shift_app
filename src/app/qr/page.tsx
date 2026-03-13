'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginUser } from '@/components/LoginPage';

// QRコードはGoogle Charts APIを使って生成
function QRImage({ url }: { url: string }) {
    const encoded = encodeURIComponent(url);
    return (
        <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`}
            alt={url}
            className="w-40 h-40 mx-auto"
        />
    );
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
    const [user, setUser] = useState<LoginUser | null>(null);
    const [appUrl, setAppUrl] = useState('');
    const [booths, setBooths] = useState(DEFAULT_BOOTHS);
    const [newId, setNewId] = useState('');
    const [newName, setNewName] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('user');
        const auth = sessionStorage.getItem('auth');
        if (!auth || !stored) { router.push('/'); return; }
        const u: LoginUser = JSON.parse(stored);
        if (u.role !== 'manager' && u.role !== 'hq') { router.push('/'); return; }
        setUser(u);
        setAppUrl(window.location.origin);
    }, []);

    function addBooth() {
        if (!newId || !newName) return;
        setBooths(prev => [...prev, { id: newId.toUpperCase(), name: newName }]);
        setNewId(''); setNewName('');
    }

    function removeBooth(id: string) {
        setBooths(prev => prev.filter(b => b.id !== id));
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-primary text-white px-4 h-14 flex items-center gap-3 sticky top-0 z-40">
                <button onClick={() => router.push('/')} className="text-blue-200 hover:text-white">←</button>
                <span className="font-bold">QRコード管理</span>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <div className="card space-y-3">
                    <h2 className="font-bold text-slate-700">➕ ブースを追加</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" className="input" placeholder="ブースID（例: BOOTH-D01）" value={newId} onChange={e => setNewId(e.target.value)} />
                        <input type="text" className="input" placeholder="ブース名（例: 音楽室）" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={addBooth}>追加</button>
                </div>

                <p className="text-xs text-slate-400 text-center">各QRを長押し→画像保存、またはページを印刷してください</p>

                <div className="grid grid-cols-2 gap-4">
                    {booths.map(b => {
                        const url = `${appUrl}/scan?booth=${b.id}&name=${encodeURIComponent(b.name)}`;
                        return (
                            <div key={b.id} className="card text-center space-y-3 py-5">
                                <QRImage url={url} />
                                <div>
                                    <div className="font-bold text-slate-700">{b.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{b.id}</div>
                                </div>
                                <button className="text-xs text-red-400 hover:text-red-600" onClick={() => removeBooth(b.id)}>削除</button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}