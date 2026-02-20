// @ts-nocheck
// app/api/employees/[id]/p45/route.ts

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type P45Row = {
  employee_id: string;
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null;     // ISO date
  tax_code: string | null;
  tax_basis: 'Cumulative' | 'Week1Month1' | null;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
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

// Only block writes on real previews unless explicitly allowed.
function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const allow = process.env.ALLOW_PREVIEW_WRITES === '1';
  return isPreview && !allow;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) return Response.json({ error: 'missing employee id' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return new Response(null, { status: 204 });

  try {
    const { data } = await supabase
      .from('employee_p45')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (!data) return new Response(null, { status: 204 });
    return Response.json({ data }, { status: 200 });
  } catch (_e) {
    // Table missing or RLS block. Don't break the wizard.
    return new Response(null, { status: 204 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) return Response.json({ error: 'missing employee id' }, { status: 400 });

  if (previewWriteBlocked()) {
    return Response.json({ error: 'employees/p45 disabled on preview' }, { status: 403 });
  }

  let body: Partial<P45Row> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const row: P45Row = {
    employee_id: employeeId,
    employer_paye_ref: body.employer_paye_ref ?? null,
    employer_name: body.employer_name ?? null,
    works_number: body.works_number ?? null,
    leaving_date: body.leaving_date ?? null,
    tax_code: body.tax_code ?? null,
    tax_basis: (body.tax_basis as any) ?? null,
    total_pay_to_date: body.total_pay_to_date ?? null,
    total_tax_to_date: body.total_tax_to_date ?? null,
    had_student_loan_deductions: body.had_student_loan_deductions ?? null,
  };

  const supabase = getSupabase();
  if (!supabase) {
    // No DB configured; allow wizard to proceed in dev.
    return Response.json({ id: employeeId, data: row }, { status: 201 });
  }

  try {
    // Upsert by employee_id so repeated saves update.
    const { data } = await supabase
      .from('employee_p45')
      .upsert(row, { onConflict: 'employee_id' })
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    return Response.json({ id: employeeId, data }, { status: 201 });
  } catch (e: any) {
    // Don't block the wizard. Return success with a warning.
    return Response.json(
      { id: employeeId, data: row, warning: 'db_write_failed', detail: String(e?.message || e) },
      { status: 201 }
    );
  }
}
