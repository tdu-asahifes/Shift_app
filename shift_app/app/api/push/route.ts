import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { subscription, title, body, tag } = await req.json();
    const webpush = await import('web-push');
    webpush.default.setVapidDetails(
      'mailto:admin@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || '',
    );
    await webpush.default.sendNotification(subscription, JSON.stringify({ title, body, tag }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
