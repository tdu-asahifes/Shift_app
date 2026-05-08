import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { data, error } = await getSupabaseAdmin()
    .from('locations')
    .select('*')
    .order('location_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map(r => ({ locationId: r.location_id, locationName: r.location_name, color: r.color || '', category: r.category || '' }))
  );
}

export async function POST(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { locationId, locationName, color, category } = await request.json();
  const row: Record<string, string> = { location_id: locationId, location_name: locationName };
  if (color) row.color = color;
  if (category) row.category = category;
  const { error } = await getSupabaseAdmin().from('locations').insert(row);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
