import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPush } from '@/lib/webpush';

export async function POST(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { title, body } = await request.json();
  if (!title || !body) {
    return NextResponse.json({ error: 'タイトルと本文は必須です' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  const expiredIds: number[] = [];

  for (const sub of subs) {
    const ok = await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
      { title, body, url: '/' }
    );
    if (ok) {
      sent++;
    } else {
      failed++;
      expiredIds.push(sub.id);
    }
  }

  // 期限切れサブスクリプションを削除
  if (expiredIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return NextResponse.json({ sent, failed });
}
