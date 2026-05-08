import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '管理画面 | シフト管理',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
