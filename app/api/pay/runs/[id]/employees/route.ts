export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

type Params = { params: { id: string } };
const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

type Item = { type: string; amount: number; qty?: number | null; meta?: Record<string, unknown> };
type Body = { employee_id: string; items?: Item[] };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const { data, error } = await client
      .from('pay_run_employees')
      .select('id, employee_id, status')
      .eq('pay_run_id', params.id)
      .eq('company_id', companyId);

    if (error) return json(500, { error: 'list_failed', detail: error.message });
    return json(200, { ok: true, data: data ?? [] });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { client, companyId } = getAdmin();
    const b = (await req.json().catch(() => ({}))) as Body;

    if (!b.employee_id) return json(400, { error: 'invalid_body', detail: 'employee_id required' });

    // Upsert run-employee link
    const { data: pre, error: insErr } = await client
      .from('pay_run_employees')
      .insert({
        pay_run_id: params.id,
        employee_id: b.employee_id,
        company_id: companyId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insErr && !/duplicate key/.test(insErr.message)) {
      return json(400, { error: 'attach_failed', detail: insErr.message });
    }

    // Select the existing row id if duplicate
    const preId = pre?.id
      ? pre.id
      : (
          await client
            .from('pay_run_employees')
            .select('id')
            .eq('pay_run_id', params.id)
            .eq('employee_id', b.employee_id)
            .eq('company_id', companyId)
            .single()
        ).data?.id;

    if (!preId) return json(500, { error: 'attach_missing', detail: 'run employee row not found' });

    // Optional items
    if (b.items && b.items.length) {
      const items = b.items.map((it) => ({
        run_employee_id: preId,
        company_id: companyId,
        type: it.type,
        amount: it.amount,
        qty: it.qty ?? null,
        meta: it.meta ?? null,
      }));
      const { error: itemErr } = await client.from('pay_items').insert(items);
      if (itemErr) return json(400, { error: 'items_failed', detail: itemErr.message });
    }

    return json(200, { ok: true, run_employee_id: preId });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}
