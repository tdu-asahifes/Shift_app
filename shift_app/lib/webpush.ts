import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@example.com';

let initialized = false;

function init() {
  if (initialized) return;
  if (!publicKey || !privateKey) {
    throw new Error('VAPID鍵が設定されていません');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendPush(subscription: PushSubscriptionData, payload: PushPayload): Promise<boolean> {
  init();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // サブスクリプション無効
      return false;
    }
    throw err;
  }
}
