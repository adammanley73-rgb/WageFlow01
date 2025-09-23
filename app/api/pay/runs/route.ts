export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

type Body = {
  frequency: 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly';
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  pay_date: string;     // YYYY-MM-DD
};

export async function GET() {
  try {
    const { client, companyId } = getAdmin();
    const { data, error } = await client
      .from('pay_runs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return json(500, { error: 'list_failed', detail: error.message });
    return json(200, { ok: true, data: data ?? [] });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}

export async function POST(req: Request) {
  try {
    const { client, companyId } = getAdmin();
    const b = (await req.json().catch(() => ({}))) as Body;

    if (!b.frequency || !b.period_start || !b.period_end || !b.pay_date) {
      return json(400, { error: 'invalid_body', detail: 'frequency, period_start, period_end, pay_date required' });
    }

    const row = {
      company_id: companyId,
      frequency: b.frequency,
      period_start: b.period_start,
      period_end: b.period_end,
      pay_date: b.pay_date,
      status: 'draft' as const,
    };

    const { data, error } = await client.from('pay_runs').insert(row).select('id').single();
    if (error) return json(400, { error: 'create_failed', detail: error.message });

    return json(200, { ok: true, id: data?.id });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: String(e?.message || e) });
  }
}
