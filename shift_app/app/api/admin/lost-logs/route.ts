import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  let query = getSupabaseAdmin()
    .from('lost_logs')
    .select('*, locations:scanned_location_id(location_name)')
    .order('scanned_at', { ascending: false });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map(r => ({
      id: r.id,
      studentId: r.student_id,
      scannedLocationId: r.scanned_location_id,
      scannedLocationName: r.locations?.location_name || r.scanned_location_id,
      scannedAt: r.scanned_at,
      date: r.date,
    }))
  );
}
