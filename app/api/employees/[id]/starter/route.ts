// @ts-nocheck
// app/api/employees/[id]/starter/route.ts

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type StarterRow = {
  employee_id: string;
  p45_provided: boolean | null;
  starter_declaration: 'A' | 'B' | 'C' | null;
  student_loan_plan: 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | null;
  postgraduate_loan: boolean | null;
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

// Only block writes on real preview builds unless explicitly allowed.
function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const allow = process.env.ALLOW_PREVIEW_WRITES === '1';
  return isPreview && !allow;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) {
    return Response.json({ error: 'missing employee id' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // No DB configured; treat as empty so the wizard can run locally.
    return new Response(null, { status: 204 });
  }

  try {
    const { data } = await supabase
      .from('employee_starters')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (!data) return new Response(null, { status: 204 });
    return Response.json({ data }, { status: 200 });
  } catch (_e) {
    // Table missing, RLS denied, etc. Don't block the wizard.
    return new Response(null, { status: 204 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const employeeId = String(params?.id || '').trim();
  if (!employeeId) {
    return Response.json({ error: 'missing employee id' }, { status: 400 });
  }

  if (previewWriteBlocked()) {
    return Response.json({ error: 'employees/starter disabled on preview' }, { status: 403 });
  }

  let body: Partial<StarterRow> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const row: StarterRow = {
    employee_id: employeeId,
    p45_provided: body.p45_provided ?? null,
    starter_declaration: body.p45_provided ? null : (body.starter_declaration as any) ?? null,
    student_loan_plan:
      body.student_loan_plan && body.student_loan_plan !== 'none'
        ? (body.student_loan_plan as any)
        : null,
    postgraduate_loan: body.postgraduate_loan ?? null,
  };

  const supabase = getSupabase();
  if (!supabase) {
    // No DB; allow wizard to proceed in dev.
    return Response.json({ id: employeeId, data: row }, { status: 201 });
  }

  try {
    // Upsert by employee_id so repeated saves just update.
    const { data } = await supabase
      .from('employee_starters')
      .upsert(row, { onConflict: 'employee_id' })
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    return Response.json({ id: employeeId, data }, { status: 201 });
  } catch (e: any) {
    // Do not block the wizard; surface a warning so you know DB write failed.
    return Response.json(
      { id: employeeId, data: row, warning: 'db_write_failed', detail: String(e?.message || e) },
      { status: 201 }
    );
  }
}
