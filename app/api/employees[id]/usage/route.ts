// app/api/employees/[id]/usage/route.ts
// Purpose: Report whether an employee is referenced by payroll tables.
// Safe on fresh DBs where those tables may not exist yet.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ok = {
  ok: true;
  id: string;
  in_use: boolean;
  details: { payroll_run_employees: number; payroll_entries: number; total: number };
};

type Err = { ok: false; code: string; message: string };

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function bad(message: string, code = 'BAD_REQUEST'): NextResponse<Err> {
  return NextResponse.json({ ok: false, code, message }, { status: 400 });
}

export async function GET(_: Request, ctx: { params: { id: string } }): Promise<NextResponse<Ok | Err>> {
  const id = ctx.params?.id;
  if (!id || !isUuid(id)) return bad('Invalid employee id.');
  const supabase = getServiceClient();
  if (!supabase) return bad('Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.local');

  // Count helper that tolerates missing tables
  async function safeCount(table: string): Promise<number> {
    const { count, error } = await supabase.from(table).select('employee_id', { count: 'exact', head: true }).eq('employee_id', id);
    if (error) {
      // Missing table or other schema mismatch. Fail safe to 0.
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  }

  const [preCount, peCount] = await Promise.all([
    safeCount('payroll_run_employees'),
    safeCount('payroll_entries'),
  ]);

  const total = preCount + peCount;

  return NextResponse.json(
    { ok: true, id, in_use: total > 0, details: { payroll_run_employees: preCount, payroll_entries: peCount, total } },
    { status: 200 }
  );
}
