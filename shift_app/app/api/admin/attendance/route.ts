import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toLocaleDateString('sv-SE');

  // シフトと出勤データを一括取得
  const [shiftsRes, attendanceRes] = await Promise.all([
    getSupabaseAdmin()
      .from('shifts')
      .select('*, locations(location_name)')
      .eq('date', date)
      .order('start_time'),
    getSupabaseAdmin()
      .from('attendance')
      .select('*, locations(location_name)')
      .eq('date', date),
  ]);

  if (shiftsRes.error) return NextResponse.json({ error: shiftsRes.error.message }, { status: 500 });
  if (attendanceRes.error) return NextResponse.json({ error: attendanceRes.error.message }, { status: 500 });

  const shifts = shiftsRes.data || [];
  const attendance = attendanceRes.data || [];

  // 場所ごとにグルーピング
  const locationMap = new Map<string, {
    locationId: string;
    locationName: string;
    members: {
      studentId: string;
      name: string;
      shiftTime: string;
      status: 'working' | 'left' | 'not_yet';
      checkInAt: string | null;
    }[];
  }>();

  for (const s of shifts) {
    const locId = s.location_id;
    if (!locationMap.has(locId)) {
      locationMap.set(locId, {
        locationId: locId,
        locationName: s.locations?.location_name || locId,
        members: [],
      });
    }

    // この人のこの場所での出勤記録を探す
    const rec = attendance.find(
      a => a.student_id.toUpperCase() === s.student_id.toUpperCase() && a.location_id === locId
    );

    let status: 'working' | 'left' | 'not_yet' = 'not_yet';
    if (rec && !rec.check_out_at) status = 'working';
    else if (rec && rec.check_out_at) status = 'left';

    locationMap.get(locId)!.members.push({
      studentId: s.student_id,
      name: s.name,
      shiftTime: `${s.start_time.slice(0, 5)}〜${s.end_time.slice(0, 5)}`,
      status,
      checkInAt: rec ? new Date(rec.check_in_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null,
    });
  }

  const result = Array.from(locationMap.values()).map(loc => ({
    ...loc,
    summary: {
      working: loc.members.filter(m => m.status === 'working').length,
      left: loc.members.filter(m => m.status === 'left').length,
      notYet: loc.members.filter(m => m.status === 'not_yet').length,
      total: loc.members.length,
    },
  }));

  return NextResponse.json(result);
}
