// app/api/employees/[id]/delete/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Params = { params: { id: string } };

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function srv() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(_req: Request, { params }: Params) {
  const supabase = srv();
  const employeeId = params.id;
  if (!employeeId || employeeId.includes('<')) return json(400, { error: 'Provide a real employee_id UUID in the URL.' });

  // 1) Load employee to get company scope and existence
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .maybeSingle();

  if (empErr)  return json(500, { error: 'Failed to load employee', detail: empErr.message });
  if (!emp)    return json(404, { error: 'Employee not found' });

  const companyId: string = emp.company_id;

  // 2) Refuse delete if referenced in ANY pay_run_employees row (ignore company filter)
  {
    const { count, error } = await supabase
      .from('pay_run_employees')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId);

    if (error) return json(500, { error: 'Failed to check payroll usage', detail: error.message });
    if ((count ?? 0) > 0) {
      return json(409, {
        error: 'Cannot delete employee',
        detail: 'Employee appears in payroll runs',
        code: 'IN_USE',
      });
    }
  }

  // 3) Delete children first (scoped by company), then the employee
  const children = [
    'employee_emergency_contacts',
    'employee_bank_accounts',
    'employee_starter_details',
  ] as const;

  for (const table of children) {
    const { error } = await supabase
      .from(table as any)
      .delete()
      .eq('employee_id', employeeId)
      .eq('company_id', companyId);

    if (error) return json(500, { error: `Failed to delete from ${table}`, detail: error.message });
  }

  // 4) Delete employee; if an FK slips through, translate it to a 409 instead of a 500
  {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)
      .eq('company_id', companyId);

    if (error) {
      const msg = (error as any)?.message || '';
      if (msg.includes('violates foreign key constraint')) {
        return json(409, { error: 'Cannot delete employee', detail: 'Employee appears in payroll runs', code: 'IN_USE' });
      }
      return json(500, { error: 'Failed to delete employee', detail: msg });
    }
  }

  return json(200, { ok: true });
}
