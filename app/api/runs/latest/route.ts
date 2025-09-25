/* @ts-nocheck */
// File: app/api/runs/latest/route.ts
// Returns latest pay_run id (by created_at) so you donâ€™t need psql.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'supabase env missing' }, { status: 500 });

  const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await svc
    .from('pay_runs')
    .select('id, run_number, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ ok: false, error: 'no runs found' }, { status: 404 });

  return NextResponse.json({ ok: true, id: data[0].id, run_number: data[0].run_number, created_at: data[0].created_at });
}


