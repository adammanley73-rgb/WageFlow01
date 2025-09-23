// app/api/payroll/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

type Frequency = 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
type Status = 'draft' | 'processing' | 'approved' | 'rti_submitted' | 'completed';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;

    // Load run
    const { data: run, error: runErr } = await supabase
      .from('pay_runs')
      .select(
        'id, run_number, period_start, period_end, pay_date, frequency, status'
      )
      .eq('id', runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Load pay_run_employees
    const { data: pre, error: preErr } = await supabase
      .from('pay_run_employees')
      .select(
        'id, employee_id, gross_pay, deductions, net_pay'
      )
      .eq('pay_run_id', runId);

    if (preErr) {
      return NextResponse.json({ error: 'Failed to load run employees' }, { status: 500 });
    }

    const employeeIds = (pre ?? []).map((r: any) => r.employee_id);
    let employees: Array<{ id: string; first_name: string; last_name: string; employee_number: string | null; email: string | null }> = [];
    if (employeeIds.length > 0) {
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number, email')
        .in('id', employeeIds);
      if (empErr) {
        return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 });
      }
      employees = (empData ?? []) as any[];
    }

    const map = new Map(employees.map(e => [e.id, e]));

    // CSV header
    const lines: string[] = [];
    lines.push([
      'Run Number',
      'Frequency',
      'Period Start',
      'Period End',
      'Pay Date',
      'Employee ID',
      'Employee Number',
      'Employee Name',
      'Email',
      'Gross',
      'Deductions',
      'Net'
    ].join(','));

    // Rows
    for (const r of pre ?? []) {
      const e = map.get(r.employee_id);
      const name = e ? `${e.first_name} ${e.last_name}` : 'Unknown';
      const safe = (n: any) => Number(n ?? 0).toFixed(2);
      const csvRow = [
        run.run_number,
        run.frequency,
        run.period_start,
        run.period_end,
        run.pay_date,
        r.employee_id,
        e?.employee_number ?? '',
        name,
        e?.email ?? '',
        safe(r.gross_pay),
        safe(r.deductions),
        safe(r.net_pay),
      ]
        .map((v) => {
          const s = String(v ?? '');
          // very light CSV escaping
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(',');
      lines.push(csvRow);
    }

    const csv = lines.join('\r\n');
    const filename = `wageflow_run_${run.run_number}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('EXPORT CSV error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
