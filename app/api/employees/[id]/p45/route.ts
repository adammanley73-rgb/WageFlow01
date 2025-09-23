import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Params = { params: { id: string } };
const json = (s: number, b: any) => NextResponse.json(b, { status: s });

// Normalize a tax code + basis into the stored code for employees.tax_code
function fmtTaxCode(codeRaw: string, basis: string): string {
  const code = (codeRaw || '').trim().toUpperCase();
  const b = (basis || '').trim().toLowerCase();

  // If basis is one of the non-cumulative codes, that is the code
  if (['br', 'd0', 'd1', 'nt'].includes(b)) return b.toUpperCase();
  if (['BR', 'D0', 'D1', 'NT'].includes(code)) return code;

  if (b === 'wk1mth1' || b === 'w1m1' || b === 'noncumulative') return `${code} wk1/mth1`;
  return code || '1257L';
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();

    const { data, error } = await client
      .from('employee_p45_details')
      .select('*')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) return json(400, { error: 'load_failed', detail: error.message });
    return json(200, { ok: true, data: data ?? null });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      employer_paye_ref?: string | null;
      employer_name?: string | null;
      works_number?: string | null;
      tax_code?: string | null;
      tax_basis?: 'cumulative' | 'wk1mth1' | 'BR' | 'D0' | 'D1' | 'NT' | string | null;
      prev_pay_to_date?: number | string | null;
      prev_tax_to_date?: number | string | null;
      leaving_date?: string | null;
      student_loan_deductions?: boolean;
    };

    const tax_basis = (body.tax_basis || 'cumulative') as string;
    const tax_code = fmtTaxCode(body.tax_code || '1257L', tax_basis);

    const row = {
      employee_id: params.id,
      company_id: companyId,
      employer_paye_ref: body.employer_paye_ref ?? null,
      employer_name: body.employer_name ?? null,
      works_number: body.works_number ?? null,
      tax_code,
      tax_basis,
      prev_pay_to_date: Number(body.prev_pay_to_date ?? 0) || 0,
      prev_tax_to_date: Number(body.prev_tax_to_date ?? 0) || 0,
      leaving_date: body.leaving_date ?? null,
      student_loan_deductions: !!body.student_loan_deductions,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await client
      .from('employee_p45_details')
      .upsert(row, { onConflict: 'employee_id' });

    if (upsertErr) return json(400, { error: 'upsert_failed', detail: upsertErr.message });

    const { error: empErr } = await client
      .from('employees')
      .update({ tax_code, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('company_id', companyId);

    if (empErr) return json(400, { error: 'employee_update_failed', detail: empErr.message });

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}
