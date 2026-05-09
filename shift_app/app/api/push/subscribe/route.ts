import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const { studentId, subscription } = await request.json();

  if (!studentId || !subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: '無効なリクエスト' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('push_subscriptions')
    .upsert({
      student_id: studentId.toUpperCase(),
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys.p256dh,
      keys_auth: subscription.keys.auth,
    }, { onConflict: 'endpoint' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
