import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '文化祭シフト管理',
  description: '文化祭当日のシフト・勤怠・鍵管理システム',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '文化祭シフト管理' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
