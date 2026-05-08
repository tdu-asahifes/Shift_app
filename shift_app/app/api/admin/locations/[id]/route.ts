import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { locationName, color } = await request.json();
  const update: Record<string, string> = {};
  if (locationName !== undefined) update.location_name = locationName;
  if (color !== undefined) update.color = color;
  const { error } = await getSupabaseAdmin()
    .from('locations')
    .update(update)
    .eq('location_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from('locations')
    .delete()
    .eq('location_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
