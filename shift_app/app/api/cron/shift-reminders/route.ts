import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPush } from '@/lib/webpush';

export async function GET(request: Request) {
  // CRON_SECRETで認証
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // 現在時刻（JST）
  const now = new Date();
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const today = jstNow.toISOString().slice(0, 10);

  // 10〜20分後のシフトを検索
  const from = new Date(jstNow.getTime() + 10 * 60 * 1000);
  const to = new Date(jstNow.getTime() + 20 * 60 * 1000);
  const fromTime = `${String(from.getHours()).padStart(2, '0')}:${String(from.getMinutes()).padStart(2, '0')}:00`;
  const toTime = `${String(to.getHours()).padStart(2, '0')}:${String(to.getMinutes()).padStart(2, '0')}:00`;

  const { data: shifts, error: shiftErr } = await db
    .from('shifts')
    .select('student_id, start_time, location_id, locations(location_name)')
    .eq('date', today)
    .gte('start_time', fromTime)
    .lt('start_time', toTime);

  if (shiftErr) return NextResponse.json({ error: shiftErr.message }, { status: 500 });
  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象シフトなし' });
  }

  // 対象者のサブスクリプションを取得
  const studentIds = [...new Set(shifts.map(s => s.student_id))];
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('*')
    .in('student_id', studentIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象サブスクリプションなし' });
  }

  let sent = 0;
  const expiredIds: number[] = [];

  for (const shift of shifts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locName = (shift as any).locations?.location_name || shift.location_id;
    const time = String(shift.start_time).slice(0, 5);
    const matchedSubs = subs.filter(s => s.student_id === shift.student_id);

    for (const sub of matchedSubs) {
      const ok = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        {
          title: 'シフト開始のお知らせ',
          body: `${locName}のシフトが${time}から始まります`,
          url: '/',
        }
      );
      if (ok) sent++;
      else expiredIds.push(sub.id);
    }
  }

  if (expiredIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return NextResponse.json({ sent, shifts: shifts.length });
}
