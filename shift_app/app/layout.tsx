import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'シフト・出退勤管理',
  description: '学園祭実行委員向けシフト・出退勤管理システム',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'シフト管理' },
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
