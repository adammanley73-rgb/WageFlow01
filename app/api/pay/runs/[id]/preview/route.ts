export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';
import { calculatePay } from '@/lib/payroll/calc';
import type { CalcInput } from '@/lib/payroll/types';

type Params = { params: { id: string } };
const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();

    // Load run
    const { data: run, error: runErr } = await client
      .from('pay_runs')
      .select('id, frequency, period_start, period_end, pay_date')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single();
    if (runErr) return json(400, { error: 'run_not_found', detail: runErr.message });

    // Load employees linked to run
    const { data: pre, error: preErr } = await client
      .from('pay_run_employees')
      .select('id, employee_id')
      .eq('pay_run_id', params.id)
      .eq('company_id', companyId);
    if (preErr) return json(400, { error: 'pre_failed', detail: preErr.message });

    // Fetch employees snapshot
    const empIds = (pre ?? []).map((r) => r.employee_id);
    if (!empIds.length) return json(200, { ok: true, results: [] });

    const { data: emps, error: empErr } = await client
      .from('employees')
      .select(
        'id, tax_code, tax_basis, ni_category, loan_plan, has_pgl, pension_status, is_director, ytd_gross, ytd_tax, ytd_ni_emp, ytd_ni_er, ytd_pension_emp, ytd_pension_er'
      )
      .in('id', empIds)
      .eq('company_id', companyId);
    if (empErr) return json(400, { error: 'employees_failed', detail: empErr.message });

    // Items per run-employee
    const preIds = (pre ?? []).map((r) => r.id);
    const { data: items, error: itemsErr } = await client
      .from('pay_items')
      .select('run_employee_id, type, amount, qty, meta')
      .in('run_employee_id', preIds)
      .eq('company_id', companyId);
    if (itemsErr) return json(400, { error: 'items_failed', detail: itemsErr.message });

    const itemsByPre = new Map<string, any[]>();
    for (const it of items ?? []) {
      const key = (it as any).run_employee_id as string;
      if (!itemsByPre.has(key)) itemsByPre.set(key, []);
      itemsByPre.get(key)!.push({ type: it.type, amount: Number(it.amount), qty: it.qty, meta: it.meta || undefined });
    }

    // Build calc inputs and run stub kernel
    const results = [];
    for (const link of pre ?? []) {
      const emp = (emps ?? []).find((e) => e.id === link.employee_id);
      if (!emp) continue;
      const input: CalcInput = {
        employee: emp as any,
        frequency: run.frequency as any,
        periodStart: run.period_start as any,
        periodEnd: run.period_end as any,
        payDate: run.pay_date as any,
        items: itemsByPre.get(link.id) || [],
      };
      results.push({
        employee_id: link.employee_id,
        run_employee_id: link.id,
        preview: calculatePay(input),
      });
    }

    return json(200, { ok: true, results });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}
