// app/api/employees/[id]/bank/route.ts

import { createClient } from '@supabase/supabase-js';

type BankRow = {
  employee_id: string;
  account_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  created_at?: string;
  updated_at?: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const allow = process.env.ALLOW_PREVIEW_WRITES === '1';
  return isPreview && !allow;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) return Response.json({ error: 'missing employee id' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return new Response(null, { status: 204 });

  try {
    const { data } = await supabase
      .from('employee_bank')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (!data) return new Response(null, { status: 204 });
    return Response.json({ data }, { status: 200 });
  } catch (_e) {
    return new Response(null, { status: 204 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) return Response.json({ error: 'missing employee id' }, { status: 400 });

  if (previewWriteBlocked()) {
    return Response.json({ error: 'employees/bank disabled on preview' }, { status: 403 });
  }

  let body: Partial<BankRow> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const row: BankRow = {
    employee_id: employeeId,
    account_name: body.account_name ?? null,
    sort_code: body.sort_code ?? null,
    account_number: body.account_number ?? null,
  };

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ id: employeeId, data: row }, { status: 201 });
  }

  try {
    const { data } = await supabase
      .from('employee_bank')
      .upsert(row, { onConflict: 'employee_id' })
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    return Response.json({ id: employeeId, data }, { status: 201 });
  } catch (e: any) {
    return Response.json(
      { id: employeeId, data: row, warning: 'db_write_failed', detail: String(e?.message || e) },
      { status: 201 }
    );
  }
}