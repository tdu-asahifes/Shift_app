import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { data, error } = await getSupabaseAdmin()
    .from('daily_codes')
    .select('*')
    .order('date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map(r => ({ date: r.date, code: r.code }))
  );
}

export async function POST(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { date, code } = await request.json();
  const { error } = await getSupabaseAdmin()
    .from('daily_codes')
    .upsert({ date, code }, { onConflict: 'date' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
