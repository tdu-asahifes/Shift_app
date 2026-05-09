import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPush, PushSubscriptionData } from '@/lib/webpush';

export async function GET(request: Request) {
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
  const nowMinutes = jstNow.getHours() * 60 + jstNow.getMinutes();

  function timeToMin(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function fmtTime(t: string) {
    return t.slice(0, 5);
  }

  // 今日のシフトを全部取得（開始前後のものをフィルタするため）
  const { data: shifts, error: shiftErr } = await db
    .from('shifts')
    .select('id, student_id, start_time, location_id, locations(location_name)')
    .eq('date', today);

  if (shiftErr) return NextResponse.json({ error: shiftErr.message }, { status: 500 });
  if (!shifts || shifts.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象シフトなし' });
  }

  // 1. 開始3〜7分前のシフト → 事前リマインダー
  // 2. 開始3〜7分後のシフト → 未打刻チェック
  const preReminder = shifts.filter(s => {
    const diff = timeToMin(s.start_time) - nowMinutes;
    return diff >= 3 && diff <= 7;
  });

  const postReminder = shifts.filter(s => {
    const diff = nowMinutes - timeToMin(s.start_time);
    return diff >= 3 && diff <= 7;
  });

  // 未打刻チェック用: 出勤データ取得
  const postStudentIds = [...new Set(postReminder.map(s => s.student_id))];
  let attendanceMap = new Map<string, Set<string>>(); // student_id -> Set<location_id>
  if (postStudentIds.length > 0) {
    const { data: attendance } = await db
      .from('attendance')
      .select('student_id, location_id')
      .eq('date', today)
      .in('student_id', postStudentIds);

    if (attendance) {
      for (const a of attendance) {
        if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, new Set());
        attendanceMap.get(a.student_id)!.add(a.location_id);
      }
    }
  }

  // 未打刻のシフトだけ抽出
  const unchecked = postReminder.filter(s => {
    const locs = attendanceMap.get(s.student_id);
    return !locs || !locs.has(s.location_id);
  });

  // 通知対象の学籍番号を収集
  const allStudentIds = [...new Set([
    ...preReminder.map(s => s.student_id),
    ...unchecked.map(s => s.student_id),
  ])];

  if (allStudentIds.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象者なし' });
  }

  const { data: subs } = await db
    .from('push_subscriptions')
    .select('*')
    .in('student_id', allStudentIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象サブスクリプションなし' });
  }

  let sent = 0;
  const expiredIds: number[] = [];

  async function notify(studentId: string, title: string, body: string) {
    const matched = subs!.filter(s => s.student_id === studentId);
    for (const sub of matched) {
      const subData: PushSubscriptionData = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      };
      const ok = await sendPush(subData, { title, body, url: '/' });
      if (ok) sent++;
      else expiredIds.push(sub.id);
    }
  }

  // 事前リマインダー送信
  for (const shift of preReminder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locName = (shift as any).locations?.location_name || shift.location_id;
    await notify(
      shift.student_id,
      '次のシフト',
      `${fmtTime(shift.start_time)}〜 ${locName}`,
    );
  }

  // 未打刻リマインダー送信
  for (const shift of unchecked) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locName = (shift as any).locations?.location_name || shift.location_id;
    await notify(
      shift.student_id,
      '打刻してください',
      `${locName}のシフトが始まっています（${fmtTime(shift.start_time)}〜）`,
    );
  }

  if (expiredIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return NextResponse.json({
    sent,
    preReminder: preReminder.length,
    unchecked: unchecked.length,
  });
}
