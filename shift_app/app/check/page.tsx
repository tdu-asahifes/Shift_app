'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { saveLocation } from '@/lib/session';

function CheckInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const location = params.get('location');
    if (location) {
      saveLocation(location);
    }
    router.replace('/');
  }, [params, router]);

  return <p style={{ color: '#94a3b8' }}>リダイレクト中...</p>;
}

export default function CheckPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Suspense fallback={<p style={{ color: '#94a3b8' }}>読み込み中...</p>}>
        <CheckInner />
      </Suspense>
    </div>
  );
}
