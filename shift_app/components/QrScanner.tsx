'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (locationId: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

  const safeStop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop();
      }
    } catch {
      // 既に停止済み
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        try {
          const url = new URL(text);
          const location = url.searchParams.get('location');
          if (location) {
            safeStop().then(() => onScan(location));
            return;
          }
        } catch {
          // URLでない場合
        }
        if (text && !text.includes('://')) {
          safeStop().then(() => onScan(text.trim()));
        }
      },
      () => {},
    ).catch(() => {
      setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。');
    });

    return () => { safeStop(); };
  }, [onScan, safeStop]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <button
        onClick={() => { safeStop().then(onClose); }}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
          width: '2.5rem', height: '2.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white',
        }}
      >
        <X size={20} />
      </button>

      <p style={{ color: 'white', marginBottom: '1rem', fontSize: '0.875rem' }}>
        QRコードをカメラに映してください
      </p>

      <div
        id="qr-reader"
        style={{ width: '300px', borderRadius: '1rem', overflow: 'hidden' }}
      />

      {error && (
        <p style={{ color: '#fca5a5', marginTop: '1rem', fontSize: '0.875rem', textAlign: 'center', padding: '0 1rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
