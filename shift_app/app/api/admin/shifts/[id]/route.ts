import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const update: Record<string, string> = {};
  if (body.date) update.date = body.date;
  if (body.startTime) update.start_time = body.startTime + (body.startTime.length === 5 ? ':00' : '');
  if (body.endTime) update.end_time = body.endTime + (body.endTime.length === 5 ? ':00' : '');
  if (body.name) update.name = body.name;
  if (body.studentId) update.student_id = body.studentId.toUpperCase();
  if (body.locationId) update.location_id = body.locationId;
  if (body.department !== undefined) update.department = body.department;
  if (body.role !== undefined) update.role = body.role;
  if (body.notice !== undefined) update.notice = body.notice;

  const { error } = await getSupabaseAdmin()
    .from('shifts')
    .update(update)
    .eq('id', parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getSupabaseAdmin()
    .from('shifts')
    .delete()
    .eq('id', parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
