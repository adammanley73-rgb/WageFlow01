export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseServer';

const json = (s: number, b: unknown) => NextResponse.json(b, { status: s });

export async function GET() {
  try {
    // Ensure env is loaded
    const { client, companyId } = getAdmin();
    if (!companyId) {
      return json(500, { error: 'missing_company_id_env' });
    }

    // Fetch employees for this company
    const { data, error } = await client
      .from('employees')
      .select(
        'id, first_name, last_name, email, ni_number, pay_type, frequency, created_at'
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) {
      // Surface the database error so you can actually fix things
      return json(500, { error: 'query_failed', detail: error.message });
    }

    return json(200, { ok: true, data: data ?? [] });
  } catch (e: any) {
    return json(500, { error: 'server_error', detail: e?.message || String(e) });
  }
}
