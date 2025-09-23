export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Params = { params: { id: string } };
const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

function normalizeSortCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length !== 6) throw new Error('invalid_sort_code');
  return digits;
}

function normalizeAccountNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('invalid_account_number'); // UK standard
  return digits;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const { data, error } = await client
      .from('employee_bank_accounts')
      .select('account_name, sort_code, account_number')
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

    const body = (await req.json().catch(() => ({}))) as {
      account_name?: string | null;
      sort_code?: string | null;
      account_number?: string | null;
    };

    const row = {
      employee_id: params.id,
      company_id: companyId,
      account_name: body.account_name?.trim() || null,
      sort_code: normalizeSortCode(body.sort_code),
      account_number: normalizeAccountNumber(body.account_number),
    };

    // Upsert without relying on a unique constraint
    const { data: existing, error: selErr } = await client
      .from('employee_bank_accounts')
      .select('employee_id')
      .eq('employee_id', params.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (selErr) return json(500, { error: 'select_failed', detail: selErr.message });

    if (existing) {
      const { error: updErr } = await client
        .from('employee_bank_accounts')
        .update({
          account_name: row.account_name,
          sort_code: row.sort_code,
          account_number: row.account_number,
        })
        .eq('employee_id', params.id)
        .eq('company_id', companyId);

      if (updErr) return json(400, { error: 'update_failed', detail: updErr.message });
    } else {
      const { error: insErr } = await client.from('employee_bank_accounts').insert(row);
      if (insErr) return json(400, { error: 'insert_failed', detail: insErr.message });
    }

    return json(200, { ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === 'invalid_sort_code')
      return json(400, { error: 'invalid_sort_code', hint: 'Use 6 digits.' });
    if (msg === 'invalid_account_number')
      return json(400, { error: 'invalid_account_number', hint: 'Use 8 digits.' });
    return json(500, { error: 'server_error', detail: msg });
  }
}
