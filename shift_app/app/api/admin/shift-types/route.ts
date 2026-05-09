import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { data, error } = await getSupabaseAdmin()
    .from('shift_types')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map(r => ({
      name: r.name,
      personInCharge: r.person_in_charge || '',
      minPeople: r.min_people || 0,
      category: r.category || '',
      color: r.color || '',
    }))
  );
}
