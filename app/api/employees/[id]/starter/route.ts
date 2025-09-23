export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Params = { params: { id: string } };
const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

type Body = {
  p45_provided?: boolean;
  starter_declaration?: 'A' | 'B' | 'C' | '' | null;
  student_loan_plan?: 'None' | 'Plan 1' | 'Plan 2' | 'Plan 4' | 'Plan 5' | null;
  postgraduate_loan?: boolean;
};

function taxFromDeclaration(dec: string | null | undefined): { tax_code: string; tax_basis: string } {
  const d = (dec || '').toUpperCase();
  if (d === 'A') return { tax_code: '1257L', tax_basis: 'cumulative' };
  if (d === 'B') return { tax_code: '1257L wk1/mth1', tax_basis: 'wk1mth1' };
  if (d === 'C') return { tax_code: 'BR', tax_basis: 'BR' };
  return { tax_code: '1257L', tax_basis: 'cumulative' };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const { data, error } = await client
      .from('employee_starter_details')
      .select('p45_provided, starter_declaration, student_loan_plan, postgraduate_loan')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) return json(500, { error: 'load_failed', detail: error.message });
    return json(200, { ok: true, data: data ?? null });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const b = (await req.json().catch(() => ({}))) as Body;

    const p45 = !!b.p45_provided;
    const starter = (b.starter_declaration || '').toUpperCase() as 'A' | 'B' | 'C' | '';
    const student = b.student_loan_plan ?? null;
    const pgl = !!b.postgraduate_loan;

    // write starter row (exists even if P45 provided)
    const payload = {
      employee_id: params.id,
      company_id: companyId,
      p45_provided: p45,
      starter_declaration: p45 ? null : starter || null,
      student_loan_plan: p45 ? null : student,
      postgraduate_loan: p45 ? false : pgl,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: selErr } = await client
      .from('employee_starter_details')
      .select('employee_id')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (selErr) return json(500, { error: 'select_failed', detail: selErr.message });

    if (existing) {
      const { error: updErr } = await client
        .from('employee_starter_details')
        .update(payload)
        .eq('employee_id', params.id)
        .eq('company_id', companyId);
      if (updErr) return json(400, { error: 'update_failed', detail: updErr.message });
    } else {
      const { error: insErr } = await client.from('employee_starter_details').insert(payload);
      if (insErr) return json(400, { error: 'insert_failed', detail: insErr.message });
    }

    // when no P45: set tax code on employees from A/B/C mapping
    if (!p45) {
      const { tax_code } = taxFromDeclaration(starter);
      const { error: empErr } = await client
        .from('employees')
        .update({ tax_code, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .eq('company_id', companyId);
      if (empErr) return json(400, { error: 'employee_update_failed', detail: empErr.message });
    }

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}
