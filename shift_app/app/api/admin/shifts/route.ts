import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  let query = getSupabaseAdmin()
    .from('shifts')
    .select('*, locations(location_name)')
    .order('start_time');

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map(r => ({
      id: r.id,
      date: r.date,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      name: r.name,
      studentId: r.student_id,
      locationId: r.location_id,
      locationName: r.locations?.location_name || r.location_id,
      notice: r.notice || '',
    }))
  );
}

export async function POST(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const body = await request.json();
  const rows = Array.isArray(body) ? body : [body];

  const inserts = rows.map(r => ({
    date: r.date,
    start_time: r.startTime + (r.startTime.length === 5 ? ':00' : ''),
    end_time: r.endTime + (r.endTime.length === 5 ? ':00' : ''),
    name: r.name,
    student_id: r.studentId.toUpperCase(),
    location_id: r.locationId,
    notice: r.notice || '',
  }));

  const { error } = await getSupabaseAdmin().from('shifts').insert(inserts);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: inserts.length });
}
