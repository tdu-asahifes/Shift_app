import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey)
  : null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  }
  return supabaseAdmin;
}
