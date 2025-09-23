// app/api/payroll/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // path from /app/api/payroll/[id]/

type Frequency = 'weekly' | 'fortnightly' | 'four_weekly' | 'monthly';
type Status = 'draft' | 'processing' | 'approved' | 'rti_submitted' | 'completed';

type RunRow = {
  id: string;
  run_number: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  frequency: Frequency;
  status: Status;
  created_at: string;
  updated_at: string;
};

type PREntry = {
  id: string;
  pay_run_id: string;
  employee_id: string;
  gross_pay: number | null;
  deductions: number | null;
  net_pay: number | null;
  created_at: string;
  updated_at: string;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_number?: string | null;
  email?: string | null;
};

// ---------- GET: run + employees + totals ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;

    const { data: run, error: runErr } = await supabase
      .from('pay_runs')
      .select(
        'id, run_number, period_start, period_end, pay_date, frequency, status, created_at, updated_at'
      )
      .eq('id', runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const { data: pre, error: preErr } = await supabase
      .from('pay_run_employees')
      .select(
        'id, pay_run_id, employee_id, gross_pay, deductions, net_pay, created_at, updated_at'
      )
      .eq('pay_run_id', runId);

    if (preErr) {
      return NextResponse.json(
        { error: 'Failed to load run employees' },
        { status: 500 }
      );
    }

    const employeeIds = (pre ?? []).map((r: any) => r.employee_id);
    let employees: Employee[] = [];
    if (employeeIds.length > 0) {
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number, email')
        .in('id', employeeIds);

      if (empErr) {
        return NextResponse.json(
          { error: 'Failed to load employees' },
          { status: 500 }
        );
      }
      employees = (empData ?? []) as Employee[];
    }

    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    const rows = (pre as PREntry[] | null ?? []).map((r) => {
      const e = employeeMap.get(r.employee_id);
      const name = e ? `${e.first_name} ${e.last_name}` : 'Unknown';
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeName: name,
        employeeNumber: e?.employee_number ?? '',
        email: e?.email ?? '',
        gross: Number(r.gross_pay ?? 0),
        deductions: Number(r.deductions ?? 0),
        net: Number(r.net_pay ?? 0),
      };
    });

    // Totals: prefer view, else compute
    let totals = {
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      employee_count: rows.length,
    };

    const { data: tv } = await supabase
      .from('v_pay_run_totals')
      .select(
        'pay_run_id, total_gross_pay, total_deductions, total_net_pay, employee_count'
      )
      .eq('pay_run_id', runId)
      .limit(1);

    if (tv && tv.length > 0) {
      const t = tv[0] as any;
      totals = {
        total_gross: Number(t.total_gross_pay ?? 0),
        total_deductions: Number(t.total_deductions ?? 0),
        total_net: Number(t.total_net_pay ?? 0),
        employee_count: Number(t.employee_count ?? rows.length),
      };
    } else {
      totals = rows.reduce(
        (acc, r) => {
          acc.total_gross += r.gross;
          acc.total_deductions += r.deductions;
          acc.total_net += r.net;
          return acc;
        },
        { total_gross: 0, total_deductions: 0, total_net: 0, employee_count: rows.length }
      );
    }

    return NextResponse.json(
      {
        run: {
          id: run.id,
          runNumber: run.run_number,
          periodStart: run.period_start,
          periodEnd: run.period_end,
          payDate: run.pay_date,
          frequency: run.frequency as Frequency,
          status: run.status as Status,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
        },
        employees: rows,
        totals,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Run GET error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ---------- PATCH: edit amounts OR approve ----------
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;
    const body = await req.json().catch(() => ({}));

    // Branch A: Approve action
    if (body && body.action === 'approve') {
      // Load run
      const { data: run, error: runErr } = await supabase
        .from('pay_runs')
        .select('id, status, run_number, period_start, period_end, pay_date, frequency')
        .eq('id', runId)
        .single();

      if (runErr || !run) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }

      if (!(run.status === 'draft' || run.status === 'processing')) {
        return NextResponse.json(
          { error: `Cannot approve from status ${run.status}` },
          { status: 400 }
        );
      }

      // Ensure employees exist
      const { data: pre, error: preErr } = await supabase
        .from('pay_run_employees')
        .select('id, gross_pay, deductions, net_pay')
        .eq('pay_run_id', runId);

      if (preErr) {
        return NextResponse.json(
          { error: 'Failed to load run employees' },
          { status: 500 }
        );
      }

      if (!pre || pre.length === 0) {
        return NextResponse.json(
          { error: 'Run has no employees to approve' },
          { status: 400 }
        );
      }

      // Basic sanity: no negative amounts
      for (const r of pre) {
        if ((r.gross_pay ?? 0) < 0 || (r.deductions ?? 0) < 0 || (r.net_pay ?? 0) < 0) {
          return NextResponse.json(
            { error: 'Amounts cannot be negative' },
            { status: 400 }
          );
        }
      }

      // Update status to approved
      const { error: upErr } = await supabase
        .from('pay_runs')
        .update({ status: 'approved' })
        .eq('id', runId);

      if (upErr) {
        return NextResponse.json(
          { error: 'Failed to approve run' },
          { status: 500 }
        );
      }

      // Queue FPS stub in rti_logs
      const stub = {
        schema: 'FPS',
        version: 'stub-0.1',
        run_number: run.run_number,
        pay_run_id: runId,
        frequency: run.frequency,
        period_start: run.period_start,
        period_end: run.period_end,
        pay_date: run.pay_date,
        employees: pre.length,
        totals_hint: 'Use v_pay_run_totals for accurate figures',
        created_at: new Date().toISOString(),
      };

      const { error: logErr } = await supabase
        .from('rti_logs')
        .insert([
          {
            pay_run_id: runId,
            type: 'FPS',
            status: 'queued',
            payload: JSON.stringify(stub),
          },
        ]);

      if (logErr) {
        // We keep the run approved even if logging fails, but we report it
        console.warn('RTI log insert failed', logErr);
      }

      // Return fresh snapshot
      return await GET(req, { params });
    }

    // Branch B: Edits to line items
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Validate and normalise
    const updates: Array<{ id: string; gross_pay: number; deductions: number; net_pay: number }> = [];
    for (const it of items) {
      const id = String(it.id || '').trim();
      if (!id) {
        return NextResponse.json(
          { error: 'Each item must include id' },
          { status: 400 }
        );
      }
      const gross = Number(isFinite(it.gross) ? it.gross : 0);
      const deductions = Number(isFinite(it.deductions) ? it.deductions : 0);
      const net =
        isFinite(it.net) && it.net !== null && it.net !== undefined
          ? Number(it.net)
          : Number((gross - deductions).toFixed(2));

      if (gross < 0 || deductions < 0 || net < 0) {
        return NextResponse.json(
          { error: 'Amounts cannot be negative' },
          { status: 400 }
        );
      }

      updates.push({
        id,
        gross_pay: Number(gross.toFixed(2)),
        deductions: Number(deductions.toFixed(2)),
        net_pay: Number(net.toFixed(2)),
      });
    }

    // Verify ids belong to this run
    const { data: current, error: preErr } = await supabase
      .from('pay_run_employees')
      .select('id, pay_run_id')
      .in('id', updates.map((u) => u.id));

    if (preErr) {
      return NextResponse.json(
        { error: 'Failed to validate items' },
        { status: 500 }
      );
    }
    const validIds = new Set((current ?? []).filter((r: any) => r.pay_run_id === runId).map((r: any) => r.id));
    const anyInvalid = updates.some((u) => !validIds.has(u.id));
    if (anyInvalid) {
      return NextResponse.json(
        { error: 'One or more items do not belong to this run' },
        { status: 400 }
      );
    }

    // Update each row
    for (const u of updates) {
      const { error } = await supabase
        .from('pay_run_employees')
        .update({
          gross_pay: u.gross_pay,
          deductions: u.deductions,
          net_pay: u.net_pay,
        })
        .eq('id', u.id);
      if (error) {
        return NextResponse.json(
          { error: `Failed to update item ${u.id}` },
          { status: 500 }
        );
      }
    }

    return await GET(req, { params });
  } catch (err) {
    console.error('Run PATCH error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
