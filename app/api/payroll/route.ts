import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

type RunRow = {
  pay_run_id: string;
  run_number: string | null;
  pay_date: string | null;
  status: string | null;
  total_gross_pay: number | null;
  total_net_pay: number | null;
  total_deductions: number | null;
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_pay_run_totals')
      .select('pay_run_id, run_number, pay_date, status, total_gross_pay, total_net_pay, total_deductions')
      .order('pay_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to load payroll runs' }, { status: 500 });
    }

    const runs = (data ?? []).map((r: RunRow) => ({
      id: r.pay_run_id,
      runNumber: r.run_number ?? '',
      payDate: r.pay_date,
      status: (r.status ?? 'draft') as 'draft' | 'processing' | 'approved' | 'rti_submitted' | 'completed',
      totalGrossPay: Number(r.total_gross_pay ?? 0),
      totalNetPay: Number(r.total_net_pay ?? 0),
      totalDeductions: Number(
        r.total_deductions ?? Math.max(0, Number(r.total_gross_pay ?? 0) - Number(r.total_net_pay ?? 0))
      ),
    }));

    return NextResponse.json(runs);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const frequency = String(body?.frequency ?? '').toLowerCase();
    if (!['weekly', 'monthly', 'fortnightly', 'four_weekly'].includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const today = new Date();
    let period_start: string, period_end: string, pay_date: string, run_number: string;

    if (frequency === 'monthly') {
      const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      const lastMonthStart = new Date(Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - 1, 1));
      const lastMonthEnd = new Date(Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth(), 0));
      const defaultPayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 25));

      period_start = lastMonthStart.toISOString().slice(0, 10);
      period_end = lastMonthEnd.toISOString().slice(0, 10);
      pay_date = defaultPayDate.toISOString().slice(0, 10);
      run_number = `M${lastMonthStart.getUTCFullYear()}${String(lastMonthStart.getUTCMonth() + 1).padStart(2, '0')}-M`;
    } else {
      const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const recentFriday = new Date(base);
      const deltaToFriday = (recentFriday.getUTCDay() + 2) % 7;
      recentFriday.setUTCDate(recentFriday.getUTCDate() - deltaToFriday);

      const periodStart = new Date(recentFriday);
      periodStart.setUTCDate(recentFriday.getUTCDate() - 7);
      const periodEnd = new Date(recentFriday);
      periodEnd.setUTCDate(recentFriday.getUTCDate() - 1);
      const payDate = recentFriday;

      period_start = periodStart.toISOString().slice(0, 10);
      period_end = periodEnd.toISOString().slice(0, 10);
      pay_date = payDate.toISOString().slice(0, 10);

      const iso = new Date(periodStart);
      const w = getISOWeek(iso);
      run_number = `W${iso.getUTCFullYear()}${String(w).padStart(2, '0')}-W`;
    }

    const { data: runInsert, error: runErr } = await supabase
      .from('pay_runs')
      .insert({
        run_number,
        period_start,
        period_end,
        pay_date,
        frequency,
        status: 'draft',
      })
      .select('id')
      .single();

    if (runErr || !runInsert?.id) {
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
    }

    const runId = runInsert.id as string;

    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('employee_id, annual_salary, pay_frequency, status')
      .eq('status', 'active')
      .eq('pay_frequency', frequency);

    if (empErr) {
      return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 });
    }

    const rows = (emps ?? []).map((e) => ({
      pay_run_id: runId,
      employee_id: e.employee_id,
      gross_pay: frequency === 'monthly' ? Number((e.annual_salary ?? 0) / 12) : Number((e.annual_salary ?? 0) / 52),
      paye_tax: 0,
      employee_ni: 0,
      employer_ni: 0,
      pension_employee: 0,
      pension_employer: 0,
      ssp_pay: 0,
      other_additions: 0,
      other_deductions: 0,
      net_pay:
        frequency === 'monthly'
          ? Number(((e.annual_salary ?? 0) / 12) * 0.85)
          : Number(((e.annual_salary ?? 0) / 52) * 0.88),
    }));

    if (rows.length > 0) {
      const { error: preErr } = await supabase.from('pay_run_employees').insert(rows);
      if (preErr) {
        return NextResponse.json({ error: 'Run created, but failed to attach employees' }, { status: 500 });
      }
    }

    return NextResponse.json({ id: runId, run_number, period_start, period_end, pay_date, attached: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

function getISOWeek(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}
