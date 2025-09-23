// paste into: C:\Users\adamm\Projects\wageflow01\app\api\_diag\route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
type Diag = {
  ok: boolean;
  node_env: string | null;
  time: string;
  supabase_url_present: boolean;
  anon_key_present: boolean;
  service_role_present: boolean;
  service_query_ok: boolean;
  service_query_error?: string;
};
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res: Diag = {
    ok: true,
    node_env: process.env.NODE_ENV || null,
    time: new Date().toISOString(),
    supabase_url_present: Boolean(supabaseUrl),
    anon_key_present: Boolean(anonKey),
    service_role_present: Boolean(serviceKey),
    service_query_ok: false
  };
  try {
    if (supabaseUrl && serviceKey) {
      const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { error } = await svc.from('pay_runs').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) {
        res.service_query_ok = false;
        res.service_query_error = error.message;
        res.ok = false;
      } else {
        res.service_query_ok = true;
      }
    } else {
      res.ok = false;
    }
  } catch (e: any) {
    res.service_query_ok = false;
    res.service_query_error = e?.message || String(e);
    res.ok = false;
  }
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
