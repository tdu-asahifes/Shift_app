import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const authError = await verifyAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const baseUrl = searchParams.get('baseUrl');
  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrlパラメータが必要です' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('locations')
    .select('location_id, location_name')
    .order('location_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.all(
    (data || []).map(async (loc) => {
      const url = `${baseUrl}/check?location=${loc.location_id}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      return {
        locationId: loc.location_id,
        locationName: loc.location_name,
        url,
        qrDataUrl: dataUrl,
      };
    })
  );

  return NextResponse.json(results);
}
