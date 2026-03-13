'use client';
import { useState, useEffect } from 'react';
import { api } from './gas';

export function usePushNotification(staffId: string) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
      setSubscribed(Notification.permission === 'granted');
    }
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('このブラウザはWeb Push通知に対応していません。\niPhoneの場合はSafariでホーム画面に追加してください。');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(key),
      });

      if (staffId) {
        await api.savePushSub(staffId, sub.toJSON());
      }

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push購読エラー:', err);
      return false;
    }
  }

  async function sendPush(subscription: PushSubscriptionJSON, title: string, body: string, tag?: string) {
    try {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, title, body, tag }),
      });
    } catch (err) {
      console.error('Push送信エラー:', err);
    }
  }

  return { permission, subscribed, subscribe, sendPush };
}

// Uint8Array ではなく ArrayBuffer を返すことで型エラーを回避
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) view[i] = rawData.charCodeAt(i);
  return buffer;
}