import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:example@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || '',
);

export async function POST(req: NextRequest) {
  try {
    const { subscription, title, body, tag, url } = await req.json();

    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, tag: tag || 'festival', url: url || '/' }),
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Push送信エラー:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
