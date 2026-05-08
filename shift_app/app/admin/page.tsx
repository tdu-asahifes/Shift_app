'use client';
import { useState, useEffect } from 'react';
import { getAdminSession } from '@/lib/adminSession';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLoggedIn(getAdminSession());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!loggedIn) {
    return <AdminLogin onLogin={() => setLoggedIn(true)} />;
  }

  return <AdminShell onLogout={() => setLoggedIn(false)} />;
}
