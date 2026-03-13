'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/gas';
import { LoginUser } from '@/components/LoginPage';

type State = 'loading' | 'confirm' | 'success' | 'error' | 'login_required';

function ScanContent() {
    const params = useSearchParams();
    const router = useRouter();
    const boothId = params.get('booth') || '';
    const boothName = params.get('name') || boothId;

    const [user, setUser] = useState<LoginUser | null>(null);
    const [state, setState] = useState<State>('loading');
    const [action, setAction] = useState<'checkin' | 'checkout'>('checkin');
    const [message, setMessage] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('user');
        const auth = sessionStorage.getItem('auth');
        if (!auth || !stored) { setState('login_required'); return; }
        try {
            const u: LoginUser = JSON.parse(stored);
            setUser(u);
            checkCurrentStatus(u);
        } catch { setState('login_required'); }
    }, []);

    async function checkCurrentStatus(u: LoginUser) {
        try {
            const r = await api.getAttendance();
            if (r.ok) {
                const myRecord = (r.attendance ?? []).find(
                    (a: { staffId: string; status: string; checkOut: string }) =>
                        a.staffId === u.staffId && a.status === '出勤' && !a.checkOut
                );
                setAction(myRecord ? 'checkout' : 'checkin');
            }
        } catch { }
        setState('confirm');
    }

    async function handleConfirm() {
        if (!user || processing) return;
        setProcessing(true);
        try {
            const r = action === 'checkin'
                ? await api.checkIn(user.staffId, boothName)
                : await api.checkOut(user.staffId);
            if (r.ok) { setMessage(r.message); setState('success'); }
            else { setMessage(r.message || '記録に失敗しました'); setState('error'); }
        } catch { setMessage('通信エラーが発生しました'); setState('error'); }
        setProcessing(false);
    }

    if (state === 'login_required') return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="card max-w-sm w-full text-center space-y-4 py-8">
                <div className="text-5xl">🔒</div>
                <h2 className="font-bold text-slate-700">ログインが必要です</h2>
                <p className="text-sm text-slate-500">先にアプリにログインしてから<br />QRを読み取ってください</p>
                <button className="btn btn-primary" onClick={() => router.push('/')}>ログイン画面へ</button>
            </div>
        </div>
    );

    if (state === 'loading') return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <div className="text-5xl">⏳</div>
                <p className="text-slate-400 text-sm mt-3">確認中...</p>
            </div>
        </div>
    );

    if (state === 'success') return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="card max-w-sm w-full text-center space-y-4 py-8">
                <div className="text-6xl animate-bounce">{action === 'checkin' ? '✅' : '👋'}</div>
                <h2 className={`font-bold text-lg ${action === 'checkin' ? 'text-green-600' : 'text-orange-500'}`}>
                    {action === 'checkin' ? '出勤しました！' : '退勤しました！'}
                </h2>
                <p className="text-sm text-slate-500">{message}</p>
                <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-xs text-slate-400 mt-1">📍 {boothName}</div>
                </div>
                <button className="btn btn-outline" onClick={() => router.push('/')}>ホームに戻る</button>
            </div>
        </div>
    );

    if (state === 'error') return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="card max-w-sm w-full text-center space-y-4 py-8">
                <div className="text-5xl">❌</div>
                <h2 className="font-bold text-red-600">記録に失敗しました</h2>
                <p className="text-sm text-slate-500">{message}</p>
                <button className="btn btn-outline" onClick={() => setState('confirm')}>もう一度</button>
                <button className="btn btn-outline" onClick={() => router.push('/')}>ホームに戻る</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="card max-w-sm w-full space-y-5 py-6">
                <div className={`text-center py-4 rounded-2xl ${action === 'checkin' ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className="text-5xl mb-2">{action === 'checkin' ? '✅' : '👋'}</div>
                    <div className={`text-xl font-bold ${action === 'checkin' ? 'text-green-600' : 'text-orange-500'}`}>
                        {action === 'checkin' ? '出勤する' : '退勤する'}
                    </div>
                </div>

                <div className="space-y-2">
                    {[
                        ['名前', user?.name],
                        ['所属', user?.section],
                        ['📍 場所', boothName],
                        ['時刻', new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between px-3 py-2.5 bg-slate-50 rounded-xl">
                            <span className="text-sm text-slate-500">{label}</span>
                            <span className="text-sm font-medium">{value}</span>
                        </div>
                    ))}
                </div>

                <button
                    className={`btn text-base py-4 ${action === 'checkin' ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleConfirm}
                    disabled={processing}
                >
                    {processing ? '記録中...' : action === 'checkin' ? '📥 出勤を記録する' : '📤 退勤を記録する'}
                </button>
                <button className="btn btn-outline text-sm" onClick={() => router.push('/')}>キャンセル</button>
            </div>
        </div>
    );
}

export default function ScanPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-400">読み込み中...</div></div>}>
            <ScanContent />
        </Suspense>
    );
}