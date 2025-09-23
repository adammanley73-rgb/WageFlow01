// File: app/api/preview/route.ts
// Minimal preview: sums BASIC items and returns gross, TAX=0, NET=gross

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type PreviewRow = {
  run_employee_id: string;
  employee_id: string;
  gross: number;
  tax: number;
  net: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId') || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!runId) return NextResponse.json({ ok: false, error: 'runId required' }, { status: 400 });
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'supabase env missing' }, { status: 500 });

  const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: runEmployees, error: reErr } = await svc
    .from('pay_run_employees')
    .select('id, employee_id, company_id')
    .eq('pay_run_id', runId);

  if (reErr) return NextResponse.json({ ok: false, error: reErr.message }, { status: 500 });

  const results: PreviewRow[] = [];
  for (const re of runEmployees || []) {
    const { data: items, error: itemsErr } = await svc
      .from('pay_items')
      .select('type, amount, qty')
      .eq('run_employee_id', re.id)
      .eq('company_id', re.company_id);

    if (itemsErr) return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });

    const gross = (items || []).filter(i => i.type === 'BASIC')
      .reduce((sum, i) => sum + Number(i.amount || 0) * Number(i.qty || 1), 0);

    const tax = 0;
    const net = gross - tax;

    results.push({ run_employee_id: re.id, employee_id: re.employee_id, gross, tax, net });
  }

  const totals = results.reduce((t, r) => ({ gross: t.gross + r.gross, tax: t.tax + r.tax, net: t.net + r.net }),
    { gross: 0, tax: 0, net: 0 });

  return NextResponse.json({ ok: true, runId, count: results.length, totals, results });
}
